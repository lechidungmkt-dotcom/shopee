# Danh sách chuẩn bị Deploy dự án (Thư mục 1 - VPS Linux)

Dưới đây là kết quả kiểm tra thư mục `shopee-main/shopee-main/1`.

## 1. Ngôn ngữ & Framework
- **Backend:** Node.js (sử dụng module `http` thuần).
- **Database:** SQLite (`brain.db`) thông qua cầu nối Python 3.
- **Thư viện:** `puppeteer`, `resend`.

## 2. Các thành phần CẦN BỔ SUNG
- [x] **File `.env`:** **(Đã tạo)**
- [x] **File cấu hình PM2 (`ecosystem.config.js`):** **(Đã tạo)**
- [x] **File `.gitignore`:** **(Đã tạo)**
- [x] **File `README.md`:** **(Đã cập nhật)**

## 3. Lỗ hổng bảo mật (CẦN FIX NGAY)
- [x] **Lộ Key trong `server.js`:** **(Đã fix)** Chuyển sang biến môi trường.
- [x] **Lộ Key trong `script.js`:** **(Đã xóa)** Đã loại bỏ hoàn toàn Key khỏi mã nguồn frontend.
- [x] **Lộ Link Google Script:** **(Đã fix)** Chuyển sang lấy động từ server qua API.

## 4. Checklist chuẩn bị trước khi deploy
- [ ] **Cài đặt VPS:** Cài Node.js, Python 3, Git, PM2.
- [ ] **Thư viện hệ thống:** Cài các gói cần thiết để Puppeteer chạy được (chrome headless dependencies).
- [ ] **Nginx:** Cấu hình trỏ tên miền và SSL (HTTPS) - cực kỳ quan trọng để nhận Webhook từ SePay.
- [ ] **Biến môi trường:** Thiết lập đầy đủ các biến trong `.env` trên VPS.

---
*Tiếp theo (Bước 4), tôi sẽ tiến hành tạo các file cấu hình và dọn dẹp các mã bí mật bị lộ trong thư mục này.*
