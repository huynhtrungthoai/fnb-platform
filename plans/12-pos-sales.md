# 12. POS bán hàng, offline

Giai đoạn: **GĐ 1 (M3)** · Module API: `orders`, `sync` · Package: `pos-core` · App: `apps/pos` · Liên quan: ca thu ngân [14](14-cash.md), thanh toán [15](15-payments.md), in ấn [18](18-printing.md)

## Mục tiêu

Thu ngân tạo đơn nhanh, ít thao tác, không bị dừng khi mất mạng. Logic tính tiền nằm trong `pos-core` để POS web và POS Android cho cùng kết quả; server tính lại để kiểm chứng.

## Loại đơn

| Loại | Mô tả |
|---|---|
| Ăn tại quán | Gọi món và thanh toán tại quầy, nhận món theo số thứ tự; không gắn bàn (D-26) |
| Mang đi | Thanh toán ngay, có số thứ tự gọi món |
| Giao hàng | Có thông tin khách, địa chỉ, phí giao (nhập tay ở GĐ 1) |

## Vòng đời đơn

Quán gọi món tại quầy và **thanh toán ngay** (D-26): mọi đơn trả tiền trước rồi mới gửi bếp. Đơn có **hai trạng thái độc lập** (D-23), vì thanh toán đi trước chế biến và một đơn đã trả tiền vẫn còn đang làm, còn có thể hoàn một phần:

| Trường | Giá trị |
|---|---|
| `status` (chế biến, phục vụ) | `draft` (nháp) → `sent` (đã gửi bếp) → `served` (đã ra đủ) → `completed` (hoàn tất) · `voided` (đã huỷ) |
| `payment_status` (thanh toán) | `unpaid` → `partially_paid` → `paid` · `partially_refunded` · `refunded` |

| Loại đơn | Trình tự thường gặp |
|---|---|
| Ăn tại quán, mang đi | thanh toán → gửi bếp → gọi số, ra món → hoàn tất |
| Giao hàng | thanh toán (hoặc ghi nhận thu khi giao) → gửi bếp → giao → hoàn tất |
| Online trả trước (21) | thanh toán được xác nhận → gửi bếp |

- Đơn `completed` khi đã ra đủ món **và** `payment_status = paid`.
- "Thanh toán trước khi gửi bếp" là mặc định và bật cho mọi loại đơn. Phục vụ tại bàn trả sau không thuộc GĐ 1 (EXT-47).
- Đơn nháp chưa thanh toán thì chưa xuống bếp và chưa có số thứ tự; huỷ đơn nháp không cần quyền.
- Máy trạng thái của cả hai trường nằm trong `pos-core`.

Món trong đơn có trạng thái riêng: chờ gửi, đã gửi bếp, đang làm, xong, đã ra, đã huỷ.

## Chức năng

### Tạo đơn

| Mã | Chức năng |
|---|---|
| POS-01 | Lưới món theo nhóm, tìm theo tên/mã, món hay bán lên đầu |
| POS-02 | Chọn biến thể và tuỳ chọn, kiểm tra ràng buộc tối thiểu/tối đa |
| POS-03 | Sửa số lượng, ghi chú từng món, ghi chú đơn |
| POS-04 | Sửa lại tuỳ chọn của món chưa gửi bếp |
| POS-05 | Lưu đơn tạm, mở nhiều đơn song song |
| POS-06 | Gắn khách hàng vào đơn (tìm theo số điện thoại, tạo nhanh) |
| POS-07 | Số khách của đơn (tuỳ chọn, cho báo cáo) |
| POS-08 | Nhập giá lúc bán cho món thời giá |
| POS-09 | Số thứ tự gọi món: cấp khi đơn thanh toán xong, đếm lại từ 1 mỗi ngày kinh doanh theo chi nhánh (khi offline thêm tiền tố thiết bị để không trùng), in lớn trên bill và phiếu chế biến |

