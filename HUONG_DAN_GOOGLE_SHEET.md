# 🚀 Hướng Dẫn Cài Đặt Google Sheet Phân Loại 2 Trang (Đơn Hàng & Khảo Sát)

Để dữ liệu tự động đổ về **2 Sheet khác nhau** trong cùng một file Google Sheet, anh hãy làm theo chính xác các bước sau nhé:

### BƯỚC 1: Đổi tên Sheet trong Google Sheet của anh
1. Mở file Google Sheet mà anh đang dùng để nhận dữ liệu.
2. Tại thanh công cụ bên dưới cùng (chỗ tên các Sheet), anh hãy tạo thành **2 Sheet (Trang tính)**.
3. Click đúp chuột vào tên Sheet và đổi tên chính xác thành:
   * **`DonHang`** (Đây là trang chứa thông tin khách đặt mua)
   * **`KhachKhaoSat`** (Đây là trang chứa form thông tin Waitlist)

> ⚠️ **Lưu ý quan trọng**: Anh bắt buộc phải điền đúng chữ viết hoa, viết thường và không có dấu cách: **DonHang** và **KhachKhaoSat**.

---

### BƯỚC 2: Cài đặt code mới cho Google App Script

1. Trên menu của Google Sheet, chọn **Tiện ích mở rộng (Extensions)** => **Apps Script**.
2. Nó sẽ mở ra một tab lập trình. Xóa toàn bộ code cũ đang có bên trong đó.
3. **Copy và Dán** toàn bộ đoạn code dưới đây vào:

```javascript
// --- BẮT ĐẦU COPY TỪ ĐÂY ---
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.form_type === "WAITLIST") {
      var sheet = doc.getSheetByName("KhachKhaoSat");
      if (sheet.getLastRow() === 0) {
         sheet.appendRow(["Thời Gian", "Họ Tên", "Số Điện Thoại", "Thời gian lái xe/ngày", "Hay bị nóng lưng không?", "Dòng xe đang đi"]);
         sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#d9ead3");
      }
      sheet.appendRow([data.date, data.name, data.phone, data.drivingTime, data.sweatingCondition, data.carModel]);

    } else {
      var sheet = doc.getSheetByName("DonHang");
      if (sheet.getLastRow() === 0) {
         sheet.appendRow(["Thời Gian", "Họ Tên", "Số Điện Thoại", "Địa Chỉ Nhận Hàng", "Sản Phẩm", "Số lượng", "Tổng Tiền", "Ghi Chú"]);
         sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#fff2cc");
      }
      
      // LOGIC CẬP NHẬT TRẠNG THÁI (UPSERT)
      var rows = sheet.getDataRange().getValues();
      var foundRowIndex = -1;
      
      // Tìm kiếm khách hàng theo Số Điện Thoại trong 100 dòng cuối cùng (để tối ưu tốc độ)
      var startRow = Math.max(1, rows.length - 100);
      for (var i = rows.length - 1; i >= startRow; i--) {
        if (rows[i][2].toString().trim() === data.phone.toString().trim()) {
           foundRowIndex = i + 1; // Index trong Sheets bắt đầu từ 1
           break;
        }
      }

      if (foundRowIndex !== -1 && data.payment_status === "Đã thanh toán (SePay)") {
        // Nếu tìm thấy khách và đây là lệnh cập nhật thanh toán -> Ghi đè vào cột Ghi Chú (Cột 8)
        sheet.getRange(foundRowIndex, 8).setValue(data.payment_status);
      } else {
        // Nếu không tìm thấy hoặc là đơn mới -> Thêm dòng mới
        sheet.appendRow([
          data.date,
          data.name,
          data.phone,
          data.address,
          data.product,
          data.quantity,
          data.total_price,
          data.payment_status || "COD"
        ]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
// --- KẾT THÚC COPY ---
```


---

### BƯỚC 3: Lưu và Lấy Link Webhook mới

1. Bấm nút **Lưu** (Biểu tượng đĩa mềm 💾) ở phía trên.
2. Bấm nút **Triển khai (Deploy)** ở góc trên bên phải => Chọn **Triển khai mới (New deployment)**.
3. Ở khung bên trái có biểu tượng bánh răng ⚙️, hãy chọn loại là **Ứng dụng web (Web app)**.
4. Bảng thông tin hiện lên:
   - *Mô tả:* Tùy ý điền (VD: Chia 2 sheet mới)
   - *Ứng dụng thực thi dưới dạng:* **Tôi (Bản thân bạn - Email của bạn)**
   - *Đối tượng có quyền truy cập:* Chuyển thành **Bất kỳ ai (Anyone)**.
5. Bấm **Triển khai (Deploy)**. Nếu Google hiện lên bảng yêu cầu cấp quyền thì anh cứ nhấn "Ủy quyền truy cập" -> Chọn tài khoản Google của anh -> Advanced (Nâng cao) -> Go to ... (Tiếp tục tới trang web...).
6. Sau khi chạy xong, Google sẽ cho anh một đoạn Link Url bắt đầu bằng `https://script.google.com/macros/s/...`. Hãy **COPY URL NÀY**.

---

### BƯỚC 4: Cuối cùng, cập nhật Link vào Website
1. Mở file `script.js` trong bộ code của anh ở dòng trên cùng (dòng 2).
2. Xóa Link cũ đi và dán đè cái URL mới anh vừa copy vào vị trí biến `GOOGLE_APP_SCRIPT_URL`:

```javascript
// Thay LINK ở đây:
const GOOGLE_APP_SCRIPT_URL = "DÁN_LINK_ÚNG_DỤNG_WEB_VỪA_COPY_VÀO_ĐÂY";
```
