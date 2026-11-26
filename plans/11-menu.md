# 11. Thực đơn: nhóm món, món, tuỳ chọn

Giai đoạn: **GĐ 1 (M2)** · Module API: `catalog`

## Mục tiêu

Quản lý thực đơn một lần ở cấp doanh nghiệp, bán được ở mọi chi nhánh, mỗi chi nhánh chỉnh được giá và bật/tắt món. Tuỳ chọn món theo kiểu GrabFood: nhóm tuỳ chọn có ràng buộc số lượng chọn.

## Khái niệm

| Khái niệm | Ví dụ |
|---|---|
| Nhóm món | Hotdog, Đồ uống, Món thêm |
| Món | Hotdog phô mai |
| Biến thể | Size M, Size L (mỗi biến thể một giá) |
| Nhóm tuỳ chọn | "Chọn sốt" (bắt buộc, chọn 1), "Thêm topping" (tuỳ chọn, tối đa 3) |
| Tuỳ chọn | Sốt cay (+0đ), Thêm phô mai (+10.000đ) |

## Chức năng

### Nhóm món

| Mã | Chức năng |
|---|---|
| MENU-01 | Tạo, sửa, ẩn nhóm món; ảnh, màu hiển thị trên POS |
| MENU-02 | Sắp xếp thứ tự bằng kéo thả |
| MENU-03 | Nhóm con một cấp (ví dụ Đồ uống → Trà, Cà phê) |

### Món

| Mã | Chức năng |
|---|---|
| MENU-10 | Tạo, sửa món: tên, mã (SKU), mô tả, ảnh, nhóm, giá, đơn vị tính |
| MENU-11 | Biến thể (size): tên, giá, mã riêng; chọn biến thể mặc định |
| MENU-12 | Loại món: món thường, món theo cân/thời giá (nhập giá lúc bán), món thêm (chỉ bán kèm) |
| MENU-13 | Gắn trạm chế biến (bếp, bar) để định tuyến phiếu |
| MENU-14 | Thuế suất riêng cho món nếu khác mặc định chi nhánh |
| MENU-15 | Ngừng bán vĩnh viễn (ẩn), khác với tạm hết |
| MENU-16 | Nhân bản món |
| MENU-17 | Nhập/xuất thực đơn bằng Excel (ưu tiên thấp: làm cuối M2, hoãn được sang sau M3 nếu M2 kéo dài; lần nhập đầu dùng script ở 00 mục 2.1) |
| MENU-18 | Tìm kiếm, lọc theo nhóm, trạng thái, chi nhánh |

### Tuỳ chọn

| Mã | Chức năng |
|---|---|
| MENU-20 | Tạo nhóm tuỳ chọn: tên, bắt buộc hay không, chọn tối thiểu, chọn tối đa |
| MENU-21 | Tuỳ chọn trong nhóm: tên, giá cộng thêm, mặc định được chọn, thứ tự |
| MENU-22 | Cho phép chọn một tuỳ chọn nhiều lần (ví dụ thêm phô mai x2), có giới hạn |
| MENU-23 | Gán một nhóm tuỳ chọn cho nhiều món; một món có nhiều nhóm, có thứ tự |
| MENU-24 | Tạm hết một tuỳ chọn mà không ảnh hưởng món |
| MENU-25 | Xem nhóm tuỳ chọn đang được dùng ở những món nào |

### Theo chi nhánh

| Mã | Chức năng |
|---|---|
| MENU-30 | Bật/tắt bán một món ở từng chi nhánh |
| MENU-31 | Giá riêng theo chi nhánh cho món, biến thể, tuỳ chọn; không đặt thì dùng giá chung |
| MENU-32 | Tạm hết món: thao tác nhanh từ POS hoặc Admin, tự mở lại vào ngày kinh doanh sau hoặc mở tay |
| MENU-33 | Sao chép cấu hình thực đơn từ chi nhánh này sang chi nhánh khác |

### Phát hành cho POS

| Mã | Chức năng |
|---|---|
| MENU-40 | Mỗi thay đổi thực đơn tăng `version` của chi nhánh bị ảnh hưởng; POS thấy `version` mới thì **tải lại toàn bộ** thực đơn của chi nhánh và thay trong một transaction cục bộ, không cần đăng nhập lại. Không làm đồng bộ từng phần: thực đơn chỉ khoảng vài trăm dòng, tải lại rẻ hơn nhiều so với rủi ro lệch dữ liệu |
| MENU-41 | Xem trước thực đơn như POS sẽ thấy, theo chi nhánh |

## Quy tắc nghiệp vụ

- Tên nhóm món, món, biến thể, nhóm tuỳ chọn, tuỳ chọn và mô tả món nhập được hai ngôn ngữ (`vi` bắt buộc, `en` tuỳ chọn); xem 40 mục 4.
- Nhóm tuỳ chọn: `0 ≤ tối thiểu ≤ tối đa`. Bắt buộc nghĩa là tối thiểu ≥ 1.
- POS không cho thêm món vào đơn nếu chưa chọn đủ nhóm bắt buộc.
- Giá hiệu lực = giá chi nhánh nếu có, không thì giá chung.
- Xoá món, biến thể, tuỳ chọn là xoá mềm. Đơn cũ giữ nguyên nhờ snapshot.
- Món đang nằm trong đơn chưa thanh toán vẫn ngừng bán được; đơn đó không bị ảnh hưởng.
- Nhóm bắt buộc mà mọi tuỳ chọn đều tạm hết thì món tự chuyển tạm hết. Đây là trạng thái **tính ra** lúc hiển thị, không lưu; tuỳ chọn có lại thì món tự bán lại.
- POS giữ các phiên bản thực đơn mà đơn chưa đồng bộ còn dùng, để lệnh mang đúng `catalogVersion` (12).
- Tìm kiếm tên bỏ dấu trên cả `vi` và `en`: cột sinh sẵn `name_search` (đã bỏ dấu, viết thường, gộp hai ngôn ngữ) có chỉ mục trigram; làm ở M2-01.

## Dữ liệu chính

`categories`, `products`, `product_variants`, `modifier_groups`, `modifiers`, `product_modifier_groups`, `branch_products` (bật/tắt, tạm hết), `branch_prices`, `catalog_versions`.

## Mã quyền

`menu.view`, `menu.manage`, `menu.price`, `menu.availability` (tạm hết, dành cho thu ngân/bếp), `menu.import_export`.

## Màn hình

- Admin: Nhóm món · Danh sách món · Form món (thông tin, biến thể, tuỳ chọn, chi nhánh, định lượng) · Nhóm tuỳ chọn · Giá theo chi nhánh · Nhập/xuất Excel.
- POS: Lưới món theo nhóm · Hộp chọn biến thể và tuỳ chọn · Danh sách tạm hết.

## Để sau (GĐ 6)

Combo/set, bảng giá theo kênh bán (tại quán, mang đi, giao hàng), giá theo khung giờ, thực đơn theo lịch (sáng/trưa/tối).

## Câu hỏi mở

- Có món bán theo cân hoặc thời giá không?
- Giá mang đi/giao hàng có khác giá tại quán không? Nếu có thì bảng giá theo kênh cần kéo về GĐ 1.
