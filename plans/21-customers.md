# 21. Khách hàng: đặt món, đặt bàn, thành viên

Giai đoạn: **GĐ 3** · Module API: `customers`, `online-orders`, `reservations`, `promotions`, `loyalty` · App: `apps/customer-web`

**Plan này quá rộng cho một mốc** (năm module, khoảng 60 chức năng). Khi tới GĐ 3, tách thành plan riêng trước khi chia task: `22` đặt món online, `23` gọi món tại bàn bằng QR, `24` đặt bàn, `25` khuyến mãi, `26` thành viên; file này giữ phần tài khoản khách. Quán bán tại quầy, thanh toán ngay (D-26): đặt món online (đến lấy, giao hàng), khuyến mãi và thành viên làm trước; gọi món bằng QR tại bàn (QR-01 → 07) và đặt bàn (RSV-01 → 12) cần phần bàn (EXT-47) nên xếp sau, không buộc làm.

## Mục tiêu

Khách tự đặt món và đặt bàn không cần gọi điện. Đơn của khách đi thẳng vào POS và bếp như một đơn bình thường. Quán có dữ liệu khách để chăm sóc và khuyến mãi.

## Chức năng

### Tài khoản khách

| Mã | Chức năng |
|---|---|
| CUS-01 | Đăng ký bằng số điện thoại, mã PIN 6 số, email và tên; đăng nhập bằng số điện thoại + PIN (D-30) |
| CUS-07 | Quên PIN: nhập số điện thoại, hệ thống gửi liên kết đặt lại tới email đã đăng ký; đổi PIN và đổi email trong trang tài khoản (cần nhập PIN hiện tại) |
| CUS-02 | Hồ sơ: tên, ngày sinh, sổ địa chỉ |
| CUS-03 | Đặt không cần tài khoản (chỉ nhập tên và số điện thoại) |
| CUS-04 | Lịch sử đơn, đặt lại đơn cũ |
| CUS-05 | Admin: danh sách khách, lịch sử mua, tổng chi tiêu, ghi chú, gắn nhãn |
| CUS-06 | Gộp khách trùng số điện thoại giữa POS và online |

### Đặt món trực tuyến

| Mã | Chức năng |
|---|---|
| ORD-01 | Chọn chi nhánh (gợi ý theo vị trí), xem giờ mở cửa |
| ORD-02 | Thực đơn theo chi nhánh: ảnh, giá, tạm hết; chọn biến thể và tuỳ chọn như POS |
| ORD-03 | Giỏ hàng, ghi chú món, ghi chú đơn |
| ORD-04 | Hình thức: giao hàng, đến lấy, hẹn giờ |
| ORD-05 | Khu vực giao và phí giao theo khoảng cách/khu vực; đơn tối thiểu |
| ORD-06 | Thanh toán: QR chuyển khoản trực tuyến, hoặc trả khi nhận |
| ORD-07 | Đơn vào POS chi nhánh: âm báo, nhân viên xác nhận hoặc từ chối kèm lý do |
| ORD-08 | Tự huỷ nếu quá thời gian không ai xác nhận |
| ORD-09 | Theo dõi trạng thái realtime: chờ xác nhận → đang làm → sẵn sàng/đang giao → hoàn tất |
| ORD-10 | Tạm ngưng nhận đơn online theo chi nhánh (quá tải) |
| ORD-11 | Thông báo cho khách khi đơn đổi trạng thái: thông báo đẩy qua Firebase (web, app), ZNS cho khách dùng Zalo (D-33) |
| ORD-12 | Đánh giá đơn sau khi hoàn tất |

### Gọi món tại bàn bằng QR

| Mã | Chức năng |
|---|---|
| QR-01 | Quét QR trên bàn mở thực đơn của đúng chi nhánh và bàn |
| QR-02 | Khách gọi món, đơn nhập vào phiên của bàn; nhiều người cùng bàn gọi chung |
| QR-03 | Chế độ duyệt: nhân viên xác nhận trước khi gửi bếp, hoặc gửi thẳng (cấu hình) |
| QR-04 | Gọi nhân viên, yêu cầu thanh toán từ điện thoại |
| QR-05 | Xem món đã gọi và tạm tính |
| QR-06 | Tự thanh toán bằng QR tại bàn |
| QR-07 | Chống lạm dụng: mã phiên đổi sau mỗi lượt khách, giới hạn theo vị trí/thời gian |

