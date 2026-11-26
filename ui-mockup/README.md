# UI mockup

Bản thiết kế mẫu (mockup) của POS, KDS, Admin, web khách, app khách và Zalo Mini App, dựng theo `plans/03-design-system.md`, `plans/07-brand.md` và `docs/ui-rules.md`. Dùng để tham khảo bố cục, màu, trạng thái và luồng khi làm từ M1. **Không phải code của app**: không import, không copy markup vào `apps/`; component thật dựng trong `packages/ui-web`, `ui-pos`, `ui-mobile` (và `src/shared-components` của app) theo tên chuẩn.

Bản sống trên canvas (riêng tư, chủ sở hữu chia sẻ qua menu Share): https://claude.ai/artifact/B2DQi4zSqiw4iVURwHxkjw

Lưu ngày 2026-11-26, khớp phiên bản canvas `1795706752-b8f6`, **trừ `pos-sale.dc.html`**: file này đã sửa trong repo (thêm hộp chọn tuỳ chọn khi chạm món) và chưa đưa lên canvas. Canvas có bốn trang: **Nền tảng**, **POS**, **Web**, **Mobile**. Mỗi trang nền tảng có hàng trên là đặc tả và bảng component, các hàng dưới là luồng màn hình đánh số theo thứ tự người dùng đi.

Cách đọc khi làm một component: mở `spec-<nền tảng>.dc.html` để lấy tên, props, biến thể, trạng thái và màn hình dùng; xem hình ở `ds-<nền tảng>-*.dc.html`; xem nó nằm trong luồng nào ở các màn đánh số.

## Nền tảng

| File | Nội dung | Kích thước |
|---|---|---|
| `ds-foundations.dc.html` | Token chung: bảng màu gốc, màu vai trò sáng/tối, chữ, khoảng cách, bo góc, bóng, vùng chạm, trạng thái nghiệp vụ, màu biểu đồ, hoạ tiết sóng; mục 8: năm theme × sáng/tối và `ThemeSwitcher` | 1440×2560 |

## POS · `@fnb/ui-pos` (POS web + KDS)

| File | Nội dung | Kích thước |
|---|---|---|
| `spec-pos.dc.html` | Đặc tả component: ma trận trạng thái nút 56 px, danh mục theo nhóm (tên, việc, props, biến thể/trạng thái, màn dùng) | 1440×3000 |
| `ds-pos-components.dc.html` | Bảng component theme `pos` và `kds` | 1440×2140 |

Luồng ca bán hàng tại quầy (1280×800, KDS 1920×1080):

| Bước | File | Màn |
|---|---|---|
| 1 | `pos-login.dc.html` | Đăng nhập: chọn nhân viên + PIN 6 số |
| 2 | `pos-open-shift.dc.html` | Mở ca: đếm tiền đầu ca theo mệnh giá |
| 3 | `pos-sale.dc.html` | Bán hàng (bấm được: chọn nhóm, +/−; chạm món có biến thể hoặc tuỳ chọn thì mở hộp chọn, món không có thì thêm thẳng; "Sửa tuỳ chọn" trên dòng giỏ). Quy tắc: plan 12 mục "Thêm món vào đơn" |
| 4 | `pos-modifier.dc.html` | Hộp chọn tuỳ chọn món, trạng thái tĩnh (bản bấm được nằm trong màn 3) |
| 5 | `pos-payment.dc.html` | Thanh toán tiền mặt khi mất mạng |
| 6 | `pos-paid.dc.html` | Thanh toán xong: số thứ tự, gửi bếp, in bill |
| 7 | `kds-board.dc.html` | Bếp nhận phiếu (bấm được) |
| 8 | `pos-orders.dc.html` | Gọi số tại quầy (bấm được) |
| 9 | `pos-close-shift.dc.html` | Đóng ca: dự kiến so với đếm được, chênh lệch |

Màn POS bổ sung (tablet 1280×800; máy cầm tay 400×860 theo D-35; KDS 1920×1080):

| Nhóm | Màn (file) |
|---|---|
| Bán hàng và thanh toán | P10 Danh sách đơn (`pos-order-list`) · P11 Chi tiết đơn (`pos-order-detail`) · P12 Quản lý duyệt tại chỗ (`pos-approval`) · P13 Gắn khách và áp ưu đãi (`pos-customer`) · P14 Thanh toán QR (`pos-pay-qr`) · P15 Chia nhiều cách trả (`pos-split-pay`) |
| Máy cầm tay | P16 Bán hàng (`pos-handheld-sale`) · P17 Thanh toán (`pos-handheld-pay`) |
| Ca, máy in, thiết bị | P20 Nộp/rút tiền (`pos-cash-inout`) · P21 Xem nhanh ca, báo cáo ca (`pos-shift-summary`) · P22 Máy in (`pos-printers`) · P23 Hàng đợi in (`pos-print-queue`) · P24 Đăng ký thiết bị (`pos-device-register`, quản lý đăng nhập tên + PIN theo plan 10) · P25 Cài đặt thiết bị và đồng bộ (`pos-device-settings`) |
| KDS | P26 Phiếu đã xong, hoàn tác (`kds-history`) |

