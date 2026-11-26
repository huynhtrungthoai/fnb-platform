# 16. Kho và định lượng

Giai đoạn: **GĐ 1 (M6) cơ bản**, **GĐ 6 nâng cao** · Module API: `inventory`

## Mục tiêu

Biết tồn kho nguyên liệu theo từng chi nhánh, tự trừ khi bán theo định lượng, tính được giá vốn món và phát hiện thất thoát qua kiểm kê.

## Khái niệm

| Khái niệm | Giải thích |
|---|---|
| Nguyên liệu | Thứ nhập về và tiêu hao: xúc xích, bánh mì, phô mai, ly, ống hút |
| Đơn vị cơ sở | Đơn vị nhỏ nhất dùng để tính tồn: gram, ml, cái |
| Đơn vị quy đổi | Đơn vị mua hàng: thùng = 24 cái, kg = 1000 g |
| Định lượng | Một món/biến thể/tuỳ chọn tiêu hao bao nhiêu nguyên liệu |
| Sổ kho | Bảng ghi mọi biến động tồn, chỉ ghi thêm |

## Chức năng GĐ 1

### Danh mục

| Mã | Chức năng |
|---|---|
| INV-01 | Nguyên liệu: tên, mã, nhóm, đơn vị cơ sở, mức tồn tối thiểu |
| INV-02 | Đơn vị và quy đổi theo từng nguyên liệu |
| INV-03 | Nhà cung cấp: tên, liên hệ, nguyên liệu thường mua, giá gần nhất |
| INV-04 | Kho theo chi nhánh (mặc định mỗi chi nhánh một kho) |

### Định lượng

| Mã | Chức năng |
|---|---|
| INV-10 | Định lượng cho món và từng biến thể |
| INV-11 | Định lượng cho tuỳ chọn (thêm phô mai = +20 g phô mai) |
| INV-12 | Tỷ lệ hao hụt theo nguyên liệu |
| INV-13 | Giá vốn món = tổng định lượng × giá vốn bình quân; hiển thị lãi gộp |
| INV-14 | Món không có định lượng thì không trừ kho, có cảnh báo trong danh sách |

### Phiếu kho

| Mã | Chức năng |
|---|---|
| INV-20 | Phiếu nhập hàng: nhà cung cấp, nguyên liệu, số lượng theo đơn vị mua, đơn giá, chiết khấu, ảnh hoá đơn |
| INV-21 | Trạng thái phiếu: nháp → hoàn tất; hoàn tất mới ghi sổ kho |
| INV-22 | Thanh toán phiếu nhập: trả ngay (ghi sổ quỹ) hoặc đánh dấu "chưa trả" rồi ghi nhận trả sau. GĐ 1 chỉ có cờ đã trả/chưa trả trên từng phiếu; sổ công nợ theo nhà cung cấp là INV-54 |
| INV-23 | Phiếu xuất huỷ: hỏng, hết hạn, đổ vỡ, có lý do |
| INV-24 | Phiếu điều chỉnh tồn |
| INV-25 | Huỷ phiếu đã hoàn tất bằng bút toán đảo |

### Trừ kho khi bán

| Mã | Chức năng |
|---|---|
| INV-30 | Khi đơn thanh toán xong: tính tiêu hao theo định lượng của món, biến thể, tuỳ chọn và ghi sổ kho (chạy qua hàng đợi) |
| INV-31 | Hoàn kho khi hoàn tiền, nếu người hoàn chọn "trả lại kho" |
| INV-32 | Món đã gửi bếp rồi huỷ: ghi nhận hao hụt hay không tuỳ lý do huỷ |
| INV-33 | Cho phép tồn âm, đánh dấu để kiểm tra |
| INV-34 | Ghi giá vốn vào từng món trong đơn tại thời điểm bán |

### Kiểm kê và theo dõi

| Mã | Chức năng |
|---|---|
| INV-40 | Phiếu kiểm kê: chọn toàn bộ hoặc theo nhóm, nhập số thực tế, hệ thống tính chênh lệch |
| INV-41 | Chốt kiểm kê tạo bút toán điều chỉnh |
| INV-42 | Tồn kho hiện tại theo chi nhánh, giá trị tồn |
| INV-43 | Thẻ kho: lịch sử biến động từng nguyên liệu |
| INV-44 | Cảnh báo tồn dưới mức tối thiểu |
| INV-45 | Báo cáo nhập–xuất–tồn theo kỳ |
| INV-46 | Báo cáo chênh lệch: tiêu hao lý thuyết (theo định lượng) so với thực tế (theo kiểm kê) |

