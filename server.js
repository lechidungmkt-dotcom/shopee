const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Resend } = require('resend');

let resend;
try {
    const resendKey = process.env.RESEND_API_KEY || fs.readFileSync(path.join(__dirname, 'resend_config.txt'), 'utf8').trim();
    if (resendKey) {
        resend = new Resend(resendKey);
        console.log("✅ Resend API kết nối thành công!");
    } else {
        throw new Error("Empty key");
    }
} catch (e) {
    console.warn("⚠️ Không có biến môi trường RESEND_API_KEY hoặc file resend_config.txt, bỏ qua khởi tạo Resend.");
}

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

function executePythonSQL(sql, isQuery) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'sqlite_runner.py');
        const pyCode = `
import sqlite3, json, sys, io
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
try:
    db_path = sys.argv[1]
    is_query = sys.argv[2] == 'true'
    sql = sys.stdin.read()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    if not is_query:
        cursor.executescript(sql)
        sys.stdout.write(json.dumps({"success": True}))
    else:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description] if cursor.description else []
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        sys.stdout.write(json.dumps(data))
        conn.commit()
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`;
        fs.writeFileSync(scriptPath, pyCode);

        const cp = require('child_process');
        const child = cp.spawn('python', [scriptPath, DB_PATH, isQuery ? 'true' : 'false']);
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        
        child.stdin.write(sql);
        child.stdin.end();
        
        child.on('close', code => {
            if (code !== 0) return reject(new Error(stderr || "Python Error " + code));
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                resolve([]);
            }
        });
    });
}

function queryDB(sql) { return executePythonSQL(sql, true); }
function runSQL(sql) { return executePythonSQL(sql, false); }

// ===== HỆ THỐNG GỬI EMAIL TỰ ĐỘNG =====
async function sendResendEmail(toEmail, subject, htmlContent) {
    if (!resend) return console.warn("Bỏ qua gửi email do chưa có Resend API Key.");
    try {
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev', // Resend free tier chỉ cho gửi từ onboarding
            to: toEmail,
            subject: subject,
            html: htmlContent
        });
        console.log(`Đã gửi email "${subject}" tới ${toEmail} thành công.`, data);
    } catch (e) {
        console.error(`Lỗi gửi email "${subject}" tới ${toEmail}:`, e);
    }
}

