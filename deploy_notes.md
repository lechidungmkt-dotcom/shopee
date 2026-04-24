# Deploy Notes — Website Rulax (halolife.vn)

## Ngôn ngữ & Framework
- **Backend**: Node.js (module `http` thuần, không Express)
- **Database**: SQLite (`brain.db`) — truy vấn qua cầu nối Python (`sqlite_runner.py`)
- **Frontend**: HTML + CSS + JS thuần
- **Process Manager**: PM2

## Các biến `.env` cần có trên VPS

```env
PORT=3000
SEPAY_API_KEY=<API key từ SePay Admin>
SEPAY_ACCOUNT=<Số tài khoản ngân hàng>
SEPAY_BANK=MSB
SEPAY_ACCOUNT_NAME=<Tên chủ tài khoản>
RESEND_API_KEY=<API key từ Resend Dashboard>
GOOGLE_APP_SCRIPT_URL=<URL Google App Script Web App>
SITE_URL=https://halolife.vn
```

## Lệnh chạy server

```bash
# Cài dependencies
npm install

# Chạy bằng PM2 (production)
pm2 start ecosystem.config.js

# Hoặc chạy trực tiếp
node server.js
```

## Cổng lắng nghe
- Mặc định: **3000** (có thể thay đổi qua biến `PORT` trong `.env`)
- Nginx reverse proxy: `halolife.vn` (443) → `localhost:3000`

## Yêu cầu hệ thống trên VPS
- **Node.js** >= 20.x
- **Python 3** >= 3.10 (cho `sqlite_runner.py`)
- **PM2** (global): `npm install -g pm2`
- **Nginx** (reverse proxy + SSL)
- **Certbot** (Let's Encrypt SSL)

## Cấu trúc thư mục trên VPS
```
/opt/rulax/
├── server.js          # Entry point
├── script.js          # Frontend logic
├── index.html         # Landing page
├── admin.html         # Admin CRM panel
├── thanks.html        # Thank you page
├── style.css          # Styles
├── ecosystem.config.js # PM2 config
├── package.json
├── .env               # Secrets (KHÔNG commit)
├── brain.db           # SQLite DB (KHÔNG commit)
└── *.jpg, video.mp4   # Assets
```
