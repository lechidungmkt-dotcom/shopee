const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'brain.db');

// Helper to escape single quotes for SQLite
function escapeSQL(val) {
    if (val === null || val === undefined) return "NULL";
    if (typeof val === 'string') {
        return `'${val.replace(/'/g, "''")}'`;
    }
    return val;
}

// Helper to execute SQL and return JSON (for SELECT)
function queryDB(sql) {
    return new Promise((resolve, reject) => {
        const escapedSQL = sql.replace(/"/g, '""');
        exec(`sqlite3 -json "${DB_PATH}" "${escapedSQL}"`, (err, stdout, stderr) => {
            if (err) {
                console.error("SQL Error (Query):", stderr || err.message);
                return reject(stderr || err.message);
            }
            try {
                const data = stdout.trim() ? JSON.parse(stdout) : [];
                resolve(data);
            } catch (e) {
                resolve([]);
            }
        });
    });
}

// Helper to run SQL commands (INSERT/UPDATE/DELETE)
function runSQL(sql) {
    return new Promise((resolve, reject) => {
        const escapedSQL = sql.replace(/"/g, '""');
        exec(`sqlite3 "${DB_PATH}" "${escapedSQL}"`, (err, stdout, stderr) => {
            if (err) {
                console.error("SQL Error (Execute):", stderr || err.message);
                return reject(stderr || err.message);
            }
            resolve(stdout);
        });
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200); res.end(); return;
    }

    // --- API: WAITLIST (FROM WEBSITE FORM) ---
    if (req.url === '/api/waitlist' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                // Gộp thông tin khảo sát vào Ghi chú
                const surveyNotes = `Khảo sát: Lái xe ${data.drivingTime}, Nóng lưng: ${data.sweatingCondition}, Xe: ${data.carModel}`;
                
                // Kiểm tra xem khách đã tồn tại chưa (theo SĐT)
                const existing = await queryDB(`SELECT id FROM customers WHERE phone = ${escapeSQL(data.phone)}`);
                
                if (existing.length > 0) {
                    await runSQL(`UPDATE customers SET notes = ${escapeSQL(surveyNotes)} WHERE id = ${existing[0].id}`);
                } else {
                    await runSQL(`INSERT INTO customers (name, phone, registration_date, notes) VALUES (${escapeSQL(data.name)}, ${escapeSQL(data.phone)}, ${escapeSQL(data.date)}, ${escapeSQL(surveyNotes)})`);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                console.error("Waitlist API Error:", e);
                res.writeHead(500); res.end(String(e));
            }
        });
        return;
    }

    // --- API: PRODUCTS ---
    if (req.url === '/api/products') {
        if (req.method === 'GET') {
            try {
                const data = await queryDB("SELECT * FROM products");
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (e) { res.writeHead(500); res.end(String(e)); }
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', async () => {
                const p = JSON.parse(body);
                try {
                    if (p.id) {
                        await runSQL(`UPDATE products SET name=${escapeSQL(p.name)}, price=${p.price}, description=${escapeSQL(p.description)}, stock=${p.stock} WHERE id=${p.id}`);
                    } else {
                        await runSQL(`INSERT INTO products (name, price, description, stock) VALUES (${escapeSQL(p.name)}, ${p.price}, ${escapeSQL(p.description)}, ${p.stock})`);
                    }
                    res.writeHead(200); res.end(JSON.stringify({ success: true }));
                } catch (e) { res.writeHead(500); res.end(String(e)); }
            });
        }
        return;
    }

    if (req.url.startsWith('/api/products?id=') && req.method === 'DELETE') {
        const id = req.url.split('=')[1];
        try {
            await runSQL(`DELETE FROM products WHERE id=${id}`);
            res.writeHead(200); res.end(JSON.stringify({ success: true }));
        } catch (e) { res.writeHead(500); res.end(String(e)); }
        return;
    }

    // --- API: CUSTOMERS ---
    if (req.url === '/api/customers') {
        if (req.method === 'GET') {
            try {
                const data = await queryDB("SELECT * FROM customers");
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (e) { res.writeHead(500); res.end(String(e)); }
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', async () => {
                const c = JSON.parse(body);
                try {
                    if (c.id) {
                        await runSQL(`UPDATE customers SET name=${escapeSQL(c.name)}, phone=${escapeSQL(c.phone)}, zalo=${escapeSQL(c.zalo)}, registration_date=${escapeSQL(c.registration_date)}, notes=${escapeSQL(c.notes)} WHERE id=${c.id}`);
                    } else {
                        await runSQL(`INSERT INTO customers (name, phone, zalo, registration_date, notes) VALUES (${escapeSQL(c.name)}, ${escapeSQL(c.phone)}, ${escapeSQL(c.zalo)}, ${escapeSQL(c.registration_date)}, ${escapeSQL(c.notes)})`);
                    }
                    res.writeHead(200); res.end(JSON.stringify({ success: true }));
                } catch (e) { res.writeHead(500); res.end(String(e)); }
            });
        }
        return;
    }

    if (req.url.startsWith('/api/customers?id=') && req.method === 'DELETE') {
        const id = req.url.split('=')[1];
        try {
            await runSQL(`DELETE FROM customers WHERE id=${id}`);
            res.writeHead(200); res.end(JSON.stringify({ success: true }));
        } catch (e) { res.writeHead(500); res.end(String(e)); }
        return;
    }

    // --- API: ORDER STATUS CHECK ---
    if (req.url.startsWith('/api/order-status?id=') && req.method === 'GET') {
        const id = req.url.split('=')[1];
        try {
            const data = await queryDB(`SELECT status FROM orders WHERE id=${id}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, status: data[0]?.status }));
        } catch (e) { res.writeHead(500); res.end(String(e)); }
        return;
    }

    // --- API: ORDERS ---
    if (req.url === '/api/orders') {
        if (req.method === 'GET') {
            try {
                const data = await queryDB("SELECT o.*, c.name as customer_name, p.name as product_name FROM orders o JOIN customers c ON o.customer_id = c.id JOIN products p ON o.product_id = p.id");
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (e) { res.writeHead(500); res.end(String(e)); }
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', async () => {
                const o = JSON.parse(body);
                try {
                    if (o.id) {
                        await runSQL(`UPDATE orders SET status=${escapeSQL(o.status)} WHERE id=${o.id}`);
                    } else {
                        // Nếu thiếu customer_id, thử tìm theo Phone (đơn hàng từ Website)
                        let customerId = o.customer_id;
                        if (!customerId && o.phone) {
                            const c = await queryDB(`SELECT id FROM customers WHERE phone = ${escapeSQL(o.phone)}`);
                            if (c.length > 0) customerId = c[0].id;
                            else {
                                // Tạo khách mới nếu chưa có
                                await runSQL(`INSERT INTO customers (name, phone, registration_date) VALUES (${escapeSQL(o.name)}, ${escapeSQL(o.phone)}, ${escapeSQL(o.date)})`);
                                const newC = await queryDB(`SELECT id FROM customers WHERE phone = ${escapeSQL(o.phone)}`);
                                customerId = newC[0].id;
                            }
                        }

                        // Tìm sản phẩm mặc định nếu cần (hoặc từ Website gửi về)
                        let productId = o.product_id || 1; 

                        const qty = o.quantity || 1;
                        // Gộp INSERT và SELECT vào cùng 1 chuỗi để lấy được ID chính xác trong 1 session
                        const insertAndGetIdSql = `
                            INSERT INTO orders (customer_id, product_id, amount, status, order_date) 
                            VALUES (${customerId}, ${productId}, ${o.total_price || o.amount}, ${escapeSQL(o.payment_status || o.status)}, ${escapeSQL(o.date || o.order_date)});
                            SELECT last_insert_rowid() as id;
                        `;
                        const dbResult = await queryDB(insertAndGetIdSql);
                        await runSQL(`UPDATE products SET stock = stock - ${qty} WHERE id = ${productId}`);
                        
                        const orderId = dbResult[0]?.id;
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, id: orderId }));
                        return;
                    }
                    res.writeHead(200); res.end(JSON.stringify({ success: true }));
                } catch (e) { 
                    console.error("Order API Error:", e);
                    res.writeHead(500); res.end(JSON.stringify({ error: String(e) })); 
                }
            });
        }
        return;
    }

    if (req.url.startsWith('/api/orders?id=') && req.method === 'DELETE') {
        const id = req.url.split('=')[1];
        try {
            await runSQL(`DELETE FROM orders WHERE id=${id}`);
            res.writeHead(200); res.end(JSON.stringify({ success: true }));
        } catch (e) { res.writeHead(500); res.end(String(e)); }
        return;
    }

    // --- API: SEPAY WEBHOOK ---
    if (req.url === '/api/sepay-webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const content = data.content || "";
                
                // Tìm mã đơn hàng dạng DHxxx trong nội dung chuyển khoản
                const match = content.match(/DH(\d+)/i);
                if (match) {
                    const orderId = match[1];
                    // Cập nhật trạng thái đơn hàng thành 'sepay'
                    await runSQL(`UPDATE orders SET status='sepay' WHERE id=${orderId}`);
                    console.log(`[SePay Webhook] Đã cập nhật đơn hàng #${orderId} thành sepay.`);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                console.error("Webhook Error:", e);
                res.writeHead(500); res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    // --- STATIC FILES ---
    let url = req.url === '/' ? '/index.html' : req.url;
    if (url === '/admin') url = '/admin.html';
    
    let filePath = path.join(__dirname, url);
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpeg'; break;
        case '.mp4': contentType = 'video/mp4'; break;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404); res.end('Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` Admin Panel: http://localhost:${PORT}/admin`);
    console.log(` Landing Page: http://localhost:${PORT}/`);
    console.log(`=========================================`);
});
