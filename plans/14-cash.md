# 14. Ca thu ngân và sổ quỹ

Giai đoạn: **GĐ 1 (M3)** · Module API: `cash`

## Mục tiêu

Biết chính xác tiền mặt trong két ở mỗi ca, phát hiện thừa thiếu ngay lúc giao ca, và có sổ thu chi của từng chi nhánh.

Lưu ý: "ca thu ngân" (ca két tiền) khác "ca làm việc" của nhân viên (tài liệu 20).

## Chức năng

### Ca thu ngân

| Mã | Chức năng |
|---|---|
| CASH-01 | Mở ca: chọn thiết bị/két, nhập tiền đầu ca |
| CASH-02 | Mỗi thiết bị một ca đang mở; nhiều nhân viên bán chung một ca bằng PIN |
| CASH-03 | Xem nhanh trong ca: doanh thu, số đơn, tiền mặt dự kiến trong két |
| CASH-04 | Nộp tiền/rút tiền giữa ca (rút bớt tiền két, bổ sung tiền lẻ) |
| CASH-05 | Đóng ca: đếm tiền theo mệnh giá, hệ thống tính tiền dự kiến và chênh lệch |
| CASH-06 | Bắt buộc ghi chú khi chênh lệch vượt ngưỡng cấu hình |
| CASH-07 | In báo cáo ca: doanh thu theo phương thức, giảm giá, huỷ, hoàn, thu chi, chênh lệch |
| CASH-08 | Không đóng được ca khi còn đơn chưa thanh toán, trừ khi chuyển sang ca sau (cần quyền `cash.carry_over_orders`, xin duyệt tại chỗ được) |
| CASH-09 | Quản lý xem và duyệt ca đã đóng ở Admin |
| CASH-10 | Mở và đóng ca được khi offline, đồng bộ sau |

### Sổ quỹ

| Mã | Chức năng |
|---|---|
| CASH-20 | Phiếu thu, phiếu chi: số tiền, loại, người nộp/nhận, ghi chú, ảnh chứng từ |
| CASH-21 | Danh mục loại thu chi (tiền điện, mua nguyên liệu lẻ, thu khác) |
| CASH-22 | Nhiều quỹ theo chi nhánh: tiền mặt tại quầy, két chính, tài khoản ngân hàng |
| CASH-23 | Chuyển tiền giữa các quỹ (nộp tiền két về két chính, nộp ngân hàng) |
| CASH-24 | Tự ghi sổ từ bán hàng, hoàn tiền, thanh toán nhà cung cấp, trả lương |
| CASH-25 | Sổ quỹ theo ngày: tồn đầu, thu, chi, tồn cuối, lọc theo quỹ và loại |
| CASH-26 | Huỷ phiếu bằng bút toán đảo, không xoá |

## Luồng trên POS

| Bước | Màn hình | Chi tiết |
|---|---|---|
| Mở ca | Mở ca | Hiện khi thiết bị chưa có ca đang mở. Nhập tiền đầu ca (gợi ý số cuối ca trước), xác nhận. Chưa mở ca thì vẫn tạo đơn và gửi bếp được, nhưng không thanh toán được |
| Trong ca | Thanh trạng thái | Hiện ca đang mở, người mở, giờ mở. Bấm vào xem nhanh doanh thu, số đơn (CASH-03); tiền mặt dự kiến chỉ hiện với quyền `cash.view_expected` |
| Nộp/rút | Nộp/rút tiền | Chọn loại, số tiền, lý do; vượt hạn mức thì xin duyệt tại chỗ; in phiếu nộp/rút (18: PRINT-20) |
| Đóng ca | Đóng ca và đếm tiền | Kiểm tra đơn chưa thanh toán (CASH-08) → đếm theo mệnh giá → hiện chênh lệch (sau khi nhập, nếu bật đếm mù) → ghi chú nếu vượt ngưỡng → xác nhận qua `ConfirmDialog` kiểu nguy hiểm → in báo cáo ca |
| Sau khi đóng | Mở ca | Thiết bị quay về màn hình mở ca; ca vừa đóng chờ duyệt ở Admin |

