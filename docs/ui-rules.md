# UI rules

Cách dựng mọi màn hình để giao diện đồng nhất giữa Admin, POS, KDS, web khách và các app. Trang này là checklist; đặc tả đầy đủ ở `plans/03-design-system.md`. Nếu code, plan và trang này mâu thuẫn, dừng lại và nói rõ, rồi sửa bên sai trong cùng thay đổi.

Đọc cùng: `plans/03-design-system.md` (token, component, trạng thái), `plans/40-i18n-copy.md` (chữ), plan của màn hình đang làm, và **mockup** trong `ui-mockup/` (đặc tả `spec-<nền tảng>` và màn của luồng): dựng theo mockup. Plan và mockup phải khớp nhau; sửa bên này thì sửa bên kia trong cùng thay đổi (`AGENTS.md`, mục Quy trình).

## 1. Bộ component của nền tảng trước

Component chia theo **ba nền tảng** (D-14, `plans/03-design-system.md` mục 7). **Màu và metric dùng chung** qua `@fnb/design-tokens`.

| Nền tảng | App | Bộ component | Theme |
|---|---|---|---|
| Web | `admin`, `customer-web` | `@fnb/ui-web` | `admin`, `customer` |
| POS | `pos` (POS + KDS) | `@fnb/ui-pos` | `pos`, `kds` |
| Mobile | `zalo-mini-app` | `@fnb/ui-mobile`: một thiết kế chung, mỗi công nghệ một bản code (D-43) | `mobile` |
| App khách | `customer-app` | Vỏ WebView bọc `customer-web` (D-42), không có component riêng | `customer` |
| POS Android | `pos-mobile` | Bản native theo thiết kế và tên của `@fnb/ui-pos` (D-03) | `pos` |

| Quy tắc | Chi tiết |
|---|---|
| Màn hình chỉ ghép | Code trong `features/` và `routes/` chỉ dùng component từ `@fnb/ui-<nền tảng>`, `src/shared-components` của chính app và phần riêng của tính năng. Không tự dựng lại nút, ô nhập, bảng, thẻ, hộp thoại, tab, thanh công cụ, trạng thái tải/rỗng/lỗi. |
| Thiếu thì làm ở đúng tầng | App khác cùng nền tảng có thể dùng → làm trong `packages/ui-<nền tảng>`. Chỉ app này dùng → `apps/<app>/src/shared-components/`. Thêm vào trang mẫu và README. Bảng quyết định ở `AGENTS.md`. |
| Không sao chép để chỉnh | Không copy component vào `features/` để sửa. Thêm tham số (`variant`, `size`, `density`) cho nó. |
| Đúng nền tảng | App chỉ import bộ `ui-*` của nền tảng mình; không import component của app khác. Nền tảng khác cần thứ tương tự thì làm trong bộ của nó, **đúng tên chuẩn** (`plans/03-design-system.md` mục 7.3). |
| Thư viện UI gốc chỉ trong `packages/ui-*` | Radix, shadcn primitives, thư viện giao diện native hay của Zalo chỉ được import trong `packages/ui-*`. ESLint chặn ở `apps/`. |
| Không nghiệp vụ, không API | Component không gọi API, không chứa logic của một tính năng. Nhãn của màn hình truyền qua props; nhãn mặc định chung lấy từ i18n `common`. |

## 2. Token và theme

- Màu, khoảng cách, bo góc, cỡ chữ, đổ bóng, thời lượng chuyển động, vùng chạm chỉ lấy từ `@fnb/design-tokens`. Áp dụng cho cả `packages/ui-*`, `shared-components` lẫn màn hình, ở mọi app.
- Mỗi app gắn một theme (`admin`, `customer`, `pos`, `kds`, `mobile`). Khác biệt giữa các theme nằm trong token, không viết điều kiện theo tên theme trong component.
- Admin giữ đơn giản: không hoạ tiết, không `font-display`, màu thương hiệu chỉ ở nút chính và mục đang chọn. Kiểu thương hiệu (sóng, Baloo 2, ảnh lớn) chỉ ở theme `customer` và `mobile`.
- Không viết mã màu (`#fff`, `rgb()`), không class Tailwind giá trị tuỳ ý (`w-[137px]`, `text-[#333]`), không `style={{…}}` hay `StyleSheet` với số tuỳ ý.
- Cần giá trị mới thì thêm token trong `packages/design-tokens/tokens.json`; không định nghĩa màu hay kích thước riêng trong app.
- Màu theo ý nghĩa, không theo sắc: `danger`, `success`, `warning`, `info`, `primary`. Không dùng màu trạng thái để trang trí.
- Mọi màn hình chạy được ở chế độ sáng và tối. Người dùng chọn Theo hệ thống / Sáng / Tối bằng `ThemeSwitcher`, lưu trên thiết bị (D-31; mặc định ở `plans/03-design-system.md` mục 5.3).

## 3. Khung màn hình