Mã QR trong mockup là hình minh hoạ, vẽ bằng màu cố định tối trên nền sáng ở cả hai chế độ; khi làm thật cần token riêng cho QR.

## Web · `@fnb/ui-web` (Admin + web khách)

| File | Nội dung | Kích thước |
|---|---|---|
| `spec-web.dc.html` | Đặc tả component: ma trận trạng thái nút 40 px, danh mục theo nhóm, đánh dấu dùng chung / chỉ admin / chỉ khách | 1440×3000 |
| `ds-web-components.dc.html` | Bảng component theme `admin` | 1440×2200 |
| `ds-web-customer.dc.html` | Bảng component theme `customer` | 1440×1640 |

Luồng Admin (trang co giãn, mẫu 1440):

| Bước | File | Màn |
|---|---|---|
| A1 | `admin-login.dc.html` | Đăng nhập: tên đăng nhập + PIN 6 số |
| A2 | `admin-dashboard.dc.html` | Tổng quan |
| A3 | `admin-menu.dc.html` | Danh sách món |
| A4 | `admin-menu-edit.dc.html` | Sửa món (vi/en, biến thể, tuỳ chọn, giá theo chi nhánh) |

Màn tính năng Admin (trang co giãn, mẫu 1440; menu trái chuẩn giống nhau ở mọi màn):

| Nhóm | Màn (file `admin-*.dc.html`) |
|---|---|
| HT · Hệ thống | HT1 Chi nhánh (`branches`) · HT2 Nhân viên (`staff`) · HT3 Phân quyền nhân viên (`staff-access`) · HT4 Nhóm quyền (`roles`) · HT5 Sửa nhóm quyền (`role-edit`) · HT6 So sánh nhóm quyền (`role-compare`) · HT7 Thiết bị và máy in (`devices`) · HT8 Mẫu in (`print-templates`) · HT9 Nhật ký (`audit-log`) |
| TD · Thực đơn | TD1 Nhóm món (`categories`) · TD2 Nhóm tuỳ chọn (`modifiers`) · TD3 Giá theo chi nhánh (`branch-prices`) · TD4 Trạm chế biến (`stations`) |
| BH · Bán hàng | BH1 Đơn hàng (`orders`) · BH2 Chi tiết đơn, hoàn tiền (`order-detail`) · BH3 Ca thu ngân (`shifts`) · BH4 Sổ quỹ (`cashbook`) · BH5 Thanh toán (`payments`) |
| KH · Kho | KH1 Nguyên liệu và nhà cung cấp (`ingredients`) · KH2 Định lượng (`recipes`) · KH3 Phiếu kho (`stock-docs`) · KH4 Tạo phiếu nhập (`stock-in`) · KH5 Kiểm kê (`stocktake`) · KH6 Tồn kho (`stock`) · KH7 Thẻ kho (`stock-card`) |
| BC · Báo cáo | BC1 Báo cáo bán hàng (`reports`) · BC2 So sánh chi nhánh và cuối ngày (`report-branches`) |
| NS · Nhân sự | NS1 Hồ sơ (`hr-profile`) · NS2 Lịch làm việc (`schedule`) · NS3 Bảng công GPS (`timesheet`) · NS4 Yêu cầu chờ duyệt (`hr-requests`) · NS5 Kỳ lương (`payroll`) · NS6 Trang của tôi `/me`, 390×844 (`me`) |
| KC · Khách hàng | KC1 Khách hàng (`customers`) · KC2 Ưu đãi (`vouchers`) · KC3 Đặt món online (`online-config`) · KC4 Thành viên (`membership`) |

Đặt bàn và mọi tính năng bàn không vẽ (hoãn, EXT-47).

Luồng web khách (trang co giãn, mẫu 1440):

| Bước | File | Màn |
|---|---|---|
| K1 | `customer-web-home.dc.html` | Trang chủ và thực đơn |
| K2 | `customer-web-product.dc.html` | Chi tiết món, chọn tuỳ chọn |
| K3 | `customer-web-login.dc.html` | Đăng nhập khách (khi cần): SĐT + PIN, quên PIN qua email |
| K4 | `customer-web-checkout.dc.html` | Giỏ và thông tin nhận món |
| K5 | `customer-web-pay-qr.dc.html` | Quét QR chuyển khoản |
| K6 | `customer-web-order.dc.html` | Theo dõi đơn theo số thứ tự |

## Mobile · `@fnb/ui-mobile` (Zalo Mini App)

App khách là vỏ WebView bọc web khách (D-42), nên giao diện app là web khách theme `customer` ở bề rộng điện thoại. `@fnb/ui-mobile` là thiết kế chung, Zalo viết bản React DOM (D-43). Các màn M dưới đây minh hoạ kênh khách trên điện thoại; Zalo dùng lại M2 → M7.

