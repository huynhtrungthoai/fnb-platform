# 18. In ấn: máy in, mẫu in, khổ giấy

Giai đoạn: **GĐ 1 (M3 bill, M4 phiếu bếp)** · Module API: `devices` (bảng `printers`, `print_templates`) · Package: `pos-core` (dựng nội dung in) · App: `apps/pos`, `apps/pos-mobile`, cấu hình ở `apps/admin`

Plan này gom mọi thứ về in: quản lý máy in trên POS (Bluetooth, LAN), mẫu in, khổ giấy K57 và K80, đường truyền và hàng đợi in. Các mã `PRINT-01 → PRINT-07` chuyển từ plan 12 sang đây, giữ nguyên số.

## Mục tiêu

Thu ngân tự ghép máy in ngay trên POS, in thử được, biết máy in đang lỗi gì. Bill và phiếu bếp in đúng trên cả giấy K57 và K80, tiếng Việt có dấu, kể cả khi mất mạng.

## Khái niệm

| Khái niệm | Giải thích |
|---|---|
| Máy in | Một máy in nhiệt của chi nhánh, khai báo một lần (tên, khổ giấy, kiểu kết nối) |
| Vai trò in | Việc máy in đảm nhận: `bill` (bill, tạm tính, báo cáo ca), `kitchen` (phiếu chế biến, phiếu huỷ của một trạm) |
| Gắn máy in với thiết bị | Thiết bị POS nào in ra máy nào. Ghép Bluetooth là việc của từng thiết bị nên lưu theo thiết bị |
| Mẫu in | Bố cục của một loại chứng từ; code định nghĩa khung, chi nhánh bật/tắt từng khối |
| Nội dung in (`PrintDocument`) | Mô tả bill độc lập với máy in: các dòng chữ, cột, ảnh, QR, lệnh cắt giấy |
| Bộ dựng lệnh (renderer) | Chuyển `PrintDocument` thành byte ESC/POS: kiểu chữ hoặc kiểu ảnh |
| Đường truyền (transport) | Cách gửi byte tới máy in: LAN, Bluetooth, USB |

## Khổ giấy

| Khổ | Giấy | Vùng in | Điểm ảnh mỗi dòng (203 dpi) | Ký tự mỗi dòng (phông A) |
|---|---|---|---|---|
| K57 | 57 mm (máy 58 mm) | 48 mm | 384 | 32 |
| K80 | 80 mm | 72 mm | 576 | 48 |

- Khổ giấy là thuộc tính của máy in, không phải của mẫu in. Một mẫu in chạy được trên cả hai khổ.
- Số ký tự mỗi dòng chỉnh được theo máy in (một số máy K80 chỉ 42 ký tự); in thử cho thấy ngay.
- Bố cục K57: tên món xuống dòng, số lượng và thành tiền ở dòng dưới; không có cột đơn giá riêng. K80: bốn cột (tên, số lượng, đơn giá, thành tiền).
- Không cắt chữ: tên món và ghi chú dài thì xuống dòng. Số tiền không bao giờ xuống dòng.

## Chức năng

### Dựng nội dung và đường truyền

| Mã | Chức năng |
|---|---|
| PRINT-01 | Dựng nội dung in trong `pos-core` thành `PrintDocument`, cho khổ K57 và K80, tiếng Việt có dấu |
| PRINT-02 | Mẫu in: bill thanh toán, tạm tính, phiếu chế biến, phiếu huỷ, báo cáo ca |
| PRINT-03 | Tuỳ biến bill theo chi nhánh: logo, lời chào, thông tin wifi, mã QR chuyển khoản, ngôn ngữ in (40 mục 6) |
| PRINT-04 | In qua LAN từ POS web (cách kết nối chốt sau spike, O-18) |
| PRINT-05 | In qua Bluetooth từ POS web trên trình duyệt hỗ trợ |
| PRINT-06 | Hàng đợi in: thử lại khi máy in lỗi, báo cho thu ngân |
| PRINT-07 | Mở ngăn kéo tiền qua máy in |
| PRINT-08 | Hai kiểu dựng lệnh: **ảnh** (mặc định, in đúng dấu trên mọi máy) và **chữ** (nhanh hơn, chỉ khi máy in có bảng mã tiếng Việt); chọn theo từng máy in |
| PRINT-09 | Lệnh phụ theo máy: cắt giấy, kêu bíp (máy in bếp), số bản in |

### Quản lý máy in trên POS