### Đặt bàn

| Mã | Chức năng |
|---|---|
| RSV-01 | Khách chọn chi nhánh, ngày, giờ, số người, ghi chú (sinh nhật, ghế trẻ em) |
| RSV-02 | Kiểm tra chỗ trống theo sức chứa, khung giờ, thời lượng ngồi mặc định |
| RSV-03 | Cấu hình: khung giờ nhận đặt, đặt trước tối thiểu/tối đa, số khách tối đa mỗi khung |
| RSV-04 | Xác nhận tự động hoặc nhân viên duyệt |
| RSV-05 | Đặt cọc qua QR cho nhóm đông hoặc giờ cao điểm (tuỳ chọn), trừ vào hoá đơn |
| RSV-06 | Nhắc lịch trước giờ đến, khách xác nhận hoặc huỷ qua liên kết |
| RSV-07 | Nhân viên tạo đặt bàn hộ khách gọi điện |
| RSV-08 | Lịch đặt bàn theo ngày ở Admin/POS; gán bàn cụ thể |
| RSV-09 | Khách đến: chuyển đặt bàn thành phiên bàn |
| RSV-10 | Đánh dấu không đến, chính sách giữ cọc, tự nhả bàn sau thời gian chờ |
| RSV-11 | Sơ đồ bàn POS hiện bàn sắp có khách đặt |
| RSV-12 | Đặt món trước kèm đặt bàn |

### Khuyến mãi

| Mã | Chức năng |
|---|---|
| PROMO-01 | Voucher: giảm % hoặc số tiền, đơn tối thiểu, giảm tối đa, thời hạn, số lượt, giới hạn mỗi khách |
| PROMO-02 | Phạm vi áp dụng: chi nhánh, kênh (POS, online), món/nhóm món, khung giờ, ngày trong tuần |
| PROMO-03 | Khuyến mãi tự động không cần mã: mua X tặng Y, giảm theo tổng đơn, giờ vàng |
| PROMO-04 | Phát voucher cho khách: theo nhãn, sinh nhật, khách mới |
| PROMO-05 | Áp voucher trên POS (quét mã) và online |
| PROMO-06 | Quy tắc cộng dồn và ưu tiên |
| PROMO-07 | Báo cáo hiệu quả: lượt dùng, doanh thu kèm theo, chi phí giảm giá |

### Thành viên

| Mã | Chức năng |
|---|---|
| LOY-01 | Tích điểm theo giá trị đơn, cấu hình tỷ lệ |
| LOY-02 | Dùng điểm để giảm giá hoặc đổi quà/voucher |
| LOY-03 | Hạng thành viên theo chi tiêu, quyền lợi theo hạng |
| LOY-04 | Sổ điểm chỉ ghi thêm; điểm hết hạn theo cấu hình |
| LOY-05 | Tích và dùng điểm tại POS bằng số điện thoại |

## Quy tắc nghiệp vụ

- Đơn online dùng chung bảng đơn với POS, khác kênh (`channel`). Bếp, kho, báo cáo xử lý giống nhau.
- Giá và tình trạng món lấy theo chi nhánh tại lúc đặt; server tính lại tiền, không tin số từ client.
- Đơn trả trước chỉ gửi bếp sau khi thanh toán được xác nhận.
- Voucher được giữ chỗ khi tạo đơn, hoàn lại khi đơn huỷ.
- Hoàn điểm và thu hồi điểm khi hoàn tiền.
- Dữ liệu cá nhân của khách: chỉ thu thập thứ cần dùng, khách xoá được tài khoản; lưu lại thời điểm và nội dung khách đồng ý (quy định bảo vệ dữ liệu cá nhân, rà với người tư vấn pháp lý trước khi mở GĐ 3).
- Tài khoản khách (D-30):