| File | Nội dung | Kích thước |
|---|---|---|
| `spec-mobile.dc.html` | Đặc tả component: ma trận trạng thái nút 52 px, danh mục theo nhóm, đánh dấu dùng chung / chỉ bản native (chưa làm) / chỉ Zalo | 1440×3000 |
| `ds-mobile-components.dc.html` | Bảng component theme `mobile` | 1280×1960 |

Luồng kênh khách trên điện thoại (390×844):

| Bước | File | Màn |
|---|---|---|
| M1 | `mobile-login.dc.html` | Đăng nhập SĐT + PIN 6 số (web khách trong app WebView; Zalo dùng Z1) |
| M2 | `mobile-menu.dc.html` | Thực đơn |
| M3 | `mobile-product.dc.html` | Chọn món (Sheet) |
| M4 | `mobile-cart.dc.html` | Giỏ hàng |
| M5 | `mobile-checkout-qr.dc.html` | Thanh toán QR |
| M6 | `mobile-order-status.dc.html` | Theo dõi đơn |
| M7 | `mobile-account.dc.html` | Tài khoản, sáng/tối, ngôn ngữ |

Luồng Zalo Mini App: `zalo-login.dc.html` (Z1: đăng nhập bằng Zalo, xin quyền số điện thoại), sau đó dùng lại M2 → M7.

`canvas.json`: vị trí các artboard và ghi chú trên bốn trang. Mỗi màn có tweak `dark` để xem chế độ còn lại.

## Tên component mới trong mockup

Bảng đặc tả có vài tên chưa có trong `plans/03-design-system.md` mục 7.3, đánh dấu "đề xuất": `StaffPicker`, `QueueNumber`, `ItemTotals` (POS); `CartPanel` (web khách); `MemberCard`, `PermissionCard` (mobile). Đã thêm vào plan 03 mục 7.3.

## Quyết định nghiệp vụ đã áp dụng

- **D-26**: giai đoạn 1 gọi món và trả tiền tại quầy, không có bàn. Đơn chưa có số thứ tự cho tới khi thanh toán xong (POS-09); thu xong thì tự gửi bếp (KDS-10).
- **D-29**: nhân viên đăng nhập bằng tên + PIN 6 số (POS chọn nhân viên rồi nhập PIN). **D-30**: khách dùng SĐT + PIN 6 số, quên PIN qua email; Zalo đăng nhập bằng tài khoản Zalo.
- **D-14, D-31**: ba nền tảng component, theme theo app, sáng/tối chọn được.
- Màu trạng thái theo `plans/07-brand.md` mục 3.4; mọi trạng thái có icon và chữ.
- Nút chính đỏ thương hiệu, một nút mỗi màn; `DangerButton` kiểu viền, đặt xa nút chính (07 mục 3.3).
- Phí dịch vụ (POS-12) chưa thể hiện trong mockup.

Giá, số liệu, tên nhân viên, ngân hàng là **dữ liệu mẫu**; mã QR là hình vẽ minh hoạ, không phải mã thật.

## Định dạng file

Mỗi file `.dc.html` là một artboard của canvas Design: HTML có `<x-dc>`, template `{{ … }}`, `<sc-for>`/`<sc-if>` và một class `Component extends DCLogic`. File cần runtime của canvas (`./support.js`) nên **mở thẳng bằng trình duyệt sẽ không hiển thị đúng**; xem trên canvas.

| Chỗ trong file | Ý nghĩa |
|---|---|
| `.fnb { --bg: … }` và `.fnb.dark { … }` | Token màu sáng/tối chép từ `plans/07-brand.md` mục 3. Khi có `packages/design-tokens`, đó mới là nguồn; mockup không phải nguồn token |
| `/_blob/dbbc95b08d47870e1964f1322682c11f` | Logo nhỏ nền trong suốt, tức `brands/logo-icon-transparent.png` |
| `/_blob/5bc8172d66702a09b8368bb2966b5020` | Logo đầy đủ nền trong suốt, tức `brands/banhkepchonong-logo-transparent.png` |

Trên canvas, màn bán hàng tên `Main.dc.html` (artboard gốc của canvas). Trong repo đổi thành `pos-sale.dc.html` cho đúng quy tắc tên file `kebab-case`; các liên kết giữa artboard và `canvas.json` đã đổi theo. Muốn đưa lại lên canvas thì đổi ngược tên này.

## Đồng bộ với plan

Quy tắc ở `AGENTS.md`, mục Quy trình:

- Mockup là thứ dev xem để dựng UI. Plan (03, 07, plan tính năng) và mockup luôn khớp.
- Sửa mockup mà đụng tới nghiệp vụ, luồng, tên component, props hay token: sửa plan liên quan trong cùng thay đổi.
- Sửa plan mà đổi màn hình, luồng hay component: sửa mockup trên canvas, chép lại file về đây, cập nhật bảng ở trang này.
- Sau mỗi lần sửa canvas: chép các file đã đổi về đây (đổi `Main.dc.html` thành `pos-sale.dc.html`) và cập nhật ngày, phiên bản ở đầu trang.