### Thêm món vào đơn (POS-02, POS-04)

Mockup: `ui-mockup/pos-sale.dc.html` (bấm được) và `pos-modifier.dc.html` (hộp chọn ở trạng thái tĩnh).

| Tình huống | Hành vi |
|---|---|
| Chạm món chỉ có một biến thể và không có nhóm tuỳ chọn | Thêm thẳng vào đơn, số lượng 1 |
| Chạm món có từ hai biến thể hoặc có nhóm tuỳ chọn | Mở hộp chọn tuỳ chọn (`Dialog` chứa `ModifierGroupPicker`); chưa thêm gì vào đơn. Ô món ghi giá dạng "Từ …" |
| Biến thể (size) | Hiện như nhóm đầu tiên, bắt buộc chọn 1, chọn sẵn biến thể mặc định (MENU-11) |
| Nhóm có tối đa = 1 | Chọn một: chạm tuỳ chọn khác thì đổi; nhóm không bắt buộc thì chạm lại để bỏ chọn |
| Nhóm có tối đa > 1 | Chọn nhiều; đủ tối đa thì các tuỳ chọn còn lại vô hiệu cho tới khi bỏ bớt |
| Tuỳ chọn "mặc định được chọn" (MENU-21) | Chọn sẵn khi mở hộp; nhóm bắt buộc không có mặc định thì thu ngân phải chọn |
| Tuỳ chọn tạm hết | Vẫn hiện, mờ, ghi "Tạm hết", không chọn được |
| Nút "Thêm vào đơn" | Hiện thành tiền của dòng (giá biến thể + tuỳ chọn, nhân số lượng). Còn nhóm bắt buộc chưa đủ tối thiểu thì nút vô hiệu và nhóm đó ghi "chưa chọn" |
| Trong hộp còn có | Số lượng, ghi chú món (chọn nhanh từ mẫu) |
| Huỷ hoặc đóng hộp | Không thêm gì vào đơn |
| Trùng cấu hình | Cùng món, cùng biến thể, cùng tuỳ chọn, cùng ghi chú với một dòng chưa gửi bếp thì cộng số lượng; khác thì tạo dòng mới |
| Sửa lại (POS-04) | Dòng chưa gửi bếp có nút "Sửa tuỳ chọn": mở lại hộp với lựa chọn hiện tại, nút chính thành "Cập nhật" |
| Số trên ô món | Tổng số lượng của mọi dòng thuộc món đó |

### Giảm giá và phụ thu

| Mã | Chức năng |
|---|---|
| POS-10 | Giảm giá theo món: theo % hoặc số tiền, cần quyền, có lý do |
| POS-11 | Giảm giá cả đơn: theo % hoặc số tiền |
| POS-12 | Phí dịch vụ theo % (cấu hình chi nhánh), bật/tắt theo loại đơn |
| POS-13 | VAT: quán là hộ kinh doanh, giá đã gồm thuế (D-28) nên mặc định **tắt**, thuế suất 0%, bill không có dòng VAT. Bộ tính vẫn hỗ trợ giá đã gồm và chưa gồm thuế theo cấu hình chi nhánh, bật khi cần |
| POS-14 | Phụ thu tuỳ ý (ví dụ phí hộp, phí giao) |
| POS-15 | Làm tròn tiền theo cấu hình (ví dụ tới 500đ, 1.000đ) |

### Huỷ và trả

| Mã | Chức năng |
|---|---|
| POS-20 | Huỷ món chưa gửi bếp: không cần quyền |
| POS-21 | Huỷ món đã gửi bếp: cần quyền, bắt buộc lý do, in phiếu huỷ xuống bếp |
| POS-22 | Huỷ cả đơn chưa thanh toán |
| POS-23 | Hoàn tiền đơn đã thanh toán (toàn bộ hoặc một phần): cần quyền, ghi sổ quỹ, chọn có hoàn kho hay không |
| POS-24 | Danh mục lý do huỷ/giảm giá cấu hình ở Admin |