Mở và đóng ca chạy được khi offline (CASH-10): lệnh đi qua outbox như mọi thao tác ghi khác.

## Quy tắc nghiệp vụ

- Tiền mặt dự kiến = đầu ca + bán tiền mặt − hoàn tiền mặt + nộp vào − rút ra − chi tiền mặt + tip tiền mặt chưa trả cho nhân viên.
- Sổ quỹ chỉ ghi thêm. Sửa sai bằng phiếu điều chỉnh, có người duyệt.
- Đếm mù (thu ngân không thấy số dự kiến trước khi nhập số đếm): bật/tắt theo cấu hình.
- Ca đã duyệt thì khoá, không điều chỉnh được nữa.
- Doanh thu chuyển khoản/QR ghi vào quỹ ngân hàng, không tính vào tiền két.

### Ca, két và thiết bị

- Ca gắn với **két tiền**, và mỗi két gắn với một thiết bị thu ngân. Thiết bị không có két (máy cầm tay của phục vụ, màn hình bếp) **không mở ca**: tạo đơn và gửi bếp được, không nhận thanh toán. Đơn của các máy đó được thanh toán tại một thiết bị thu ngân và tính vào ca của thiết bị ấy.
- Mỗi két tương ứng một quỹ loại "tiền mặt tại quầy" trong `cash_accounts`. Mở ca không tạo bút toán; mỗi lần thu, hoàn, nộp, rút trong ca ghi một dòng `cash_entries` vào quỹ đó kèm `cash_session_id`.
- Rút tiền két về két chính là một phiếu chuyển quỹ (CASH-23), không phải phiếu chi.

### Nộp/rút trong ca và phiếu thu chi

| | Nộp/rút trong ca (`cash.pay_in_out`) | Phiếu thu chi (`cashbook.create`) |
|---|---|---|
| Làm ở | POS, trong ca đang mở | Admin |
| Quỹ | Chỉ két của ca | Mọi quỹ của chi nhánh |
| Người làm | Thu ngân (có hạn mức), quản lý | Quản lý, kế toán |
| Kết quả | Một dòng `cash_entries` gắn với ca, tính vào tiền mặt dự kiến | Một dòng `cash_entries` không gắn ca |

### Ca và đồng bộ offline

- Mỗi thiết bị đánh số lệnh outbox tăng dần. Lệnh đóng ca mang số của lệnh cuối cùng thuộc ca đó.
- Ca chỉ chuyển sang "chờ duyệt" khi server đã nhận đủ mọi lệnh tới số ấy. Trước đó ca ở trạng thái "đang đồng bộ" và không duyệt được.
- Lệnh thuộc ca đã duyệt mà về muộn (trường hợp hiếm, do lỗi): vẫn nhận, ghi thành phiếu điều chỉnh ngoài ca và hiện trong báo cáo kiểm soát.

## Dữ liệu chính

`cash_sessions` (ca), `cash_session_counts` (đếm theo mệnh giá), `cash_accounts` (quỹ), `cash_entries` (sổ cái), `cash_categories`.

## Mã quyền

`cash.open_session`, `cash.close_session`, `cash.pay_in_out`, `cash.carry_over_orders`, `cash.view_expected`, `cash.approve_session`, `cashbook.view`, `cashbook.create`, `cashbook.void`, `cashbook.manage_accounts`.

## Màn hình

- POS: Mở ca · Xem nhanh ca · Nộp/rút tiền · Đóng ca và đếm tiền · Báo cáo ca (xem và in lại).
- Admin: Danh sách ca và duyệt · Sổ quỹ · Phiếu thu chi · Quỹ và loại thu chi.

## Câu hỏi mở

- Có muốn đếm mù khi đóng ca không?
- Ngưỡng chênh lệch cho phép là bao nhiêu?
