# 32. App khách hàng và Zalo Mini App

Giai đoạn: **GĐ 4 (app Expo)**, **GĐ 5 (Zalo Mini App)** · App: `apps/customer-app`, `apps/zalo-mini-app`

## Mục tiêu

Đưa các tính năng khách hàng ở tài liệu 21 lên hai kênh khách dùng nhiều: app cài trên máy và Zalo. Không viết lại nghiệp vụ; cả hai dùng chung API và contract.

## App khách hàng (vỏ WebView, D-42)

App khách là một vỏ native mỏng (Expo) mở web khách trong WebView. Giao diện và nghiệp vụ nằm hết ở `apps/customer-web`; vỏ chỉ thêm những thứ web không làm được. Vì vậy web khách phải responsive và cho cảm giác như app trên điện thoại.

| Mã | Chức năng |
|---|---|
| APP-01 | Mở web khách trong WebView, giữ phiên đăng nhập giữa các lần mở; đăng nhập, đăng ký, quên PIN là màn hình của web (21: CUS-01, CUS-07) |
| APP-02 | Đặt món, theo dõi đơn, voucher, điểm: chính là web khách, không viết lại |
| APP-03 | Vỏ đăng ký thiết bị với Firebase Cloud Messaging và chuyển mã thiết bị cho web (D-33); thông báo đẩy: trạng thái đơn, nhắc đặt bàn, khuyến mãi |
| APP-04 | Thẻ thành viên dạng QR để quét tại quầy |
| APP-05 | Cầu nối native cho web gọi: camera quét QR, định vị, chia sẻ |
| APP-06 | Định vị gợi ý chi nhánh gần nhất, lưu địa chỉ giao |
| APP-07 | Liên kết sâu: mở app từ liên kết đơn, voucher, QR bàn |
| APP-08 | Nội dung cập nhật theo web, không cần phát hành lại app; vỏ chỉ phát hành lại khi đổi phần native. Có màn hình báo mất mạng và nút thử lại |
| APP-09 | Phát hành Google Play và App Store (cần tài khoản nhà phát triển) |
| APP-10 | Xoá tài khoản trong app (yêu cầu của các cửa hàng ứng dụng) |

Ghi chú: logic giỏ hàng và tính tiền nằm ở web khách, dùng `packages/pos-core` (server vẫn tính lại và không tin số từ client). Cửa hàng ứng dụng, nhất là App Store, có thể từ chối app chỉ là trang web bọc lại; các chức năng native ở APP-03, APP-04, APP-05 là để app có giá trị riêng, và cần kiểm chính sách trước khi nộp (M11-05).

**Thứ tự (D-42):** web khách responsive (GĐ 3) → vỏ WebView (GĐ 4, nhỏ) → Zalo Mini App (GĐ 5).

## Zalo Mini App

| Mã | Chức năng |
|---|---|
| ZMA-01 | App riêng `apps/zalo-mini-app`; component là bản React DOM của `@fnb/ui-mobile`, viết theo thiết kế chung (D-43); dùng chung token, contract, `api-client`, i18n và logic giỏ hàng |
| ZMA-02 | Lớp nền tảng Zalo: đăng nhập, lưu trữ, định vị, thanh toán qua SDK của Zalo |
| ZMA-03 | Đăng nhập bằng tài khoản Zalo, xin quyền lấy số điện thoại (coi là đã xác minh), gộp với khách đã có theo số điện thoại; không cần PIN trong Mini App |
| ZMA-04 | Đặt món, đặt bàn, voucher, điểm |
| ZMA-05 | Thông báo qua ZNS: xác nhận đơn, trạng thái, nhắc đặt bàn |
| ZMA-06 | Quan tâm Zalo OA của quán, nhận tin khuyến mãi |
| ZMA-07 | Thanh toán: QR chuyển khoản; cổng thanh toán của Zalo nếu đăng ký được |
| ZMA-08 | Chia sẻ món/voucher cho bạn bè trong Zalo |
| ZMA-09 | Quét QR bàn mở thẳng Mini App |

## Việc cần chuẩn bị ngoài code

| Việc | Cho |
|---|---|
| Tài khoản Google Play và Apple Developer | APP-09 |
| Zalo OA đã xác thực, đăng ký Mini App, lấy App ID | ZMA-01 |
| Đăng ký mẫu tin ZNS và nạp phí gửi | ZMA-05 |
| Chính sách quyền riêng tư và điều khoản sử dụng | Cả hai |

## Quy tắc

- Một khách là một bản ghi dù đến từ web, app, Zalo hay POS; khoá gộp là số điện thoại.
- Tính năng mới cho khách làm ở API và web trước, rồi tới app và Zalo.
- Web khách dùng `@fnb/ui-web` với theme `customer`; app khách là chính web đó trong WebView (D-42); Zalo Mini App dùng `@fnb/ui-mobile` với theme `mobile` (D-43). Hai theme theo cùng quy tắc thương hiệu (07 mục 7).
- Mini App phải qua kiểm duyệt của Zalo mỗi lần phát hành: giữ thay đổi nhỏ, phát hành đều.

## Câu hỏi mở

- Quán đã có Zalo OA chưa?
- Có cần bản iOS ngay, hay Android trước?
