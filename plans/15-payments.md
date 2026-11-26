# 15. Thanh toán và QR

Giai đoạn: **GĐ 1 (M3 tiền mặt, M5 QR)** · Module API: `payments`

## Mục tiêu

Nhận tiền bằng nhiều phương thức trên một đơn. Với chuyển khoản, khách quét QR đúng số tiền và hệ thống tự xác nhận, thu ngân không phải dò tin nhắn ngân hàng.

## Chức năng

### Phương thức thanh toán

| Mã | Chức năng |
|---|---|
| PAY-01 | Danh mục phương thức: tiền mặt, chuyển khoản QR, thẻ (ghi nhận tay), ví điện tử (ghi nhận tay), khác |
| PAY-02 | Bật/tắt phương thức theo chi nhánh, gắn với quỹ trong sổ quỹ |
| PAY-03 | Một đơn nhiều lần thanh toán, nhiều phương thức |
| PAY-04 | Thanh toán một phần (đặt cọc, trả trước) |
| PAY-05 | Tiền tip (tuỳ chọn, tách khỏi doanh thu) |

### QR chuyển khoản

| Mã | Chức năng |
|---|---|
| PAY-10 | Sinh VietQR động theo đơn: đúng số tiền, nội dung chuyển khoản chứa mã tham chiếu |
| PAY-11 | Hiển thị QR trên POS, in QR lên bill tạm tính |
| PAY-12 | Nhận webhook từ cổng/ngân hàng, kiểm tra chữ ký, khớp mã tham chiếu và số tiền |
| PAY-13 | Khớp thành công: tự ghi nhận thanh toán, báo realtime về POS (`payment.confirmed`), in bill |
| PAY-14 | Mã QR hết hạn sau thời gian cấu hình; tạo lại được |
| PAY-15 | Xử lý lệch: chuyển thiếu, chuyển thừa, chuyển trùng, sai nội dung, tiền về sau khi QR hết hạn, tiền về khi đơn đã trả bằng cách khác hoặc đã huỷ → vào danh sách chờ đối soát |
| PAY-16 | Xác nhận tay "đã nhận chuyển khoản" khi webhook chậm (cần quyền, ghi audit) |
| PAY-17 | Màn hình đối soát: giao dịch ngân hàng chưa khớp ↔ đơn chờ thanh toán, khớp tay |
| PAY-18 | Interface `PaymentProvider` để thay cổng không ảnh hưởng nghiệp vụ; adapter đầu tiên là SePay (D-44) |
| PAY-19 | Mỗi chi nhánh một tài khoản nhận tiền riêng |

### Hoàn tiền

| Mã | Chức năng |
|---|---|
| PAY-20 | Hoàn tiền mặt: ghi sổ quỹ, trừ tiền két của ca |
| PAY-21 | Hoàn chuyển khoản: người có `order.refund` tạo yêu cầu hoàn trên đơn; người có `payment.refund` (quản lý, kế toán) chuyển tay và đánh dấu đã hoàn |
| PAY-22 | Hoàn một phần: số hoàn của từng món tính theo 12 mục "Quy tắc tính tiền"; tổng đã hoàn không vượt tổng đã trả |

## Quy tắc nghiệp vụ

- Đơn chuyển sang "đã thanh toán" khi tổng đã trả ≥ tổng phải trả.
- Webhook xử lý idempotent theo mã giao dịch ngân hàng; nhận trùng thì bỏ qua.
- Webhook sai chữ ký trả 401 và không lưu. Webhook hợp lệ trả 200 sau khi đã lưu thô; xử lý khớp chạy trong hàng đợi (BullMQ, có từ M1).
- Số tiền phải bằng đúng số tiền của yêu cầu QR mới tự xác nhận.
- Với SePay (D-44): SePay theo dõi tài khoản ngân hàng của quán và gọi webhook cho mỗi giao dịch tiền vào; hệ thống tự sinh VietQR và khớp bằng **mã tham chiếu trong nội dung chuyển khoản** cùng số tiền. Mã tham chiếu ngắn, chỉ chữ hoa và số, không trùng trong thời gian QR còn hiệu lực. Cách xác thực webhook và định dạng dữ liệu tra tài liệu SePay bằng Context7 ở M5-02.
- SePay tính phí theo số giao dịch tiền vào của tài khoản, kể cả giao dịch không phải của đơn hàng; nên dùng tài khoản riêng cho việc nhận tiền bán hàng.
- Tổng đơn đổi sau khi đã sinh QR (thêm món, giảm giá) thì yêu cầu QR cũ bị huỷ; POS sinh mã mới. Tiền về theo mã đã huỷ hay đã hết hạn không tự ghi nhận, mà vào danh sách chờ đối soát (PAY-15).
- QR cần mạng. Khi offline chỉ nhận tiền mặt hoặc ghi nhận chuyển khoản tay (đánh dấu "chưa đối soát").
- Khoá của cổng thanh toán cấu hình theo chi nhánh trên Admin (PAY-19) nên lưu trong CSDL, **đã mã hoá**; khoá mã hoá chính nằm trong biến môi trường. Không lưu dạng rõ, không trả khoá về client (Admin chỉ thấy bốn ký tự cuối), không ghi vào log hay audit log.
- `order.refund` là quyền quyết định hoàn tiền trên một đơn (POS); `payment.refund` là quyền thực hiện và đánh dấu việc chuyển tiền hoàn (Admin). Hoàn tiền mặt chỉ cần `order.refund`.

## Dữ liệu chính

`payment_methods`, `branch_payment_methods`, `payments`, `payment_intents` (yêu cầu QR), `bank_transactions` (giao dịch nhận từ webhook), `refunds`, `webhook_events`.

## Mã quyền

`payment.take`, `payment.confirm_manual`, `payment.refund`, `payment.reconcile`, `payment.manage_methods`.

## Màn hình

- POS: Thanh toán (chọn phương thức, chia tiền) · Hiển thị QR và chờ xác nhận.
- Admin: Phương thức thanh toán · Cấu hình cổng QR theo chi nhánh · Đối soát chuyển khoản · Yêu cầu hoàn tiền.

## Để sau

Cổng thẻ/ví tích hợp trực tiếp (VNPay, MoMo, ZaloPay), thanh toán trực tuyến cho đơn khách đặt và đặt cọc đặt bàn (GĐ 3).

## Câu hỏi mở

- Đã chốt dùng SePay (D-44). Tài khoản nhận tiền mở ở ngân hàng nào (phải là ngân hàng SePay hỗ trợ)?
- Mỗi chi nhánh một tài khoản ngân hàng, hay chung một tài khoản?