| App | Khung | Ghi chú |
|---|---|---|
| Admin (theme `admin`) | `AppShell` (sidebar theo quyền, thanh trên có bộ chọn chi nhánh, ngôn ngữ, `ThemeSwitcher`) → `PageHeader` (tiêu đề, hành động chính) → nội dung | Danh sách dùng `DataTable` + `FilterBar`; form dùng `FormSection` + `FormActions` |
| POS | `PosShell` (thanh trạng thái: chi nhánh, nhân viên, ca, online/offline, đồng bộ) → vùng làm việc → `ActionBar` dưới cùng | Một hành động chính mỗi màn hình, đặt ở `ActionBar` |
| KDS | `KdsShell` → lưới `TicketCard` | Chữ lớn, đọc được từ xa |
| Web khách (theme `customer`) | `CustomerShell` (đầu trang thương hiệu) → nội dung → `BottomBar` (điện thoại) hoặc cột giỏ (máy tính) | Kiểu riêng, thương hiệu cao; ưu tiên di động nhưng đẹp cả trên máy tính |
| App khách, Zalo (theme `mobile`) | `CustomerShell` → nội dung → `BottomBar` (giỏ) trên `TabBar` | Một cột, chạm bằng ngón cái |

Màn hình danh sách Admin đầu tiên (M2: danh sách món) là mẫu chuẩn; các màn hình danh sách sau làm theo đúng mẫu đó.

## 4. Trạng thái

Mỗi vùng dữ liệu có đủ bốn trạng thái, đều là component trong bộ `ui-*` của nền tảng:

| Trạng thái | Component |
|---|---|
| Đang tải | `Skeleton` cho nội dung, `Spinner` cho hành động; không để màn hình trắng |
| Rỗng | `EmptyState` (một dòng giải thích + hành động tiếp theo) |
| Lỗi | `ErrorState` (thông báo ngắn + "Thử lại") |
| Không có quyền | `NoPermission` |

POS có thêm: `OfflineBanner` khi mất mạng, và trạng thái vô hiệu cho hành động cần mạng (thanh toán QR).

## 5. Hành động

- Mỗi màn hình một nút chính (`primary`).
- Hành động khó hoàn tác (huỷ đơn, huỷ món đã gửi bếp, hoàn tiền, xoá, đóng ca, chốt kỳ lương, thu hồi thiết bị) qua `ConfirmDialog` kiểu `danger` và dùng `DangerButton`.
- Hành động cần quyền: bọc trong `<Can permission="…">`; không có quyền thì ẩn. Trên POS, hành động duyệt tại chỗ mở `ApprovalDialog` (PIN quản lý).
- Nút đang xử lý thì vô hiệu và hiện tiến trình; không cho bấm hai lần.
- Phản hồi sau hành động dùng `Toast` của bộ nền tảng.

## 6. Chữ và định dạng

- Mọi chuỗi hiển thị qua `t()`; có đủ `vi` và `en` trong cùng thay đổi (`plans/40-i18n-copy.md`).
- Tiền hiển thị bằng `<Money>` / `formatMoney`; ngày giờ bằng `<DateTime>` / `formatDate`. Không tự nối chuỗi `"đ"` hay tự định dạng ngày.
- Tên dữ liệu danh mục (món, nhóm, tuỳ chọn) hiển thị bằng `localize(value)`, tự lùi về tiếng Việt khi thiếu tiếng Anh.
- Bố cục chịu được chuỗi tiếng Anh dài hơn hoặc ngắn hơn tiếng Việt: không đặt chiều rộng cố định cho nút và nhãn.

## 7. POS và cảm ứng

- Vùng chạm tối thiểu 44×44 px; nút bán hàng và bàn phím số tối thiểu 56 px.
- Không dựa vào hover. Không dùng thao tác nhấn giữ cho hành động chính.
- Thao tác bán hàng thường dùng không quá ba lần chạm từ màn hình bán hàng.
- Bàn phím số và nhập tiền dùng `NumPad` / `MoneyInput` của `@fnb/ui-pos`.

## 8. Khả năng truy cập

- Mọi điều khiển có nhãn; icon không chữ phải có `aria-label` (qua i18n).
- Dùng được bằng bàn phím trên Admin; thứ tự focus hợp lý; hộp thoại giữ focus.
- Độ tương phản đạt AA. Không truyền đạt trạng thái chỉ bằng màu.

## 9. Trước khi xong

1. Màn hình và component khớp mockup (`ui-mockup/`): tên, props, trạng thái, bố cục, luồng. Lệch thì sửa code, hoặc sửa mockup và plan cùng lúc.
2. Rà diff: `features/` và `routes/` không import thư viện UI gốc, không import từ app khác; không mã màu, không class giá trị tuỳ ý, không chuỗi hiển thị viết cứng, không tự định dạng tiền/ngày.
3. Component mới dùng lại được đã nằm đúng tầng (`packages/ui-<nền tảng>` hoặc `src/shared-components/` của app), đúng tên chuẩn, có mục trong trang mẫu và dòng trong README.
4. Đủ bốn trạng thái: tải, rỗng, lỗi, không quyền.
5. Đã xem màn hình ở cả `vi` và `en`, sáng và tối, trong app đang chạy.
6. Hành động nguy hiểm có xác nhận; hành động cần quyền có `<Can>`.
7. `pnpm verify` xanh.
