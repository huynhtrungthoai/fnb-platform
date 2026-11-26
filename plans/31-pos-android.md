# 31. POS Android (Expo)

Giai đoạn: **GĐ 1.5** · App: `apps/pos-mobile` · Dùng lại: `pos-core`, `contract`, `api-client`, `i18n`, `design-tokens` · Component: bản native trong `apps/pos-mobile/src/shared-components`, theo thiết kế và tên của nền tảng POS (03 mục 7.1, D-03)

## Mục tiêu

Chạy POS trên tablet và máy POS cầm tay Android, in trực tiếp ra máy in nhiệt không cần cầu nối in. Dùng làm quầy thứ hai hoặc máy nhận đơn cầm tay lúc đông khách.

**Hướng làm đã chốt (D-03, xác nhận lại ngày 2026-11-26):** app React Native có giao diện native riêng để chạy mượt; màn hình, luồng và tên component lấy từ POS web, không bọc WebView. Thiết bị có hai dạng: tablet và máy cầm tay (D-35).

## Nguyên tắc

- Giao diện viết riêng bằng React Native. Toàn bộ logic nghiệp vụ lấy từ `pos-core`.
- Cùng API, cùng cơ chế đồng bộ với POS web. Một tính năng POS mới phải đưa logic vào `pos-core` trước.
- Dùng Expo development build (cần module native cho in ấn), không dùng Expo Go.

## Chức năng

| Mã | Chức năng |
|---|---|
| MPOS-01 | Đăng ký thiết bị, đăng nhập, đổi nhân viên bằng PIN |
| MPOS-02 | Bán hàng: lưới món, tuỳ chọn, giỏ, giảm giá, thanh toán (tương đương POS-01 → POS-41) |
| MPOS-03 | Sơ đồ bàn, mở bàn, gọi thêm, chuyển/gộp/tách (hoãn theo D-26, EXT-47) |
| MPOS-04 | Bố cục tablet ngang (thu ngân) và điện thoại dọc (phục vụ gọi món) |
| MPOS-05 | Offline bằng expo-sqlite: snapshot + outbox, cùng giao thức `/sync` |
| MPOS-06 | In nhiệt Bluetooth (cổ điển và BLE), LAN, USB; máy in liền thân nếu máy cầm tay có (O-03). Renderer ảnh và đường truyền native nhận `PrintDocument` từ `pos-core`; màn hình Máy in, mẫu in, K57/K80 giống POS web (18) |
| MPOS-07 | Mở ngăn kéo tiền |
| MPOS-08 | Hiển thị QR thanh toán, nhận xác nhận realtime |
| MPOS-09 | Mở/đóng ca, nộp/rút tiền |
| MPOS-10 | Thông báo đẩy: món xong, khách gọi, đơn online mới |
| MPOS-11 | Quét mã vạch/QR bằng camera (voucher, thẻ thành viên) |
| MPOS-12 | Chế độ kiosk: khoá máy vào app POS |
| MPOS-13 | Giữ màn hình sáng, tự kết nối lại máy in |
| MPOS-14 | Cập nhật OTA cho phần JavaScript; bản native phát hành qua file APK nội bộ |
| MPOS-15 | Ghi log lỗi và gửi về server để chẩn đoán |

## Ngoài phạm vi

- Bản iOS của POS.
- Phát hành lên Google Play (dùng nội bộ, cài APK trực tiếp).

## Kiểm thử

- Unit test `pos-core` đã bao phủ logic.
- Adapter lưu trữ (Dexie trên web, expo-sqlite trên Android) chạy **cùng một bộ test hợp đồng** nằm trong `pos-core`, viết từ M3-04, để giao diện adapter không bị đóng khung theo IndexedDB.
- Web, Android và server có thể chạy khác phiên bản `pos-core` (OTA lệch nhịp): lệnh mang `calcVersion` (12); server hỗ trợ phiên bản hiện tại và phiên bản liền trước.
- M8-04 hiện gói cả POS-01 → POS-41 vào một task; khi tới M8 phải tách theo màn hình như M3-16 → M3-26.
- Thông báo đẩy (MPOS-10) cần Google Play Services; một số máy POS cầm tay không có. Kiểm tra khi chọn mẫu máy cầm tay; dự phòng là thông báo qua Socket.IO khi app đang mở.
- Thử trên thiết bị thật: in từng loại kết nối, mất mạng giữa chừng, tắt app khi còn outbox, pin yếu.

## Câu hỏi mở

- Máy cầm tay có máy in liền thân không, hãng nào? (hỏi cùng O-03)
- Phục vụ có dùng điện thoại cá nhân để gọi món không?
