const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// Config
const DB_PATH = path.join(__dirname, '..', 'brain.db');
const SCRIPT_PATH = path.join(__dirname, 'sqlite_runner.py');

// Python runner identical to server.js to avoid DB locks
function executePythonSQL(sql, isQuery) {
    return new Promise((resolve, reject) => {
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
    if is_query:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description] if cursor.description else []
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        sys.stdout.write(json.dumps(data))
    else:
        conn.executescript(sql)
        conn.commit()
        sys.stdout.write(json.dumps({"success": True}))
    conn.close()
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`;
        fs.writeFileSync(SCRIPT_PATH, pyCode);

        const child = cp.spawn('python', [SCRIPT_PATH, DB_PATH, isQuery ? 'true' : 'false']);
        
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        
        child.stdin.write(sql);
        child.stdin.end();
        
        child.on('close', code => {
            if (code !== 0) return reject(new Error(stderr || "Python Error " + code));
            try { resolve(JSON.parse(stdout)); }
            catch (e) { resolve(isQuery ? [] : { success: true }); }
        });
    });
}

// Helpers
async function queryDB(sql) { return await executePythonSQL(sql, true); }
async function runSQL(sql) { return await executePythonSQL(sql, false); }

function getTodayString() {
    const now = new Date();
    const offset = 7 * 60;
    const localMs = now.getTime() + (offset * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000);
    const d = new Date(localMs);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
}

// Setup MCP Server
const server = new McpServer({
    name: "Rulax-GoClaw-MCP",
    version: "1.0.0"
});

// Tool 1: get_daily_sales_summary
server.tool(
    "get_daily_sales_summary",
    "Lấy báo cáo doanh thu, số lượng đơn hàng theo ngày. Nếu không truyền date, sẽ lấy ngày hôm nay.",
    {
        date: z.string().optional().describe("Ngày cần lấy báo cáo định dạng YYYY-MM-DD (VD: 2026-04-24)"),
    },
    async ({ date }) => {
        try {
            const targetDate = date || getTodayString();
            console.log(`[${new Date().toISOString()}] Function called: get_daily_sales_summary(date=${targetDate})`);
            
            const sql = `
                SELECT 
                    COUNT(id) as total_orders, 
                    SUM(amount) as revenue,
                    SUM(CASE WHEN status='sepay' THEN 1 ELSE 0 END) as sepay_orders,
                    SUM(CASE WHEN status='COD' THEN 1 ELSE 0 END) as cod_orders
                FROM orders
                WHERE order_date LIKE '${targetDate}%'
            `;
            const result = await queryDB(sql);
            
            const data = result[0];
            return {
                content: [{
                    type: "text",
                    text: `Báo cáo doanh thu ngày ${targetDate}:
- Tổng số đơn hàng: ${data.total_orders || 0}
- Doanh thu: ${(data.revenue || 0).toLocaleString('vi-VN')} VNĐ
- Đã thanh toán (SePay): ${data.sepay_orders || 0} đơn
- COD: ${data.cod_orders || 0} đơn`
                }]
            };
        } catch (error) {
            console.error(error);
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// Tool 2: get_hot_waitlist_leads
server.tool(
    "get_hot_waitlist_leads",
    "Lấy danh sách các khách hàng đã điền form khảo sát nhưng chưa chốt đơn, dùng để gọi telesale.",
    {
        limit: z.number().optional().describe("Số lượng leads cần lấy, mặc định 5"),
    },
    async ({ limit }) => {
        try {
            const count = limit || 5;
            console.log(`[${new Date().toISOString()}] Function called: get_hot_waitlist_leads(limit=${count})`);
            
            const sql = `
                SELECT c.name, c.phone, c.notes, c.registration_date
                FROM customers c
                LEFT JOIN orders o ON c.id = o.customer_id
                WHERE o.id IS NULL
                ORDER BY c.registration_date DESC
                LIMIT ${count}
            `;
            const leads = await queryDB(sql);
            
            if (leads.length === 0) {
                return { content: [{ type: "text", text: "Hiện không có khách hàng chờ nào chưa chốt đơn." }] };
            }

            let text = `Tìm thấy ${leads.length} khách hàng tiềm năng:\n\n`;
            leads.forEach((lead, index) => {
                text += `${index + 1}. ${lead.name} - ${lead.phone}\n   ${lead.notes}\n   Ngày đăng ký: ${lead.registration_date}\n\n`;
            });

            return { content: [{ type: "text", text }] };
        } catch (error) {
            console.error(error);
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// Tool 3: update_order_shipping_status
server.tool(
    "update_order_shipping_status",
    "Cập nhật trạng thái giao hàng của một đơn hàng cụ thể.",
    {
        order_id: z.number().describe("ID của đơn hàng (số)"),
        status: z.string().describe("Trạng thái mới (VD: 'Đã gửi', 'Đang giao', 'Hoàn thành')")
    },
    async ({ order_id, status }) => {
        try {
            console.log(`[${new Date().toISOString()}] Function called: update_order_shipping_status(order_id=${order_id}, status='${status}')`);
            
            // Check if order exists
            const existing = await queryDB(`SELECT id FROM orders WHERE id = ${order_id}`);
            if (existing.length === 0) {
                return { content: [{ type: "text", text: `Không tìm thấy đơn hàng với ID ${order_id}` }] };
            }

            const sql = `UPDATE orders SET status = '${status}' WHERE id = ${order_id}`;
            await runSQL(sql);
            
            return { content: [{ type: "text", text: `Thành công! Đã cập nhật đơn hàng #${order_id} sang trạng thái: ${status}` }] };
        } catch (error) {
            console.error(error);
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// Express Server + SSE Transport
const app = express();
// Removed express.json() so SDK can read raw stream

let transport = null;

app.get("/sse", async (req, res) => {
    console.log(`[${new Date().toISOString()}] New SSE Connection established.`);
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

app.post("/messages", async (req, res) => {
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send("No active SSE connection");
    }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`✅ Rulax GoClaw MCP Server is running!`);
    console.log(`📡 SSE Endpoint: http://0.0.0.0:${PORT}/sse`);
    console.log(`✉️  Message POST: http://0.0.0.0:${PORT}/messages`);
    console.log(`===============================================`);
});
