# Hướng Dẫn Deploy Lên Render.com (Miễn Phí)

Để trang Admin và CRM của bạn hoạt động trên Internet, hãy làm theo các bước cực kỳ đơn giản sau:

## Bước 1: Đưa code lên GitHub
1. Đăng nhập vào [GitHub](https://github.com/).
2. Tạo một Repository mới (ví dụ tên là `shopee-landing-page`).
3. Upload toàn bộ nội dung trong thư mục dự án của bạn (trừ file Zip) lên đó.

## Bước 2: Kết nối với Render.com
1. Truy cập [Render.com](https://render.com/) và đăng nhập bằng tài khoản GitHub.
2. Nhấn nút **New** -> Chọn **Web Service**.
3. Chọn Repository `shopee-landing-page` vừa tạo.

## Bước 3: Cấu hình trên Render
- **Name**: Tên tùy ý (ví dụ: `rulax-store`).
- **Runtime**: Chọn `Node`.
- **Build Command**: `npm install` (hoặc để trống nếu không dùng thêm thư viện).
- **Start Command**: `node server.js`.
- **Instance Type**: Chọn **Free**.

## Bước 4: Cấu hình Lưu trữ dữ liệu (Quan trọng nhất)
Để không bị mất đơn hàng khi server restart:
1. Trong giao diện dịch vụ trên Render, chọn mục **Advanced**.
2. Tìm phần **Disk** -> Chọn **Add Disk**.
3. **Name**: `db-storage`.
4. **Mount Path**: `/opt/render/project/src/data` (Lưu ý: Bạn cần sửa lại đường dẫn DB trong code nếu muốn dùng Disk, hoặc đơn giản là dùng bản Free cơ bản thì Render sẽ lưu tạm trong phiên làm việc).

> [!TIP]
> **Cách đơn giản nhất**: Nếu bạn chỉ cần chạy Landing Page và nhận đơn qua Google Sheets, bạn không cần quan tâm đến mục Disk. Dữ liệu Google Sheets sẽ luôn an toàn 100%.

## Bước 5: Hoàn tất
Nhấn **Create Web Service**. Đợi vài phút, Render sẽ cấp cho bạn một đường dẫn (ví dụ: `https://rulax-store.onrender.com`). 

Bây giờ bạn có thể dùng link đó để gửi cho khách hàng và truy cập `/admin` để quản lý!