### Thanh toán (chi tiết ở tài liệu 15)

| Mã | Chức năng |
|---|---|
| POS-30 | Thanh toán tiền mặt, tính tiền thừa, gợi ý mệnh giá |
| POS-31 | Thanh toán nhiều phương thức cho một đơn |
| POS-32 | In tạm tính trước khi thanh toán |

### Tra cứu

| Mã | Chức năng |
|---|---|
| POS-40 | Danh sách đơn trong ca/ngày, lọc theo trạng thái, loại đơn |
| POS-41 | Xem chi tiết, in lại bill (đánh dấu "bản in lại") |

### Ca thu ngân trên POS

Mở ca, nộp/rút tiền, đóng ca và đếm tiền, in báo cáo ca đều làm trên POS. Đặc tả: [14-cash.md](14-cash.md) (CASH-01 → CASH-10 và mục "Luồng trên POS").

### In ấn

Quản lý máy in trên POS (Bluetooth, LAN), mẫu in, khổ giấy K57 và K80, hàng đợi in: [18-printing.md](18-printing.md) (PRINT-01 → PRINT-26).

### Offline

| Mã | Chức năng |
|---|---|
| SYNC-01 | Tải snapshot thực đơn, bàn, cấu hình, nhân viên (PIN đã băm) vào DB cục bộ |
| SYNC-02 | Thấy `version` mới thì tải lại toàn bộ snapshot của chi nhánh (11: MENU-40); không đồng bộ từng phần |
| SYNC-03 | Mọi thao tác ghi đi qua outbox, có idempotency key |
| SYNC-04 | Tự đẩy outbox khi có mạng, theo đúng thứ tự `seq`, thử lại có giãn cách; xử lý lệnh lỗi theo 04 mục "Quy tắc khi đồng bộ" |
| SYNC-05 | Hiển thị trạng thái: online/offline, số lệnh chờ đồng bộ, lệnh lỗi |
| SYNC-06 | Sinh số hoá đơn cục bộ theo thiết bị; bộ đếm khôi phục từ server khi thiết bị bị xoá dữ liệu |
| SYNC-07 | Server xử lý đúng một lần, trả về kết quả từng lệnh |
| SYNC-08 | PWA: cài được, mở được khi không có mạng |

## Quy tắc tính tiền

Thứ tự cố định, cài trong `pos-core` và kiểm tra lại ở server:

1. Tiền món = (giá biến thể + tổng giá tuỳ chọn) × số lượng
2. Trừ giảm giá theo món
3. Cộng các món thành tạm tính
4. Trừ khuyến mãi tự động, voucher và điểm đổi (GĐ 3; bước này có sẵn từ M3, mặc định bằng 0)
5. Trừ giảm giá đơn
6. Cộng phí dịch vụ
7. Tính VAT (tách ra nếu giá đã gồm thuế)
8. Cộng phụ thu
9. Làm tròn

Chi tiết từng bước:

| Điểm | Quy định |
|---|---|
| Phân bổ giảm giá đơn (bước 4, 5) | Chia về từng món theo tỷ lệ tiền món, làm tròn xuống tới đồng; phần dư cộng vào món có tiền lớn nhất. Tổng phân bổ luôn bằng đúng số giảm |
| Thuế theo món | Món có thuế suất riêng (MENU-14) tính thuế trên tiền món sau phân bổ giảm giá; VAT của đơn là tổng theo từng thuế suất |
| VAT (bước 7) | Tắt theo D-28: thuế suất 0%, bước này cho kết quả 0 và không in ra bill. Khi bật (chuyển thành doanh nghiệp): phí dịch vụ chịu VAT theo thuế suất chi nhánh, phụ thu có cờ "chịu thuế" theo từng loại |
| Làm tròn (bước 9) | Chỉ áp dụng cho phần trả bằng tiền mặt; chuyển khoản trả đúng số. Chênh lệch làm tròn lưu thành dòng riêng `rounding_amount`, có trong báo cáo (17: RPT-15) |
| Tip (PAY-05) | Không nằm trong tổng đơn; ghi ở thanh toán |
| Hoàn một phần (POS-23) | Số hoàn của một món = tiền món sau phân bổ giảm giá + thuế và phí dịch vụ tương ứng của món đó; không hoàn phần làm tròn |