| Mã | Chức năng |
|---|---|
| PRINT-10 | Màn hình "Máy in" trên POS: danh sách máy in của chi nhánh, máy nào đang gắn với thiết bị này, trạng thái kết nối |
| PRINT-11 | Thêm máy in Bluetooth: quét, ghép, đặt tên, chọn khổ giấy K57/K80 |
| PRINT-12 | Thêm máy in LAN: nhập địa chỉ IP và cổng (mặc định 9100), hoặc chọn từ danh sách đã khai báo ở Admin |
| PRINT-13 | Gán vai trò in cho máy trên thiết bị này: bill, bếp theo trạm; một vai trò có thể có máy dự phòng |
| PRINT-14 | In thử: một trang có tiếng Việt đủ dấu, thước đo số ký tự mỗi dòng, logo, QR, lệnh cắt giấy |
| PRINT-15 | Trạng thái máy in trên thanh trạng thái POS: sẵn sàng, mất kết nối, hết giấy/mở nắp (nếu máy báo được), số lệnh chờ |
| PRINT-16 | Tự kết nối lại khi mất kết nối; kết nối lại bằng tay |
| PRINT-17 | Sửa, gỡ máy in khỏi thiết bị; đổi kiểu dựng lệnh (ảnh/chữ), số ký tự mỗi dòng |
| PRINT-18 | Xem và xử lý hàng đợi in: in lại lệnh lỗi, huỷ lệnh, chuyển sang máy dự phòng |

### Mẫu in

| Mã | Chức năng |
|---|---|
| PRINT-20 | Danh sách mẫu in: bill thanh toán, tạm tính, phiếu chế biến, phiếu huỷ, báo cáo ca, phiếu nộp/rút tiền, trang in thử |
| PRINT-21 | Cấu hình mẫu theo chi nhánh bằng cách bật/tắt khối: logo, tên và địa chỉ quán, mã số thuế, dòng VAT (mặc định tắt, D-28), lời chào, wifi, QR chuyển khoản, chân trang; nhập nội dung chữ hai ngôn ngữ |
| PRINT-22 | Tuỳ chọn theo mẫu: cỡ chữ (thường, lớn), số bản in, ngôn ngữ (bill cho khách mặc định và hiện chỉ dùng `vi`, D-39; cơ chế vẫn nhận `en` và song ngữ), có in giá trên phiếu chế biến hay không |
| PRINT-23 | Xem trước mẫu ở cả K57 và K80 trên Admin và POS, dùng dữ liệu mẫu |
| PRINT-24 | Bill in lại có dòng "BẢN IN LẠI" và số lần in |
| PRINT-25 | Phiếu chế biến: bàn hoặc số thứ tự, giờ gọi, món, tuỳ chọn, ghi chú chữ lớn; phiếu huỷ in nổi bật chữ "HUỶ" |
| PRINT-26 | Báo cáo ca (14: CASH-07) in từ cùng cơ chế mẫu |

Không làm trình thiết kế mẫu kéo thả. Khung của mẫu nằm trong code (`pos-core`); chi nhánh chỉ bật/tắt khối và sửa nội dung.

## Thiết kế

```
pos-core                         app (web / Android)
  dữ liệu đơn + cấu hình mẫu
        │ buildPrintDocument()
        ▼
  PrintDocument ───────────────► renderer ảnh (web: Canvas · Android: native)
  (dòng, cột, ảnh, QR, cắt)      renderer chữ (ESC/POS + bảng mã)
                                        │ byte
                                        ▼
                                 hàng đợi in ──► transport (LAN / Bluetooth / USB)
```

| Quy tắc | Chi tiết |
|---|---|
| `pos-core` không sinh byte | `pos-core` chỉ dựng `PrintDocument` (thuần dữ liệu, test được bằng unit test). Dựng ảnh cần Canvas hoặc native nên nằm ở app (D-24) |
| Một bố cục, hai khổ | `buildPrintDocument(data, template, paper)` nhận khổ giấy; test snapshot cho cả K57 và K80 |
| Chuỗi trên bill | `pos-core` nhận bảng nhãn đã dịch qua tham số (40 mục 3), không import i18n |
| Logo | Bản đen trắng (07 mục 6), co theo vùng in của khổ giấy |
| QR | In dạng ảnh; kích thước tối thiểu đủ để quét trên K57 |

### Đường truyền theo nền tảng

| Nền tảng | LAN | Bluetooth | USB |
|---|---|---|---|
| POS web (PWA) | Qua cầu nối (O-18) | Web Bluetooth: chỉ máy in BLE; máy Bluetooth cổ điển cần Web Serial hoặc cầu nối | WebUSB/Web Serial nếu trình duyệt hỗ trợ |
| POS Android | Socket trực tiếp | Native, cả cổ điển và BLE | Native |

Rủi ro đã biết với POS web, phải giải bằng spike **M3-00** trước khi làm M3-26:

1. Trang HTTPS không gọi thẳng được `http://<ip-lan>` của cầu nối (trình duyệt chặn nội dung hỗn hợp). Phương án cần thử: cầu nối chạy trên chính máy POS (`localhost`), cầu nối có chứng chỉ TLS cho tên miền nội bộ, hoặc dùng POS Android cho quầy cần in LAN.
2. Web Bluetooth không nói chuyện được với máy in Bluetooth cổ điển, loại phổ biến nhất.
3. Máy in không có bảng mã tiếng Việt: kiểu ảnh phải đủ nhanh (mục tiêu dưới 2 giây cho bill 20 dòng).

