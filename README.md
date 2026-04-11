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

## ☁️ Hướng dẫn Deployment

Dự án này có thể deploy linh hoạt theo 2 cách:

### Cách 1: Deployment tĩnh (Netlify, Vercel, GitHub Pages)
- Bạn chỉ cần đẩy các file `index.html`, `style.css`, `script.js` và các thư mục assets lên.
- **Lưu ý**: Tính năng lưu file local `waitlist.json` sẽ không hoạt động ở cách này, nhưng dữ liệu vẫn được gửi về Google Sheets bình thường.

### Cách 2: Deployment Full (Render, Railway, VPS)
- Sử dụng lệnh `npm start`.
- Hệ thống sẽ chạy đầy đủ cả backend Node.js.

## 📝 Cấu hình Google Sheets
Để nhận thông tin đơn hàng về Google Sheets, bạn hãy:
1. Tạo một Google App Script Webhook.
2. Dán URL Webhook vào biến `GOOGLE_APP_SCRIPT_URL` ở dòng đầu tiên của file `script.js`.

---
**Rulax Việt Nam** - *Sự thoải mái cho mọi hành trình.*
