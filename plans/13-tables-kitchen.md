# 13. Bếp (KDS) và bàn

Giai đoạn: **GĐ 1 (M4)** · Module API: `tables`, `kitchen`, `realtime`

**Phạm vi GĐ 1 (D-26):** quán gọi món tại quầy và thanh toán ngay, nên M4 **chỉ làm phần bếp** (KDS-01 → KDS-27). Toàn bộ phần bàn (TABLE-01 → TABLE-19) **hoãn sang GĐ 6** (EXT-47); đặc tả giữ lại dưới đây để dùng khi cần. Phiếu chế biến hiện **số thứ tự gọi món** (12: POS-09) thay cho tên bàn.

## Mục tiêu

Bếp và bar nhận đúng món của mình ngay khi đơn thanh toán xong, theo thứ tự, không sót; món xong thì quầy biết để gọi số. (Hoãn: phục vụ tại bàn, nhìn sơ đồ biết bàn nào trống, bàn nào đang chờ món.)

## Chức năng

### Khu vực và bàn (hoãn, EXT-47)

| Mã | Chức năng |
|---|---|
| TABLE-01 | Tạo khu vực theo chi nhánh (Tầng 1, Sân vườn, Phòng lạnh) |
| TABLE-02 | Tạo bàn: tên/số, sức chứa, khu vực; tạo hàng loạt (Bàn 1–20) |
| TABLE-03 | Sắp xếp sơ đồ bàn bằng kéo thả trên lưới |
| TABLE-04 | Tạo mã QR cho từng bàn (dùng cho khách tự gọi món ở GĐ 3) |
| TABLE-05 | Tạm khoá bàn (hỏng, giữ chỗ) |

### Thao tác bàn trên POS (hoãn, EXT-47)

| Mã | Chức năng |
|---|---|
| TABLE-10 | Sơ đồ bàn realtime: trống, có khách, chờ món, đã ra đủ, yêu cầu thanh toán, đã đặt trước |
| TABLE-11 | Hiển thị trên bàn: số khách, thời gian ngồi, tổng tiền tạm tính |
| TABLE-12 | Mở bàn, gọi món, gọi thêm nhiều đợt |
| TABLE-13 | Chuyển bàn |
| TABLE-14 | Gộp bàn (gộp đơn) |
| TABLE-15 | Tách đơn: chuyển một số món sang đơn/bàn khác |
| TABLE-16 | Tách thanh toán: chia đều theo số người hoặc theo món |
| TABLE-17 | Chuyển món giữa các bàn |
| TABLE-18 | Khoá đơn khi một máy đang thao tác, tránh hai máy sửa cùng lúc. Khoá tự hết sau 60 giây không có thao tác; người có `table.operate` giành lại khoá được, máy kia nhận thông báo |
| TABLE-19 | Tách bàn đã gộp: chọn món về lại từng bàn, hoặc trả các bàn phụ về trống |

### Trạm chế biến

| Mã | Chức năng |
|---|---|
| KDS-01 | Tạo trạm theo chi nhánh: Bếp nóng, Bếp nguội, Bar |
| KDS-02 | Định tuyến: món → trạm (theo món, mặc định theo nhóm món) |
| KDS-03 | Mỗi trạm chọn nhận phiếu bằng máy in, màn hình, hoặc cả hai |

### Phiếu chế biến

| Mã | Chức năng |
|---|---|
| KDS-10 | Gửi bếp tự động khi đơn thanh toán xong: tách món của đơn thành phiếu theo trạm |
| KDS-11 | In phiếu chế biến: số thứ tự, loại đơn (ăn tại quán/mang đi/giao), giờ gọi, món, tuỳ chọn, ghi chú in đậm |
| KDS-12 | Đánh dấu ưu tiên, gọi gấp, "ra món sau" |
| KDS-13 | In phiếu huỷ khi món đã gửi bị huỷ |
| KDS-14 | In lại phiếu |

### Màn hình bếp

| Mã | Chức năng |
|---|---|
| KDS-20 | Hiển thị phiếu theo thứ tự thời gian, lọc theo trạm |
| KDS-21 | Đổi trạng thái theo món hoặc cả phiếu: chờ → đang làm → xong |
| KDS-22 | Cảnh báo màu khi phiếu quá thời gian (cấu hình theo trạm) |
| KDS-23 | Chế độ xem gộp: tổng số lượng từng món đang chờ |
| KDS-24 | Đơn xong đủ món thì POS ở quầy nhận thông báo kèm số thứ tự để gọi khách |
| KDS-25 | Xem lại phiếu đã xong, hoàn tác |
| KDS-26 | Bếp báo tạm hết món ngay trên màn hình |
| KDS-27 | Âm báo khi có phiếu mới |

## Quy tắc nghiệp vụ

- Một bàn chỉ có một phiên đang mở. Gộp bàn thì các bàn cùng trỏ về một đơn.
- Chỉ món chưa gửi bếp mới được sửa tự do. Sau khi gửi, thay đổi là huỷ và gọi lại.
- Chuyển bàn không gửi lại phiếu bếp, nhưng bếp thấy tên bàn mới.
- Thanh toán xong thì bàn về trạng thái trống.
- Trạng thái bàn: trống, có khách, chờ món, đã ra đủ, yêu cầu thanh toán, đã đặt trước, tạm khoá. Màu của từng trạng thái: 03 mục 2.3.
- Khoá đơn (TABLE-18) cần mạng. Khi offline, thiết bị chỉ sửa đơn do chính nó tạo (04 mục "Quy tắc khi đồng bộ").
- Khi mất mạng: máy POS vẫn in phiếu bếp trực tiếp ra máy in LAN; màn hình bếp không nhận phiếu mới cho tới khi có mạng. Vì vậy chi nhánh dùng KDS nên có máy in bếp dự phòng.

## Dữ liệu chính

`areas`, `tables`, `table_sessions`, `kitchen_stations`, `product_stations`, `kitchen_tickets`, `kitchen_ticket_items`.

## Sự kiện realtime

Quy tắc khi mất kết nối socket: 04 mục "Realtime".

`table.updated`, `order.updated`, `ticket.created`, `ticket.updated`, `item.ready`, `product.availability_changed`.

## Mã quyền

`table.manage` (cấu hình), `table.operate` (mở, chuyển, gộp, tách), `kitchen.view`, `kitchen.update`, `kitchen.manage_stations`.

## Màn hình

- Admin: Khu vực và bàn · Thiết kế sơ đồ · Trạm chế biến và định tuyến · In mã QR bàn.
- POS: Sơ đồ bàn · Chi tiết bàn · Hộp thoại chuyển/gộp/tách.
- KDS: Bảng phiếu · Xem gộp · Lịch sử.

## Để sau

Toàn bộ phần bàn (EXT-47). Đặt bàn trước và khách tự gọi món bằng QR tại bàn (21) phụ thuộc phần bàn nên cũng chờ EXT-47. Màn hình gọi số cho khách (EXT-40), ra món theo lượt (khai vị → món chính → tráng miệng).

## Câu hỏi mở

- Bếp muốn dùng màn hình, phiếu in, hay cả hai?