Kiểm chứng ở server:

- Mỗi lệnh tạo/sửa đơn mang `catalogVersion` (phiên bản thực đơn POS đang dùng) và `calcVersion` (phiên bản bộ tính của `pos-core`). Server tính lại bằng đúng giá của phiên bản thực đơn đó.
- **Đang online:** server tính ra khác client thì từ chối lệnh với mã `ORDER_TOTAL_MISMATCH`; POS tải lại thực đơn và tính lại. Không nhận số của client.
- **Lệnh offline qua `/sync/push`:** nhận số của client (bill đã in cho khách), đánh dấu đơn để kiểm tra (RPT-34).
- Server và POS dùng chung `pos-core` nên việc tính lại chủ yếu bắt lệch phiên bản và dữ liệu bị sửa, không bắt lỗi logic. Lỗi logic bắt bằng bộ ví dụ tính tiền cố định trong unit test (`totals.test.ts`).

## Quy tắc nghiệp vụ

- Phải có ca thu ngân đang mở mới thanh toán được.
- Đơn đã thanh toán không sửa được; chỉ hoàn tiền.
- Mọi lần huỷ món đã gửi bếp, giảm giá, hoàn tiền đều ghi audit log kèm người duyệt.
- Giảm giá có hạn mức theo nhóm quyền (ví dụ thu ngân tối đa 10%); vượt thì xin duyệt tại chỗ (06 mục 5, 6).
- Khi offline: không thanh toán QR, không tra cứu khách hàng mới, không xem đơn của máy khác. Quy tắc xung đột khi đồng bộ: 04 mục "Offline POS".
- Đơn lưu `business_date` (ngày kinh doanh) tại lúc tạo, tính theo giờ chốt ngày đang áp dụng; đổi giờ chốt ngày sau này không làm đổi ngày của đơn cũ.
- Gắn khách vào đơn (POS-06) ở GĐ 1 chỉ lưu tên và số điện thoại trên đơn; bảng `customers` có từ GĐ 3 và gộp theo số điện thoại (21: CUS-06).
- Hoá đơn điện tử làm sau, ở GĐ 6 (D-27, EXT-20). Đơn vẫn lưu thuế theo từng thuế suất và số hoá đơn, để thêm sau không phải đổi dữ liệu.

## Dữ liệu chính

`orders` (có `status`, `payment_status`, `business_date`, `catalog_version`, `calc_version`, `rounding_amount`), `order_items`, `order_item_modifiers`, `order_discounts`, `order_surcharges`, `order_events` (lịch sử thay đổi), `void_reasons`, `sync_commands` (idempotency), `invoice_counters`.

## Mã quyền

`order.create`, `order.view`, `order.print_bill`, `order.discount_item`, `order.discount_order`, `order.void_item`, `order.void_order`, `order.refund`, `order.reprint`, `order.open_drawer`.

## Màn hình POS

Bán hàng (lưới món + giỏ) · Chọn tuỳ chọn · Thanh toán · Danh sách đơn · Chi tiết đơn · Mở ca · Nộp/rút tiền · Đóng ca và đếm tiền (14) · Máy in, hàng đợi in, xem trước mẫu in (18) · Cài đặt thiết bị · Trạng thái đồng bộ.

## Câu hỏi mở

- Có thu phí dịch vụ không? (O-05; thuế đã chốt ở D-28)
- Máy in đang dùng loại gì? (O-03)
- Có cần màn hình phụ hiển thị cho khách không?
