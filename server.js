const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ===== CẤU HÌNH SEPAY =====
const SEPAY_API_KEY = "K2AJXHECOHBZJQDMNLSX0J36A7IS8BKWTCGRV11AIBQRO4DSG4YJFZ7PIK3Y5BFX";
const SEPAY_ACCOUNT = "80002345939";

// Gọi API SePay để lấy danh sách giao dịch gần nhất
function fetchSepayTransactions() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'my.sepay.vn',
            path: `/userapi/transactions/list?limit=10&account_number=${SEPAY_ACCOUNT}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SEPAY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

const PORT = process.env.PORT || 3000;

// Helper: Lấy ngày giờ hiện tại theo múi giờ Việt Nam (GMT+7)
function getNowVN() {
    const now = new Date();
    const offset = 7 * 60; // GMT+7 in minutes
    const localMs = now.getTime() + (offset * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000);
    const d = new Date(localMs);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
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
                        // Dùng ngày từ client, hoặc fallback về giờ máy chủ (GMT+7)
                        const orderDate = (o.date || o.order_date) ? (o.date || o.order_date) : getNowVN();
                        // Gộp INSERT và SELECT vào cùng 1 chuỗi để lấy được ID chính xác trong 1 session
                        const insertAndGetIdSql = `
                            INSERT INTO orders (customer_id, product_id, amount, status, order_date) 
                            VALUES (${customerId}, ${productId}, ${o.total_price || o.amount}, ${escapeSQL(o.payment_status || o.status)}, ${escapeSQL(orderDate)});
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
            // Luôn trả về 200 trước để SePay không retry
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));

            try {
                console.log(`\n===== [SePay Webhook] ${getNowVN()} =====`);
                console.log('[SePay Raw Body]:', body);

                const data = JSON.parse(body);
                console.log('[SePay Parsed]:', JSON.stringify(data, null, 2));

                // SePay có thể gửi nội dung trong field 'content' hoặc 'description'
                const content = (data.content || data.description || data.transaction_content || "").toUpperCase();
                const transferAmount = data.transferAmount || data.amount || 0;

                console.log(`[SePay] Nội dung CK: "${content}" | Số tiền: ${transferAmount}`);

                // Tìm mã đơn hàng dạng DH + số (ví dụ: DH42, DH123)
                const match = content.match(/DH(\d+)/);
                if (match) {
                    const orderId = parseInt(match[1]);
                    console.log(`[SePay] ✅ Tìm thấy đơn hàng #${orderId} - Đang cập nhật...`);
                    await runSQL(`UPDATE orders SET status='sepay' WHERE id=${orderId}`);
                    console.log(`[SePay] ✅ Đã cập nhật đơn hàng #${orderId} thành 'sepay'.`);
                } else {
                    console.log(`[SePay] ⚠️  Không tìm thấy mã DH trong nội dung: "${content}"`);
                }
            } catch (e) {
                console.error('[SePay Webhook Error]:', e.message);
                console.error('[SePay Raw Body was]:', body);
            }
        });
        return;
    }

    // --- API: CHECK PAYMENT (CHỦ ĐỘNG HỎI SEPAY API) ---
    if (req.url.startsWith('/api/check-payment') && req.method === 'GET') {
        const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
        const orderId = urlParams.get('id');
        const description = (urlParams.get('desc') || '').toUpperCase();

        try {
            // 1. Kiểm tra trong DB trước (nếu webhook đã cập nhật sẵn rồi)
            const dbData = await queryDB(`SELECT status FROM orders WHERE id=${orderId}`);
            if (dbData[0]?.status === 'sepay') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, status: 'sepay', source: 'db' }));
                return;
            }

            // 2. Chủ động hỏi SePay API để tìm giao dịch khớp
            const sepayData = await fetchSepayTransactions();
            console.log(`[CheckPayment] Hỏi SePay API cho đơn #${orderId}, tìm nội dung: "${description}"`);

            const transactions = sepayData?.transactions || sepayData?.data || [];
            const matched = transactions.find(t => {
                const content = (t.transaction_content || t.content || t.description || '').toUpperCase();
                return content.includes(`DH${orderId}`) || (description && content.includes(description));
            });

            if (matched) {
                console.log(`[CheckPayment] ✅ Tìm thấy giao dịch khớp! Cập nhật đơn #${orderId}...`);
                await runSQL(`UPDATE orders SET status='sepay' WHERE id=${orderId}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, status: 'sepay', source: 'api' }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, status: dbData[0]?.status || 'pending', source: 'api' }));
            }
        } catch (e) {
            console.error('[CheckPayment Error]:', e.message);
            // Fallback về check DB nếu SePay API lỗi
            try {
                const dbData = await queryDB(`SELECT status FROM orders WHERE id=${orderId}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, status: dbData[0]?.status || 'pending', source: 'db_fallback' }));
            } catch (e2) {
                res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
            }
        }
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