| Mục | Quy định |
|---|---|
| Định danh | Số điện thoại, chuẩn hoá về một dạng (`+84…`), duy nhất. Là khoá gộp cho web, app, Zalo và POS |
| PIN | Đúng 6 chữ số, đặt tuỳ ý; lưu mã băm Argon2id |
| Email | Bắt buộc khi đăng ký, dùng để đặt lại PIN. Thư gửi qua Brevo (D-33). Gửi thư xác nhận; email chưa xác nhận vẫn đăng nhập được nhưng trang tài khoản nhắc xác nhận |
| Đặt lại PIN | Liên kết dùng một lần, hết hạn sau 30 phút; trả lời giống nhau dù số điện thoại có tồn tại hay không; đặt lại xong thì thu hồi mọi phiên |
| Sai PIN | 5 lần liên tiếp thì khoá tài khoản; mở bằng cách đặt lại PIN qua email, hoặc nhân viên có `customer.manage` mở trong Admin |
| Giới hạn tần suất | Đăng nhập, đăng ký và gửi thư đặt lại đều giới hạn theo IP và theo số điện thoại |
| Zalo | Đăng nhập bằng tài khoản Zalo, lấy số điện thoại từ Zalo (đã xác minh); không cần PIN trong Mini App. Muốn đăng nhập web hay app bằng số đó thì đặt PIN và email trong trang tài khoản |

- **Số điện thoại tự đăng ký chưa được xác minh** (không còn OTP). Để người lạ không đăng ký số của người khác rồi lấy điểm và lịch sử mua tích ở POS: tài khoản tự đăng ký chỉ được gộp với bản ghi khách có sẵn của số đó (CUS-06) sau khi số được xác minh, bằng đăng nhập Zalo hoặc nhân viên xác nhận tại quầy. Trước đó tài khoản vẫn đặt món được, tích điểm mới được, chưa dùng được điểm cũ.
- Khuyến mãi, voucher và điểm đổi được tính trong `pos-core` tại bước 4 của quy tắc tính tiền (12); không tính riêng ở web khách hay ở API.
- Dùng điểm tại POS bằng số điện thoại (LOY-05) cần khách xác nhận (nhập PIN của khách trên POS hoặc quét thẻ thành viên) khi vượt một ngưỡng điểm cấu hình được.
- QR in trên bàn (TABLE-04) là mã cố định; khi quét, server cấp mã phiên gắn với phiên bàn đang mở, và mã phiên hết hiệu lực khi bàn thanh toán xong (QR-07).

## Dữ liệu chính

`customers` (có `phone`, `email`, `pin_hash`, `phone_verified_at`, `email_verified_at`), `customer_addresses`, `customer_reset_tokens`, `delivery_zones`, `online_order_settings`, `reservations`, `reservation_settings`, `vouchers`, `voucher_grants`, `voucher_redemptions`, `promotions`, `loyalty_accounts`, `loyalty_entries`, `loyalty_tiers`, `reviews`.

## Mã quyền

`customer.view`, `customer.manage`, `online_order.accept`, `online_order.settings`, `reservation.view`, `reservation.manage`, `reservation.settings`, `promotion.manage`, `loyalty.manage`, `loyalty.adjust`.

## Màn hình

- Web khách: Trang chủ/chọn chi nhánh · Thực đơn · Chi tiết món · Giỏ · Thanh toán · Theo dõi đơn · Đặt bàn · Tài khoản · Voucher và điểm · Trang gọi món tại bàn.
- Admin: Khách hàng · Cấu hình đặt món online · Khu vực giao · Đặt bàn (lịch, cấu hình) · Voucher và khuyến mãi · Thành viên.
- POS: Đơn online chờ xác nhận · Lịch đặt bàn hôm nay · Áp voucher và điểm.

## Câu hỏi mở

- Giao hàng do quán tự giao hay gọi đối tác (Ahamove, Grab)?
- Đặt bàn có cần đặt cọc không?