## Chức năng GĐ 6

| Mã | Chức năng |
|---|---|
| INV-50 | Chuyển kho giữa chi nhánh: yêu cầu → xuất → đang chuyển → nhận, xử lý chênh lệch khi nhận |
| INV-51 | Bán thành phẩm: nguyên liệu được chế biến từ nguyên liệu khác (nước sốt, nhân bánh), lệnh sản xuất |
| INV-52 | Bếp trung tâm cấp hàng cho chi nhánh |
| INV-53 | Đơn đặt hàng nhà cung cấp, gợi ý số lượng đặt theo tồn tối thiểu và mức bán |
| INV-54 | Công nợ nhà cung cấp |
| INV-55 | Lô và hạn sử dụng, xuất theo hạn gần nhất |
| INV-56 | Tự tạm hết món khi nguyên liệu chính hết |

## Quy tắc nghiệp vụ

- Tồn kho lưu theo đơn vị cơ sở, số thập phân cố định (3 chữ số).
- Đơn giá vốn theo đơn vị cơ sở là `numeric(18,4)` (ngoại lệ của nguyên tắc tiền số nguyên, 04); giá trị của một biến động = số lượng × đơn giá, làm tròn về đồng.
- Giá vốn tính theo bình quân gia quyền, cập nhật mỗi lần nhập.
- **Nhập khi tồn bằng 0 hoặc âm:** giá bình quân mới = đơn giá của phiếu nhập (không lấy bình quân với số âm). Phần đã xuất âm trước đó giữ giá lúc xuất; không tính lại ngược.
- **Đảo phiếu nhập (INV-25):** ghi biến động ngược theo đơn giá của chính phiếu đó, rồi tính lại giá bình quân từ tồn còn lại; không tính lại giá vốn của đơn đã bán.
- **Giá vốn và định lượng "tại lúc bán":** job trừ kho dùng định lượng có hiệu lực tại `occurred_at` của đơn (định lượng lưu theo phiên bản có ngày hiệu lực) và giá bình quân **tại lúc job chạy**. Đơn offline về muộn vì vậy dùng đúng định lượng lúc bán, còn giá vốn là giá gần nhất; chấp nhận sai số này.
- Người có `inventory.receive` nhập và thấy đơn giá trên phiếu nhập mình lập; `inventory.view_cost` là quyền xem giá vốn bình quân, giá trị tồn và lãi gộp.
- Sổ kho chỉ ghi thêm. Tồn hiện tại là bảng tổng hợp, cập nhật cùng transaction với sổ.
- Mỗi biến động có nguồn gốc: loại chứng từ + id chứng từ.
- Trừ kho idempotent theo id đơn: xử lý lại không trừ hai lần.
- Thay đổi định lượng chỉ áp dụng cho đơn sau thời điểm thay đổi.
- Kiểm kê: mỗi dòng lưu số đếm và **tồn sổ sách tại lúc nhập số đếm của dòng đó**. Khi chốt, điều chỉnh = số đếm − tồn sổ sách lúc đếm; biến động ghi sau thời điểm đếm (kể cả đơn offline về muộn) cộng trừ bình thường lên tồn sau điều chỉnh. Nên kiểm kê ngoài giờ bán và sau khi mọi POS đã đồng bộ; màn hình kiểm kê cảnh báo nếu còn thiết bị chưa đồng bộ.

## Dữ liệu chính

`ingredients`, `ingredient_units`, `suppliers`, `warehouses`, `recipes` (có `effective_from`), `recipe_items`, `stock_movements` (sổ kho), `stock_levels`, `goods_receipts`, `goods_receipt_items`, `stock_issues`, `stock_counts`, `stock_count_items`.

## Mã quyền

`inventory.view`, `inventory.manage_items`, `inventory.manage_recipes`, `inventory.receive`, `inventory.issue`, `inventory.adjust`, `inventory.count`, `inventory.view_cost`, `supplier.manage`.

## Màn hình Admin

Nguyên liệu · Nhà cung cấp · Định lượng (theo món) · Phiếu nhập · Phiếu xuất huỷ · Kiểm kê · Tồn kho · Thẻ kho · Báo cáo kho.

## Câu hỏi mở

- Có bán thành phẩm tự làm (sốt, nhân) cần quản lý ngay từ GĐ 1 không?
- Chi nhánh tự nhập hàng, hay có kho tổng cấp phát?