Kết quả spike ghi vào 05 (O-03, O-18) và sửa bảng trên.

## Quy tắc nghiệp vụ

- In không chặn bán hàng: thanh toán xong là xong, lệnh in vào hàng đợi; in lỗi thì báo và cho in lại.
- Mất mạng vẫn in được bill và phiếu bếp: lệnh in đi thẳng từ thiết bị tới máy in, không qua server.
- Lệnh in trong hàng đợi lưu ở DB cục bộ, còn nguyên sau khi tải lại trang hay khởi động lại app.
- Phiếu chế biến in lỗi quá số lần thử thì cảnh báo nổi bật trên POS (bếp chưa nhận món); không lặng lẽ bỏ qua.
- Mỗi lần in bill, in lại, mở ngăn kéo đều ghi vào `order_events`; in lại và mở ngăn kéo không qua bán hàng ghi audit log.
- Máy in khai báo ở cấp chi nhánh; việc ghép và gán vai trò lưu theo thiết bị và đồng bộ lên server để Admin xem được.
- Đổi mẫu in ở Admin: POS nhận qua snapshot, có hiệu lực ở lần in kế tiếp.

## Dữ liệu chính

| Bảng | Cột chính |
|---|---|
| `printers` | `branch_id`, `name`, `paper` (`k57`/`k80`), `connection` (`lan`/`bluetooth`/`usb`), `address` (IP:cổng, chỉ LAN), `render_mode` (`raster`/`text`), `chars_per_line`, `is_active` |
| `device_printers` | `device_id`, `printer_id`, `role` (`bill`/`kitchen`), `station_id` (khi `kitchen`), `is_fallback`, `local_address` (địa chỉ Bluetooth trên thiết bị) |
| `print_templates` | `branch_id`, `type`, `blocks` (jsonb: khối bật/tắt và nội dung `{vi,en}`), `options` (cỡ chữ, số bản, ngôn ngữ) |

Hàng đợi in (`print_jobs`) chỉ nằm ở DB cục bộ của thiết bị, không đồng bộ lên server.

## Mã quyền

| Mã | Dùng cho |
|---|---|
| `printer.manage` | Khai báo, sửa, gỡ máy in; gán vai trò; sửa mẫu in (Admin và POS) |
| `order.print_bill`, `order.reprint`, `order.open_drawer` | In bill, in lại, mở ngăn kéo (12) |

In thử, kết nối lại và xử lý hàng đợi in không cần quyền riêng (chỉ cần đăng nhập thiết bị). Bảng nhóm mặc định: 06 mục 4.1.

## Màn hình

- POS: Máy in (danh sách, thêm Bluetooth/LAN, gán vai trò, in thử) · Hàng đợi in · Xem trước mẫu in.
- Admin: Máy in theo chi nhánh · Mẫu in (bật/tắt khối, xem trước K57/K80) · Thiết bị nào đang gắn máy in nào.

Component cần thêm vào `packages/ui-pos`: `PrinterStatus`, `ReceiptPreview`. Admin cần xem trước mẫu in thì làm `ReceiptPreview` trong `packages/ui-web` (cùng tên, nền tảng khác).

## Kiểm thử

| Loại | Phạm vi |
|---|---|
| Unit (`pos-core`) | Snapshot `PrintDocument` của từng mẫu ở K57 và K80; xuống dòng tên dài; canh cột số tiền; song ngữ |
| Unit (renderer chữ) | Byte ESC/POS cho từng loại dòng |
| Thủ công trên máy in thật | Dấu tiếng Việt, logo, QR quét được, cắt giấy, ngăn kéo, mất kết nối giữa chừng, hết giấy |

## Việc cần làm

Tick ở `90-roadmap.md`.

- [ ] M3-00: spike in ấn (ba rủi ro ở mục Thiết kế).
- [ ] M3-05: `PrintDocument` và các mẫu bill, tạm tính, báo cáo ca.
- [ ] M3-26: renderer, đường truyền, hàng đợi in, mở ngăn kéo.
- [ ] M3-31: màn hình Máy in trên POS.
- [ ] M3-32: mẫu in theo chi nhánh và xem trước.
- [ ] M4-14: mẫu phiếu chế biến, phiếu huỷ; máy in theo trạm.
- [ ] M8-06: renderer và đường truyền native cho POS Android.

## Câu hỏi mở

- Máy in đang dùng: hãng, khổ K57 hay K80, kết nối LAN/Bluetooth/USB, Bluetooth cổ điển hay BLE? (O-03)
- POS web nói chuyện với máy in LAN bằng cách nào? (O-18, sau spike M3-00)
