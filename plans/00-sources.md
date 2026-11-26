# 00. Nguồn tham khảo

File này ghi rõ FNB Platform học từ đâu và học theo cách nào. Mọi thứ ở đây là **tham khảo**: không có dòng code nào được sao chép vào repo.

## 1. Sản phẩm tham khảo nghiệp vụ

| Sản phẩm                                                | Học gì                                                                                     | Dùng ở plan |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| GrabFood (app người bán)                                | Nhóm tuỳ chọn có số chọn tối thiểu/tối đa, tạm hết món, nhận/từ chối đơn                   | 11, 21      |
| KiotViet                                                | Bán hàng nhanh tại quầy, sổ quỹ, chuyển kho giữa chi nhánh                                 | 12, 14, 16  |
| Sapo FnB                                                | Sơ đồ bàn, in phiếu bếp, báo cáo ca                                                        | 13, 14, 17  |
| iPOS.vn                                                 | Định lượng, giá vốn, combo, giá theo khung giờ, màn hình bếp                               | 13, 16, 29  |
| Odoo (POS Restaurant, Inventory, Purchase, HR, Payroll) | Sổ kho dạng bút toán, kỳ lương và phiếu lương, ra món theo lượt, đơn đặt hàng nhà cung cấp | 16, 20, 29  |

### 1.1 Quy tắc

- Chỉ xem **hành vi sản phẩm**: màn hình, luồng thao tác, tài liệu hướng dẫn công khai. Rồi tự thiết kế và tự viết.
- **Không đọc để chép và không dán** mã nguồn, schema, văn bản, hình ảnh, icon của các sản phẩm trên vào repo. Odoo có bản mã nguồn mở, nhưng vẫn không sao chép: giấy phép của nó (LGPL) không hợp với việc trộn vào code của mình, và mô hình dữ liệu của nó không khớp kiến trúc ở 04.
- Không dùng tên, logo, màu thương hiệu của họ trong giao diện, code hay tài liệu cho người dùng. Tên của họ chỉ xuất hiện trong plan như ghi chú tham khảo.
- Tính năng lấy cảm hứng từ đâu thì ghi ở cột "Tham khảo" trong plan của nó (ví dụ 29).

## 2. Hệ thống cũ: `hotdog-web-app`

Thư mục `../hotdog-web-app` là hệ thống một chi nhánh của cùng chủ, đang chạy thật và tiếp tục chạy song song.

| Dùng để                                                                   | Không dùng để                          |
| ------------------------------------------------------------------------- | -------------------------------------- |
| Hiểu nghiệp vụ quán đang vận hành: thực đơn, tuỳ chọn, ca, chấm công, kho | Lấy code, schema, migration, component |
| Biết những điểm cần tránh (bảng dưới)                                     | Làm nền để mở rộng                     |
| Nguồn dữ liệu thực đơn có thể import bằng script sau này                  | Chuyển dữ liệu đơn hàng, kho, khách    |

Bài học rút ra, đã đưa vào thiết kế mới:

| Vấn đề ở hệ thống cũ                                      | Cách làm mới                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Không có `branch_id`                                      | Mọi bảng vận hành có `branch_id` ngay từ đầu (04)                                        |
| Mỗi entity tự lặp cột id và thời gian                     | Helper cột chuẩn dùng chung (04)                                                         |
| Contract chỉ có type, không validate runtime              | Zod schema dùng chung (04)                                                               |
| Admin và POS chung một app                                | Hai app tách biệt (04)                                                                   |
| Chạy serverless: khởi động nguội chậm, không có WebSocket | API là tiến trình chạy liên tục (04)                                                     |
| Giao diện các app lệch màu, lệch kích thước               | Token màu và metric dùng chung; component theo ba nền tảng Web/POS/Mobile, tên chuẩn (03)  |
| Chưa có đa ngôn ngữ                                       | vi + en từ đầu (40)                                                                      |

Thư mục đó là **chỉ đọc**: không sửa, không commit trong đó.

### 2.1 Chuyển từ hệ thống cũ sang

Hai hệ thống chạy song song, nhưng mỗi chi nhánh tại một thời điểm chỉ bán trên **một** hệ thống; không nhập đơn hai nơi. Kế hoạch chi tiết viết ở task M7-14, gồm tối thiểu:

| Việc | Cách làm |
|---|---|
| Thực đơn | Script import đọc dữ liệu cũ, ghi qua API của hệ thống mới (không chép schema); rà tay tên tiếng Anh và giá |
| Nhân viên | Tạo mới tài khoản và nhóm quyền; không chuyển mật khẩu |
| Tồn kho đầu kỳ | Kiểm kê thực tế vào ngày chuyển, nhập bằng phiếu kiểm kê đầu tiên |
| Tiền quỹ đầu kỳ | Phiếu thu "số dư đầu kỳ" cho từng quỹ |
| Đơn, sổ kho, khách cũ | Không chuyển; tra cứu ở hệ thống cũ |
| Ngày chuyển | Chọn đầu một ngày kinh doanh; hệ thống cũ chuyển sang chỉ xem cho chi nhánh đó |
| Quay lui | Trong tuần đầu giữ hệ thống cũ sẵn sàng bán lại nếu hệ thống mới gặp sự cố chặn bán hàng |

## 3. Quy tắc cho agent

1. Không dán code, schema, văn bản, hình ảnh từ bất kỳ nguồn nào ở mục 1, 2 vào repo.
2. Các thư mục nguồn bên cạnh repo là chỉ đọc.
3. Thêm một nguồn tham khảo mới: thêm một dòng vào file này trước, nêu học gì và dùng ở plan nào.
4. Thư viện phụ thuộc (qua `package.json`) không thuộc phạm vi file này; giấy phép cho phép nêu ở 01.