function startEmailSequence(customerName, customerEmail) {
    if (!customerEmail) return;

    let isTest = customerEmail.includes('+test');
    
    // Test: 10 giây. Thật: 2 ngày và 1 ngày
    let delay2Days = isTest ? 10 * 1000 : 2 * 24 * 60 * 60 * 1000;
    let delay1Day =  isTest ? 10 * 1000 : 1 * 24 * 60 * 60 * 1000;

    const email1 = {
        subject: "Cảm ơn anh em đã quan tâm. Hẹn gặp lại sớm!",
        html: `Chào anh em,<br><br>Tôi nhận được thông tin đăng ký khảo sát của anh em rồi. Cảm ơn anh em đã dành thời gian.<br><br>Tôi biết việc lái xe giữa mùa hè, nhất là khi phải ngồi lì trên ghế da hàng tiếng đồng hồ, nó bí bách và bức bối đến mức nào. Quần áo thì ướt nhẹp mồ hôi, bước xuống xe mà cảm giác cực kỳ mất phong độ. Chẳng ai muốn bỏ tiền tỷ mua ô tô để rồi phải chịu đựng cái cảnh đó cả.<br><br>Đó là lý do tôi mang về đệm Rulax. Tôi không nói dài dòng, cứ chờ tin tôi. Vài hôm nữa tôi sẽ chia sẻ cho anh em một bí quyết nhỏ để giải quyết triệt để cái nực nội này mỗi khi lên xe.<br><br>Hẹn gặp anh em ở email sau.<br><br>Tôi,<br>Đại diện Rulax Việt Nam.`
    };

    const email2 = {
        subject: "Tại sao bật điều hòa max số mà lưng vẫn ướt sũng?",
        html: `Chào anh em,<br><br>Tôi chắc chắn anh em từng gặp tình huống này: Bước lên xe buổi trưa nắng, bật điều hòa lên mức lạnh nhất, gió quạt ù ù thẳng vào mặt. Trán thì lạnh toát, nhưng lưng và hông thì vẫn ươn ướt, dính dớp mồ hôi.<br><br>Nguyên nhân cực kỳ đơn giản: Phom ghế ô tô luôn thiết kế ôm sát cơ thể. Toàn bộ phần lưng và mông của anh em áp chặt vào mặt da. Luồng khí lạnh từ điều hòa trên taplo không bao giờ có thể chui vào được khoảng không gian kín bưng đó. Không có gió đi qua -> cơ thể không tản nhiệt được -> mồ hôi tự động đổ ra.<br><br>Nhiều anh em mua mấy cái đệm hạt gỗ, đệm trúc... Nó chỉ tạo ra một tí xíu khe hở thụ động thôi, ngồi lâu vẫn bí như thường vì không có luồng khí chủ động đẩy hơi nóng ra ngoài.<br><br>Giải pháp thực tế nhất là phải tạo ra khe hở đủ lớn (bằng cấu trúc lưới 3D) và dùng quạt hút/đẩy luồng gió đi liên tục qua khe hở đó. Chỉ có cách đấy mới làm bề mặt da anh em khô ráo được.<br><br>Anh em đọc kỹ lưu ý này để sau này có chọn đồ chống nóng cho xe thì cũng không bị lãng phí tiền vô ích vào mấy món không hiệu quả.<br><br>Hẹn anh em ở email tới.<br><br>Tôi,<br>Đại diện Rulax Việt Nam.`
    };

    const email3 = {
        subject: "Xử lý dứt điểm mồ hôi lưng với Rulax - Ưu đãi chỉ dành cho anh em",
        html: `Chào anh em,<br><br>Hôm nay tôi vào thẳng vấn đề luôn. Nếu anh em đã quá ngán ngẩm cái cảnh mồ hôi dính bết lưng áo mỗi lần xuống xe, Đệm Thông Gió Làm Mát Ghế Ô Tô Rulax Cao Cấp chính là thứ anh em cần.<br><br>Cơ chế rất rõ ràng:<br>1. Đệm dùng lưới tổ ong 3D siêu đàn hồi tạo khe hở không xẹp, kết hợp cùng hệ thống quạt công suất cao thổi luồng khí tản đều khắp lưng và mông. <br>2. Làm mát siêu tốc trong 3 giây. Chấm dứt 100% tình trạng đổ mồ hôi lưng.<br>3. Tích hợp chế độ massage rung kép giúp anh em thư giãn, tránh đau mỏi cột sống khi đi đường dài.<br>4. Nguồn điện tẩu sạc 12V phổ thông, cắm là chạy, không can thiệp độ chế bất cứ chi tiết nguyên bản nào của xe.<br><br>Tôi đang có chương trình Flash Sale Nửa Giá cực tốt. Vì anh em đã đăng ký tham gia khảo sát trước, tôi ưu tiên một suất giữ giá tốt nhất đợt này.<br><br>Anh em bấm vào link bên dưới để xem chi tiết ảnh thực tế và đặt hàng ngay đợt Flash Sale nhé:<br>👉 <a href="http://localhost:3000">XEM CHI TIẾT VÀ ĐẶT MUA RULAX NGAY</a><br><br>Nhận hàng, cắm thử bật quạt thấy mát tận lưng mới phải thanh toán. Anh em hoàn toàn yên tâm.<br><br>Hẹn anh em sớm.<br><br>Tôi,<br>Đại diện Rulax Việt Nam.`
    };

    console.log(`>>> Bắt đầu Sequence cho ${customerEmail}. Test Mode: ${isTest}`);
    let targetEmail = isTest ? customerEmail.replace('+test', '') : customerEmail;
    
    // 1. Gửi Email 1 ngay lập tức
    sendResendEmail(targetEmail, email1.subject, email1.html);

    // 2. Schedule Email 2
    setTimeout(() => {
        console.log(`>>> Chạy tiếp sequence gửi E2 cho ${customerEmail}`);
        sendResendEmail(targetEmail, email2.subject, email2.html);

        // 3. Schedule Email 3
        setTimeout(() => {
            console.log(`>>> Chạy tiếp sequence gửi E3 cho ${customerEmail}`);
            sendResendEmail(targetEmail, email3.subject, email3.html);
        }, delay1Day);

    }, delay2Days);
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
                    await runSQL(`UPDATE customers SET email = ${escapeSQL(data.email)}, notes = ${escapeSQL(surveyNotes)} WHERE id = ${existing[0].id}`);
                } else {
                    await runSQL(`INSERT INTO customers (name, phone, email, registration_date, notes) VALUES (${escapeSQL(data.name)}, ${escapeSQL(data.phone)}, ${escapeSQL(data.email)}, ${escapeSQL(data.date)}, ${escapeSQL(surveyNotes)})`);
                }
                
                // --- KÍCH HOẠT SEQUENCE TỰ ĐỘNG GỬI EMAIL ---
                startEmailSequence(data.name, data.email);
                
                
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
                        await runSQL(`UPDATE customers SET name=${escapeSQL(c.name)}, phone=${escapeSQL(c.phone)}, email=${escapeSQL(c.email)}, zalo=${escapeSQL(c.zalo)}, registration_date=${escapeSQL(c.registration_date)}, notes=${escapeSQL(c.notes)} WHERE id=${c.id}`);
                    } else {
                        await runSQL(`INSERT INTO customers (name, phone, email, zalo, registration_date, notes) VALUES (${escapeSQL(c.name)}, ${escapeSQL(c.phone)}, ${escapeSQL(c.email)}, ${escapeSQL(c.zalo)}, ${escapeSQL(c.registration_date)}, ${escapeSQL(c.notes)})`);
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
                            if (c.length > 0) {
                                customerId = c[0].id;
                                if (o.email) {
                                    await runSQL(`UPDATE customers SET email = ${escapeSQL(o.email)} WHERE id = ${customerId}`);
                                }
                            } else {
                                // Tạo khách mới nếu chưa có
                                await runSQL(`INSERT INTO customers (name, phone, email, registration_date) VALUES (${escapeSQL(o.name)}, ${escapeSQL(o.phone)}, ${escapeSQL(o.email)}, ${escapeSQL(o.date)})`);
                                const newC = await queryDB(`SELECT id FROM customers WHERE phone = ${escapeSQL(o.phone)}`);
                                customerId = newC[0].id;
                            }
                        }

                        // Tìm sản phẩm mặc định nếu cần (hoặc từ Website gửi về)
                        let productId = o.product_id || 1; 

                        const qty = o.quantity || 1;
                        // Dùng ngày từ client, hoặc fallback về giờ máy chủ (GMT+7)
                        const orderDate = (o.date || o.order_date) ? (o.date || o.order_date) : getNowVN();
                        // Do python sqlite3 execute() không chạy script cộp, tách ra 2 câu lệnh
                        await runSQL(`INSERT INTO orders (customer_id, product_id, amount, status, order_date) VALUES (${customerId}, ${productId}, ${o.total_price || o.amount}, ${escapeSQL(o.payment_status || o.status)}, ${escapeSQL(orderDate)})`);
                        const dbResult = await queryDB(`SELECT id FROM orders WHERE customer_id = ${customerId} ORDER BY id DESC LIMIT 1`);
                        await runSQL(`UPDATE products SET stock = stock - ${qty} WHERE id = ${productId}`);
                        
                        const orderId = dbResult[0]?.id;

                        // -- GỬI EMAIL XÁC NHẬN ĐƠN HÀNG --
                        if (o.email) {
                            let isTest = o.email.includes('+test');
                            let targetEmail = isTest ? o.email.replace('+test', '') : o.email;
                            const confirmSubject = `[Rulax] Xác nhận đặt hàng thành công (#${orderId || Math.floor(Math.random()*1000)})`;
                            const confirmHtml = `Chào ${o.name},<br><br>Cảm ơn bạn đã tin tưởng và đặt mua Đệm Thông Gió Rulax.<br><br><b>Thông tin đơn hàng của bạn:</b><br>- Sản phẩm: ${o.product || "Đệm Thông Gió Làm Mát Rulax"}<br>- Số lượng: ${qty}<br>- Tổng thanh toán: ${Number(o.total_price || o.amount).toLocaleString('vi-VN')}₫<br>- Hình thức: ${o.payment_status || 'COD'}<br><br>Đơn hàng của bạn sẽ sớm được đóng gói và giao tới địa chỉ: <i>${o.address || 'Đã cung cấp'}</i>.<br><br>Trân trọng,<br>Rulax Việt Nam.`;
                            sendResendEmail(targetEmail, confirmSubject, confirmHtml);
                        }

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

// Khởi tạo Database nếu mới tinh (Deploy cho Hosting)
async function initDatabase() {
    const initSql = `
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            stock INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            zalo TEXT,
            email TEXT,
            registration_date TEXT,
            notes TEXT
        );
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'Pending',
            order_date TEXT,
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        );
    `;
    await runSQL(initSql);
    // Chèn 1 sản phẩm mặc định nếu chưa có
    const checkProduct = await queryDB("SELECT * FROM products WHERE id=1");
    if (checkProduct.length === 0) {
        await runSQL(`INSERT INTO products (name, price, stock) VALUES ('Đệm Thông Gió Làm Mát Rulax', 959000, 100)`);
        console.log("🛠️ Đã tạo cấu trúc CSDL và sản phẩm mặc định!");
    } else {
        console.log("✅ Cấu trúc CSDL đã sẵn sàng.");
    }
}

initDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`=========================================`);
        console.log(` Admin Panel: http://localhost:${PORT}/admin`);
        console.log(` Landing Page: http://localhost:${PORT}/`);
        console.log(`=========================================`);
    });
});
