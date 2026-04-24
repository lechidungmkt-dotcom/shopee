# Hướng Dẫn Cài Đặt Node.js

Để chạy được bộ CRM và Admin Panel, bạn cần có môi trường Node.js trên máy tính hoặc máy chủ của mình.

## 1. Cài đặt trên Máy tính (Localhost)

### Bước 1: Tải về
- Truy cập: [https://nodejs.org/](https://nodejs.org/)
- Chọn phiên bản **LTS** (Ví dụ: 20.x.x) - Đây là bản ổn định nhất.

### Bước 2: Cài đặt
- **Windows**: Chạy file `.msi` và nhấn Next liên tục. Nhớ tích vào ô "Automatically install the necessary tools".
- **macOS**: Chạy file `.pkg` và làm theo hướng dẫn.

### Bước 3: Kiểm tra
Mở Terminal (Mac) hoặc CMD (Windows) và gõ:
```bash
node -v
```
Nếu hiện `v20...` là thành công.

---

## 2. Cách chạy Server CRM
Sau khi cài xong, bạn làm theo các bước:
1. Mở thư mục dự án `shopee-landing-page`.
2. Chuột phải chọn "Open in Terminal" (hoặc CMD).
3. Gõ lệnh:
   ```bash
   node server.js
   ```
4. Giữ nguyên cửa sổ Terminal đó (không được tắt).
5. Mở trình duyệt vào: `http://localhost:3000/admin`

---

## 3. Cài đặt trên Hosting (Nếu muốn chạy online)

### Trường hợp hosting dùng cPanel:
1. Tìm mục **Setup Node.js App**.
2. Nhấn **Create Application**.
3. Chọn bản Node.js mới nhất.
4. **Application root**: Thư mục chứa code của bạn.
5. **Startup file**: Điền `server.js`.
6. Nhấn **Save** và **Run JS Script**.

### Trường hợp dùng VPS:
Gõ các lệnh sau (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Sau đó dùng thư viện `pm2` để giữ server chạy ngầm:
```bash
sudo npm install pm2 -g
pm2 start server.js
```

---

> [!TIP]
> Nếu bạn thấy việc cài đặt trên hosting quá phức tạp, hãy sử dụng **Render.com**. Bạn chỉ cần upload code lên GitHub và kết nối với Render, họ sẽ tự động cài đặt và chạy server cho bạn hoàn toàn miễn phí.
