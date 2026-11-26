# 17. Báo cáo

Giai đoạn: **GĐ 1 (M7)**, bổ sung dần ở các giai đoạn sau · Module API: `reports`

## Mục tiêu

Chủ quán mở Admin là thấy hôm nay bán thế nào ở từng chi nhánh, món nào chạy, tiền về đâu, và có gì bất thường.

## Chức năng

### Tổng quan

| Mã | Chức năng |
|---|---|
| RPT-01 | Dashboard hôm nay: doanh thu, số đơn, giá trị đơn trung bình, số khách, so với hôm qua và cùng ngày tuần trước |
| RPT-02 | Biểu đồ doanh thu theo giờ trong ngày |
| RPT-03 | So sánh các chi nhánh trên cùng một màn hình |
| RPT-04 | Tình trạng hiện tại: bàn đang có khách, đơn đang mở, ca đang mở |

### Doanh thu

| Mã | Chức năng |
|---|---|
| RPT-10 | Doanh thu theo ngày, tuần, tháng; theo chi nhánh |
| RPT-11 | Theo loại đơn (ăn tại quán, mang đi, giao hàng) và kênh bán |
| RPT-12 | Theo phương thức thanh toán |
| RPT-13 | Theo ca và theo nhân viên thu ngân |
| RPT-14 | Theo khung giờ và ngày trong tuần |
| RPT-15 | Bảng tách: doanh thu gộp, giảm giá, hoàn, phí dịch vụ, VAT, phụ thu, chênh lệch làm tròn, doanh thu thuần; tip hiện riêng, ngoài doanh thu |

### Món

| Mã | Chức năng |
|---|---|
| RPT-20 | Món bán chạy và bán chậm theo số lượng, doanh thu |
| RPT-21 | Theo nhóm món |
| RPT-22 | Tuỳ chọn được chọn nhiều |
| RPT-23 | Lãi gộp theo món (cần định lượng và giá vốn) |

### Kiểm soát

| Mã | Chức năng |
|---|---|
| RPT-30 | Giảm giá: theo người thực hiện, người duyệt, lý do |
| RPT-31 | Huỷ món và huỷ đơn: theo người, lý do, thời điểm (trước/sau gửi bếp) |
| RPT-32 | Hoàn tiền |
| RPT-33 | Chênh lệch tiền két theo ca và nhân viên |
| RPT-34 | Đơn có sai lệch tính tiền giữa client và server |

### Kho (chi tiết ở tài liệu 16)

| Mã | Chức năng |
|---|---|
| RPT-40 | Nhập–xuất–tồn, giá trị tồn |
| RPT-41 | Chênh lệch tiêu hao lý thuyết và thực tế |

### Chung

| Mã | Chức năng |
|---|---|
| RPT-50 | Bộ lọc dùng chung: khoảng thời gian, chi nhánh, so sánh với kỳ trước |
| RPT-51 | Xuất Excel/CSV |
| RPT-52 | Gửi báo cáo cuối ngày tự động vào kênh Discord của quán (D-33): doanh thu, số đơn, theo phương thức thanh toán, giảm giá/huỷ/hoàn, chênh lệch ca |

## Quy tắc nghiệp vụ

- Mọi báo cáo theo "ngày kinh doanh" của chi nhánh, không theo ngày UTC.
- Báo cáo nhóm theo cột `business_date` đã lưu trên đơn, ca, phiếu (04); không tính lại từ giờ chốt ngày hiện tại.
- Doanh thu ghi nhận tại thời điểm thanh toán. Hoàn tiền tính vào ngày hoàn, không sửa ngày bán. Tiền đặt cọc (PAY-04) là khoản nhận trước, chỉ thành doanh thu khi đơn `paid`.
- Doanh thu thuần = doanh thu gộp − giảm giá − hoàn. VAT, phí dịch vụ, phụ thu và chênh lệch làm tròn tách riêng. Khi VAT tắt (D-28) thì cột VAT ẩn; tổng doanh thu theo kỳ là số quán dùng để kê khai thuế hộ kinh doanh, xuất được ra Excel (RPT-51).
- **GĐ 1 truy vấn trực tiếp** trên `orders`, `order_items`, `payments` với chỉ mục theo (`branch_id`, `business_date`). Ở quy mô vài chi nhánh, cách này đủ nhanh và luôn đúng khi có đơn offline về muộn hay điều chỉnh.
- Bảng tổng hợp theo ngày chỉ làm khi đo được một báo cáo chậm quá 2 giây trên dữ liệu thật; khi làm thì phải tính lại được cho những ngày có đơn về muộn.
- Người chỉ có quyền ở một chi nhánh không thấy số liệu chi nhánh khác.

## Dữ liệu chính

Nguồn: `orders`, `order_items`, `payments`, `cash_sessions`, `stock_movements`. Bảng tổng hợp (`daily_sales_summary`, `daily_product_summary`, `daily_payment_summary`) là phương án dự phòng, chưa làm ở GĐ 1.

## Mã quyền

`report.sales`, `report.products`, `report.control`, `report.inventory`, `report.all_branches`, `report.export`, `report.view_cost`.

## Bổ sung ở giai đoạn sau

- GĐ 2: chi phí lương trên doanh thu, giờ công.
- GĐ 3: khách mới/quay lại, hiệu quả voucher, tỷ lệ đặt bàn không đến.
- GĐ 6: lãi lỗ theo chi nhánh (doanh thu − giá vốn − lương − chi phí).

## Câu hỏi mở

- Báo cáo cuối ngày gửi một kênh Discord chung hay mỗi chi nhánh một kênh? (mặc định: mỗi chi nhánh một kênh, cấu hình được)
