# Shopee Landing Page - Đệm Làm Mát Rulax

Landing Page chuyên nghiệp dành cho sản phẩm **Đệm Thông Gió Làm Mát Ghế Ô Tô RULAX**. Dự án được tích hợp sẵn hệ thống Chatbot tư vấn và đồng bộ dữ liệu đơn hàng về Google Sheets.

## 🚀 Tính năng nổi bật
- **Giao diện chuẩn Shopee Mall**: Tối ưu trải nghiệm mua hàng, tăng tỷ lệ chuyển đổi.
- **Chatbot AI Mock**: Trợ lý tư vấn thông minh, trả lời các câu hỏi thường gặp về sản phẩm.
- **Smart Cart & Checkout**: Giỏ hàng trượt và form đặt hàng chuyên nghiệp.
- **Google Sheets Integration**: Tự động lưu thông tin đơn hàng và waitlist về bảng tính Google.
- **Node.js Local Server**: Hỗ trợ chạy thử nghiệm và lưu data dự phòng local.

## 🛠 Hướng dẫn cài đặt & Chạy Local

1. **Yêu cầu**: Máy tính đã cài đặt [Node.js](https://nodejs.org/).
2. **Cài đặt**: Giải nén bộ mã nguồn.
3. **Chạy Server**:
   ```bash
   npm start
   ```
4. **Truy cập**: Mở trình duyệt và vào địa chỉ `http://localhost:3000`.

## 📁 Cấu trúc thư mục
- `index.html`: Giao diện chính của Landing Page.
- `style.css`: Toàn bộ style và thiết kế.
- `script.js`: Logic xử lý giỏ hàng, đặt hàng, chatbot và gửi dữ liệu.
- `server.js`: Server Node.js đơn giản để serve file và lưu waitlist.
- `data/`: Chứa các file dữ liệu JSON (FAQ, Feedback...).
- `waitlist.json`: Nơi lưu trữ thông tin khảo sát cục bộ.

## ☁️ Hướng dẫn Deployment lên VPS Linux (Ubuntu)

Dự án đã được cấu hình tối ưu để deploy lên VPS chạy Linux. Hãy thực hiện theo các bước sau:

### Bước 1: Chuẩn bị môi trường trên VPS
Cài đặt Node.js (v18+) và Python 3:
```bash
sudo apt update
sudo apt install nodejs npm python3 -y
sudo npm install -g pm2
```

### Bước 2: Cấu hình biến môi trường
1. Copy thư mục `1` lên VPS.
2. Tạo file `.env` từ file mẫu: `cp .env.example .env`
3. Mở file `.env` và điền chính xác các API Key (SePay, Resend, Google Script).

### Bước 3: Cài đặt và Chạy ứng dụng
```bash
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Bước 4: Cấu hình Nginx & SSL (Khuyến nghị)
Sử dụng Nginx làm Reverse Proxy để trỏ port 80/443 về port 3000 và cài đặt SSL để chạy HTTPS (quan trọng cho Webhook SePay).

## 📝 Bảo mật dự án
- Toàn bộ API Keys hiện đã được chuyển vào file `.env` và không còn lộ trong mã nguồn JavaScript.
- Tuyệt đối **KHÔNG** chia sẻ file `.env` cho bất kỳ ai.

---
**Rulax Việt Nam** - *Sự thoải mái cho mọi hành trình.*
