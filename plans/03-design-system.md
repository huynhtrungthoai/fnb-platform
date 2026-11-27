# 03. Design system: token chung, component theo ba nền tảng

## 1. Nguyên tắc

1. **Màu và metric dùng chung.** Màu, khoảng cách, bo góc, cỡ chữ, bóng, chuyển động, vùng chạm khai báo một lần ở `packages/design-tokens`; mọi app (web, Expo, Zalo) lấy từ đó.
2. **Component chia theo ba nền tảng giao diện** (D-14): **Web**, **POS**, **Mobile**. Mỗi nền tảng một bộ component trong `packages/ui-<nền tảng>`, dùng chung cho các app của nền tảng đó. App không dùng bộ của nền tảng khác.
3. **Theme theo nền tảng, sáng/tối chọn được** (D-31). Cùng một bộ component, mỗi app gắn một theme (`admin`, `customer`, `pos`, `kds`, `mobile`); người dùng chọn Theo hệ thống / Sáng / Tối.
4. **Màn hình chỉ ghép.** Màn hình không tự dựng nút, ô nhập, bảng, hộp thoại; lấy từ bộ của nền tảng hoặc `src/shared-components` của app.
5. **Nền trung tính, màu có nghĩa.** Bề mặt trắng/đen/xám ấm; màu chỉ dùng cho hành động chính và trạng thái. Kênh khách được dùng màu thương hiệu nhiều hơn (mục 5.2).
6. **POS ưu tiên tốc độ và cảm ứng.** Vùng chạm lớn, ít bước, đọc rõ dưới ánh sáng quán.
7. **Hai ngôn ngữ, hai chế độ sáng/tối** là yêu cầu của mọi component, không phải việc làm sau.

File này là đặc tả. Checklist khi dựng màn hình: `docs/ui-rules.md`. Mockup: `ui-mockup/` (canvas bốn trang Nền tảng / POS / Web / Mobile; đặc tả `spec-<nền tảng>` và luồng màn hình). Dev dựng UI theo mockup. File này và mockup luôn khớp: sửa bên nào thì sửa bên kia trong cùng thay đổi.

## 2. Màu

Giá trị cụ thể (mã màu sáng/tối, thang màu gốc, độ tương phản) lấy từ thương hiệu của quán: [07-brand.md](07-brand.md) mục 2 và 3. Mục này chỉ nêu vai trò.

### 2.1 Trung tính

| Token | Dùng cho |
|---|---|
| `bg`, `bg-subtle`, `bg-muted` | Nền trang, nền thẻ, nền vùng phụ |
| `overlay` | Lớp phủ sau hộp thoại và ngăn kéo |
| `border`, `border-strong` | Đường viền, đường chia |
| `text`, `text-muted`, `text-subtle`, `text-inverse` | Chữ chính, chữ phụ, gợi ý, chữ trên nền đậm |

Mỗi token có giá trị cho chế độ sáng và tối. Trung tính ngả nâu ấm, không dùng xám lạnh.

### 2.2 Màu có nghĩa

| Token | Ý nghĩa | Dùng cho |
|---|---|---|
| `primary` | Hành động chính, thương hiệu (đỏ của logo) | Nút chính, liên kết, mục đang chọn |
| `accent` | Nhấn (cam của logo) | Khuyến mãi, món mới, đang làm |
| `success` | Thành công, sẵn sàng | Đã thanh toán, món xong |
| `warning` | Cần chú ý | Tồn thấp, phiếu sắp quá giờ, chờ đồng bộ |
| `danger` | Nguy hiểm, lỗi | Huỷ, xoá, hoàn tiền, quá giờ, lỗi |
| `info` | Thông tin | Ghi chú, hướng dẫn |

- Mỗi màu có bốn token: chính, chữ trên nền chính (`-fg`), nền nhạt (`-subtle`), chữ trên nền nhạt (`-text`).
- `primary` là đỏ thương hiệu, nên `danger` dùng đỏ hồng lệch sắc và `DangerButton` mặc định là kiểu viền có icon (07 mục 3.3).
- Mỗi màn hình một nút `primary`.
- Không dùng màu trạng thái để trang trí.

### 2.3 Trạng thái nghiệp vụ

Màu trạng thái đơn, phiếu bếp (và bàn, khi làm EXT-47) được ánh xạ một lần trong token (`status.order.*`, `status.ticket.*`, `status.table.*`). Component (`StatusBadge`, `TicketCard`, `OrderTracker`) đọc token này; không app nào tự chọn màu cho trạng thái.

| Trạng thái | Màu |
|---|---|
| Đơn hoàn tất · Món xong · Máy in sẵn sàng | `success` |
| Đơn đang phục vụ · Đang làm | `accent` |
| Chờ món · Chờ xác nhận · Chờ đồng bộ · Máy in còn lệnh chờ | `warning` |
| Quá giờ · Đã huỷ · Lỗi đồng bộ · Máy in mất kết nối | `danger` |
| Ghi chú · Đã đặt trước | `info` |
| Nháp · Ngừng dùng · Tạm khoá | trung tính |

Hai trạng thái cùng màu thì phân biệt bằng icon và nhãn; không trạng thái nào chỉ dựa vào màu.

### 2.4 Biểu đồ

Bảng màu biểu đồ là token riêng (`chart-1` … `chart-8`, giá trị ở 07 mục 3.5), dùng theo thứ tự. Khả năng phân biệt với người mù màu **chưa kiểm**; kiểm và chỉnh ở M7 (07 mục 3.5).

## 3. Chữ

| Token | Dùng cho |
|---|---|
| `text-xs` … `text-3xl` | Thang cỡ chữ dùng chung |
| `font-sans` | Be Vietnam Pro (đề xuất, 07 mục 4), lùi về phông hệ thống |
| `font-display` | Baloo 2, chỉ cho tiêu đề thương hiệu trong theme `customer` và `mobile` |
| `font-mono` | Mã đơn, mã SKU, số liệu canh cột |

- Số tiền dùng chữ số cùng bề rộng (`tabular-nums`).
- KDS và màn hình bán hàng dùng thang chữ lớn hơn một bậc (`density="touch"`).
- Không cắt dấu tiếng Việt: chiều cao dòng tối thiểu 1.4 cho chữ thường.

## 4. Khoảng cách, bo góc, bóng, chuyển động

| Loại | Token |
|---|---|
| Khoảng cách | Thang 4 px: `space-1` (4) … `space-12` (48) |
| Bo góc | `radius-sm` (6), `radius-md` (10), `radius-lg` (16), `radius-full` |
| Bóng | `shadow-sm` (thẻ), `shadow-md` (menu), `shadow-lg` (hộp thoại) |
| Chuyển động | `duration-fast` (120 ms), `duration-base` (200 ms); tôn trọng "giảm chuyển động" của hệ điều hành |
| Vùng chạm | `touch-min` (44 px), `touch-pos` (56 px) |
| Kích thước điều khiển | `control-sm` (36), `control-md` (40), `control-lg` (48), `control-xl` (56); theme chọn mức mặc định (mục 5.2) |
| Kích thước bố cục | `size-sidebar`, `size-content-max`, `size-cart-panel`, `size-dialog-sm/md/lg`, `size-product-tile`, `size-receipt-k57`, `size-receipt-k80` (xem trước bill) |
| Thứ tự lớp | `z-dropdown`, `z-sticky`, `z-drawer`, `z-dialog`, `z-popover` (danh sách bật ra của `Select`, `Menu`: nằm trên hộp thoại vì có thể mở từ trong hộp thoại), `z-toast` |

## 5. Token, theme và chế độ sáng/tối

### 5.1 Một nguồn, ba lớp

Package `packages/design-tokens` (`@fnb/design-tokens`), nguồn là `tokens.json`. Package này **chỉ chứa giá trị**, không chứa component.

| Lớp | Nội dung | Ai đọc |
|---|---|---|
| `palette` | Bảng màu gốc (07 mục 2) | Chỉ lớp `semantic`; app không dùng thẳng |
| `semantic` | Màu theo vai trò, mỗi token có giá trị `light` và `dark` (07 mục 3); metric chung (mục 3, 4) | Mọi theme |
| `theme.<tên>` | Giá trị ghi đè của từng theme, cũng có `light` và `dark` | Component qua biến CSS / đối tượng theme |

Sinh ra cho từng nền tảng:

| Đầu ra | Dùng ở |
|---|---|
| Biến CSS + theme Tailwind 4: `[data-theme="admin"]`, `[data-theme="customer"]`… kết hợp `[data-mode="light"|"dark"]` | `ui-web`, `ui-pos` |
| Đối tượng theme TypeScript (NativeWind / StyleSheet), theo theme và chế độ | `ui-mobile` (bản React Native, nếu có), `pos-mobile` |
| Biến CSS cho Mini App | `ui-mobile` trong Zalo |

Cách dùng trên web (M0-06):

| Thứ | Quy ước |
|---|---|
| File sinh ra | `@fnb/design-tokens/theme.css` (từ `pnpm --filter @fnb/design-tokens build`); app import sau `@import 'tailwindcss'` |
| Biến CSS | `--fnb-<token>`: màu theo `[data-mode]`, metric của theme theo `[data-theme]`, đặt trên thẻ `<html>` |
| Class Tailwind màu | Tên màu = tên token: `bg-bg`, `bg-bg-subtle`, `text-text`, `text-text-muted`, `border-border`, `bg-primary`, `text-primary-fg`, `bg-danger-subtle`… Bảng màu mặc định của Tailwind bị gỡ (`bg-red-500` không tồn tại) |
| Metric theo theme | `h-control`, `rounded-control`, `text-control`, `text-body`: cùng class, admin ra 40 px, POS ra 56 px |
| Metric cố định | `h-control-sm/md/lg/xl`, `min-h-touch-min`, `min-h-touch-pos`, `size-icon-sm/md/lg`, `max-w-dialog-sm/md/lg`, `max-w-content-max`, `w-sidebar`, `z-dropdown/sticky/drawer/dialog/popover/toast`, `duration-fast/base` |
| Đối tượng theme TypeScript | `themes[<theme>][<mode>]` và `metrics` từ `@fnb/design-tokens` (cho bản native) |

Chưa có trong `tokens.json` ở M0, thêm khi tới mốc dùng: `status.*` (M3, M4, khi có enum trạng thái), `size-cart-panel`, `size-product-tile`, `size-receipt-k57/k80` (M3), `font-display` và theme `customer`, `kds`, `mobile`.

- Không sửa file sinh ra; sửa `tokens.json` rồi chạy lại.
- App và package `ui-*` không định nghĩa màu hay kích thước mới. Cần giá trị mới thì thêm token.
- `contrast.test.ts` kiểm mọi cặp chữ/nền ở **mọi theme × hai chế độ** (07 mục 3).

### 5.2 Các theme

| Theme | App | Mức thương hiệu | Đặc điểm |
|---|---|---|---|
| `admin` | `apps/admin` | Thấp, đơn giản | Gọn để đọc nhiều dữ liệu: điều khiển `control-md` (40), hàng bảng 44 px, `radius-md`, chỉ `font-sans`. Nền trắng/trung tính; đỏ chỉ ở nút chính và mục menu đang chọn. Không hoạ tiết, không ảnh lớn, không bóng đậm |
| `customer` | `apps/customer-web` | Cao, kiểu riêng | Đầu trang `brick` + hoạ tiết sóng, tiêu đề `font-display`, nút `control-lg` (48) với `radius-lg`, ảnh món 4:3 lớn, `accent` cho khuyến mãi, nhiều khoảng trắng. Một cột trên điện thoại, lưới 2–3 cột trên máy tính; giỏ ở `BottomBar` (điện thoại) hoặc cột phải (máy tính) |
| `pos` | `apps/pos` (bán hàng, quầy) | Thấp–vừa | `density="touch"`: điều khiển `control-xl` (56), chữ lớn hơn một bậc; màu trạng thái nổi nhất màn hình |
| `kds` | `apps/pos` route `/kitchen` | Thấp | Chữ rất lớn đọc từ xa; đầu phiếu tô đặc theo trạng thái |
| `mobile` | `apps/customer-app`, `apps/zalo-mini-app` | Cao | Giống `customer`, chỉnh cho điện thoại: nút chính rộng hết màn 52 px, `TabBar` dưới, `Sheet` từ dưới lên |

Hai theme `customer` và `mobile` theo cùng quy tắc thương hiệu (07 mục 7) để khách thấy một quán dù vào kênh nào.

### 5.3 Chế độ sáng/tối

| Mục | Quy định |
|---|---|
| Lựa chọn | `system` (theo hệ điều hành) · `light` · `dark`, qua `ThemeSwitcher` |
| Nơi đặt `ThemeSwitcher` | Admin: menu tài khoản. Web khách, mobile: trang tài khoản. POS, KDS: menu thiết bị (nhân viên đổi tại máy) |
| Lưu | Trên thiết bị: `localStorage` (web), bộ nhớ của Expo, bộ nhớ của Zalo. Chưa lưu theo tài khoản |
| Mặc định | Admin, web khách, mobile: `system`. POS: `light`. KDS: `dark` |
| Zalo | Nếu SDK cho đọc giao diện sáng/tối của Zalo thì `system` theo Zalo, không thì theo hệ điều hành (kiểm ở M12) |
| Đổi chế độ | Không tải lại trang; chuyển `data-mode` (web) hoặc context theme (native); tôn trọng "giảm chuyển động" |
| Áp dụng | Mọi màn hình và component chạy đúng ở cả hai chế độ; trang mẫu có nút đổi để soát |

## 6. Icon và hình

- Một bộ icon duy nhất cho mọi app (`lucide`; bản web và bản React Native của cùng bộ), dùng qua component `Icon` của bộ nền tảng.
- Kích thước icon theo token (16, 20, 24).
- Ảnh món dùng `ProductImage` (tỉ lệ theo theme: 1:1 ở POS, 4:3 ở kênh khách; ảnh thay thế khi thiếu, tải lười).

## 7. Component theo nền tảng

### 7.1 Ba bộ

| Nền tảng | App | Package | Nền component | Theme |
|---|---|---|---|---|
| **Web** | `admin`, `customer-web` | `packages/ui-web` (`@fnb/ui-web`) | shadcn/ui (Radix + Tailwind 4) | `admin`, `customer` |
| **POS** | `pos` (POS + KDS) | `packages/ui-pos` (`@fnb/ui-pos`) | shadcn/ui, `density="touch"` | `pos`, `kds` |
| **Mobile** | `zalo-mini-app` (và bản native của app khách nếu sau này viết) | `packages/ui-mobile` (`@fnb/ui-mobile`) | Một thiết kế chung, mỗi công nghệ một bản code (D-43) | `mobile` |

- **POS Android** (`apps/pos-mobile`): giao diện native riêng (D-03), viết trong `apps/pos-mobile/src/shared-components` theo đúng thiết kế, tên component và token của nền tảng POS; không dùng lại code của `ui-pos`. Có hai bố cục: tablet và máy cầm tay (D-35).
- **Mobile** (D-43): `ui-mobile` trước hết là **đặc tả thiết kế chung** (tên component, kiểu props, token, theme `mobile`). Mỗi công nghệ viết bản component của mình từ đặc tả đó: bản React DOM cho Zalo Mini App, bản React Native nếu sau này có app native. Các bản cùng tên, cùng props, cùng trang mẫu để soát đồng bộ.
- **App khách** (D-42) là vỏ WebView bọc web khách, nên giao diện của nó là `customer-web` với `ui-web` theme `customer`; web khách vì vậy phải responsive tốt ở bề rộng điện thoại và cảm giác như app (thanh dưới, vùng chạm lớn).
- `ui-web` và `ui-pos` dùng cùng nền shadcn nhưng là hai bộ: Admin và web khách không cần `NumPad`, `TicketCard`; POS không cần `DataTable` đầy đủ. Primitive giống nhau (nút, ô nhập, hộp thoại) được viết ở mỗi bộ theo mật độ của nó, không import chéo.

### 7.2 Hai tầng trong một nền tảng

| Tầng | Chứa | Ví dụ |
|---|---|---|
| `packages/ui-<nền tảng>` | Component dùng lại được ở **mọi app** của nền tảng, đọc theme qua token | `Button`, `DataTable`, `EmptyState`, `ThemeSwitcher` |
| `apps/<app>/src/shared-components` | Component dùng lại **chỉ trong app đó**, ghép từ bộ của nền tảng | `PermissionMatrix` (admin), `ReceiptPreview` |

Khi app thứ hai của nền tảng cần một component trong `src/shared-components` thì chuyển nó lên package trong cùng thay đổi.

### 7.3 Tên chuẩn

Component làm cùng một việc thì mang **cùng tên** ở mọi nền tảng. Props không buộc giống nhau giữa các nền tảng, nhưng trong một nền tảng chỉ có một bản.

| Nhóm | Tên chuẩn | Nền tảng |
|---|---|---|
| Khung | `AppShell`, `Sidebar`, `PageHeader` | Web (admin) |
| | `CustomerShell`, `BottomBar` | Web (customer), Mobile |
| | `PosShell`, `KdsShell`, `ActionBar` | POS |
| | `TabBar`, `Sheet` | Mobile |
| Hành động | `Button`, `DangerButton`, `IconButton`, `Link`, `Menu` | Cả ba |
| Nhập liệu | `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio`, `Switch`, `DatePicker`, `DateRangePicker`, `ImageUpload`, `LocalizedInput` | Web |
| | `MoneyInput`, `QuantityStepper`, `NumPad`, `PinInput`, `CashCountInput` | POS (`QuantityStepper`, `PinInput` cả ở Web và Mobile) |
| Form | `Form`, `FormField`, `FormSection`, `FormActions` | Web, Mobile |
| Dữ liệu | `DataTable`, `FilterBar`, `Pagination`, `StatCard`, `Chart` | Web |
| | `Card`, `List`, `Badge`, `StatusBadge`, `Tabs` | Cả ba |
| Phản hồi | `Dialog`, `ConfirmDialog`, `Drawer`, `Toast`, `Tooltip`, `Skeleton`, `Spinner` | Cả ba (`Tooltip` không dùng ở POS) |
| | `ApprovalDialog` | POS |
| Trạng thái | `EmptyState`, `ErrorState`, `NoPermission` | Cả ba |
| | `OfflineBanner`, `SyncStatus`, `PrinterStatus` | POS |
| Định dạng | `Money`, `DateTime`, `Duration`, `Icon`, `ProductImage` | Cả ba |
| Quyền | `Can` | Web, POS |
| POS/KDS | `ProductTile`, `CategoryTabs`, `CartLine`, `ModifierGroupPicker`, `TicketCard`, `PaymentMethodTile`, `QrDisplay`, `ReceiptPreview`, `StaffPicker` (chọn nhân viên trước PIN), `QueueNumber` (số thứ tự lớn), `ItemTotals` (KDS: tổng món đang chờ) (`TableTile` hoãn theo D-26) | POS |
| Kênh khách | `ProductCard`, `CategoryChips`, `ModifierGroupPicker`, `VoucherCard`, `OrderTracker`, `QrDisplay` | Web (customer), Mobile |
| | `CartPanel` (cột giỏ trên máy tính) | Web (customer) |
| | `MemberCard` (điểm thành viên), `PermissionCard` (Zalo xin quyền số điện thoại) | Mobile |
| Cài đặt | `LanguageSwitcher`, `ThemeSwitcher` | Cả ba |

Trong `ui-web`, component của kênh khách (`ProductCard`, `CustomerShell`…) và của admin (`DataTable`, `AppShell`…) cùng nằm một package; theme quyết định vẻ ngoài, app chỉ import thứ nó cần.

### 7.4 Quy tắc cho `ui-*` và `src/shared-components`

| Quy tắc | Chi tiết |
|---|---|
| Chỉ dùng token | Không mã màu, không số pixel tuỳ ý. Khác biệt giữa `admin` và `customer` nằm ở token theme, không viết `if (theme === 'customer')` trong component |
| Biến thể bằng prop | Cần biến thể thì thêm `variant`/`size`/`density`; không tạo bản sao |
| Ngoại lệ cho code sinh từ shadcn | Được dùng biến thể theo trạng thái (`data-[state=open]:…`, `aria-[…]:…`) và giá trị trỏ tới biến CSS của token hay của Radix (`w-(--radix-popover-trigger-width)`). Vẫn cấm `w-[137px]`, `text-[#333]`: đổi sang token trước khi commit. Rule ESLint ở M0-14 phân biệt hai loại này |
| Thư viện UI gốc | Radix, shadcn primitives, thư viện native hay của Zalo chỉ được import trong `packages/ui-*`. `src/shared-components`, `features/`, `routes/` ghép từ `@fnb/ui-<nền tảng>` |
| Đúng nền tảng | App chỉ import `ui-*` của nền tảng mình: `admin`, `customer-web` → `ui-web`; `pos` → `ui-pos`; `customer-app`, `zalo-mini-app` → `ui-mobile`. Không import component của app khác |
| Không nghiệp vụ, không API | Không gọi `api-client`, không chứa logic của một tính năng. Dữ liệu vào qua props. Ngoại lệ: `Can` đọc quyền từ context của app |
| Chuỗi hiển thị | Nhãn truyền qua props. Nhãn mặc định chung ("Thử lại", "Huỷ") lấy từ i18n namespace `common`; không viết cứng |
| Sáng/tối, vi/en, mọi theme | Mỗi component chạy đúng ở mọi theme nó được dùng × hai chế độ × hai ngôn ngữ |
| An toàn với dữ liệu thiếu | Props tuỳ chọn có mặc định; danh sách rỗng hiển thị được; không crash khi thiếu ảnh, thiếu nhãn |
| Truy cập được | Nhãn, focus, bàn phím (web), tương phản AA |
| Có tài liệu | Một dòng trong `README.md` của package (hoặc của `src/shared-components`) và một mục trong trang mẫu (mục 7.5) |

### 7.5 Trang mẫu component

Mỗi app có màn hình chỉ chạy ở môi trường dev (`/dev/components` trên web, `DevComponents` trên Expo) hiển thị bộ của nền tảng trong theme của app, cùng `src/shared-components` của app, có nút đổi sáng/tối và vi/en. Admin và web khách cùng xem `ui-web`, mỗi bên ở theme của mình. Dùng thay cho Storybook.

## 8. Khung màn hình

| App | Bố cục |
|---|---|
| Admin | `AppShell`: sidebar trái (menu theo quyền) · thanh trên (bộ chọn chi nhánh, ngôn ngữ, tài khoản có `ThemeSwitcher`) · nội dung rộng tối đa theo token |
| POS (tablet ngang) | `PosShell`: thanh trạng thái trên · trái: lưới món · phải: giỏ hàng · `ActionBar` dưới |
| POS (điện thoại dọc) | Thanh trạng thái · một cột · giỏ hàng dạng `Drawer` |
| KDS | `KdsShell`: lưới phiếu toàn màn hình, lọc theo trạm ở thanh trên, cột tổng món |
| Web khách | `CustomerShell`: đầu trang thương hiệu · nội dung một cột (điện thoại) hoặc lưới (máy tính) · giỏ ở `BottomBar` hoặc cột phải |
| App khách, Zalo | `CustomerShell` · nội dung một cột · `BottomBar` (giỏ) trên `TabBar` |

Điểm gãy bố cục là token (`sm`, `md`, `lg`, `xl`).

## 9. Trạng thái dùng chung

Mọi nền tảng hiển thị các trạng thái sau bằng component cùng tên trong bộ của mình.

| Trạng thái | Hiển thị |
|---|---|
| Đang tải | `Skeleton` đúng hình dạng nội dung |
| Rỗng | `EmptyState`: một dòng giải thích + hành động tiếp theo (kênh khách được dùng hoạ tiết sóng) |
| Lỗi | `ErrorState`: thông báo ngắn + "Thử lại" |
| Không có quyền | `NoPermission` |
| Mất mạng (POS) | `OfflineBanner`; hành động cần mạng bị vô hiệu kèm lý do |
| Chờ đồng bộ (POS) | `SyncStatus`: số lệnh chờ, lệnh lỗi |
| Đang xử lý hành động | Nút vô hiệu + `Spinner` |
| Xác nhận nguy hiểm | `ConfirmDialog` kiểu `danger` |
| Cần duyệt | `ApprovalDialog` (PIN quản lý, POS) |

## 10. Việc cần làm

- [x] M0 (token ở M0-06, component ở M0-07): `packages/design-tokens` ba lớp (`palette`, `semantic`, `theme`) với theme `admin` và `pos`; bộ sinh biến CSS/Tailwind theo `data-theme` × `data-mode`. `packages/ui-web` và `packages/ui-pos` nền: `Button`, `Input`, `Card`, `Dialog`, `Toast` (`Toaster` + `toast()`), `Spinner`, `Skeleton`, `EmptyState`, `ErrorState`, `Icon`, `LanguageSwitcher`, `ThemeSwitcher`, `ThemeProvider`, README; trang mẫu `/dev/components` trong `apps/admin` và `apps/pos`. Hai package `ui-*` được app dùng thẳng từ mã nguồn (không build riêng), nên stylesheet của app phải có `@source` trỏ tới `packages/ui-<nền tảng>/src`.
- [~] M1 (`ui-web`): `AppShell`, `Sidebar`, `PageHeader`, `DataTable`, `FilterBar`, bộ form, `ConfirmDialog`, `Can`, `NoPermission`, `LocalizedInput`. App admin: `PermissionMatrix` trong `src/shared-components`. *M1-18 xong: `AppShell`, `Sidebar`, `PageHeader`, `Select`, `Menu`, `PermissionProvider` + `usePermission` + `Can`, `NoPermission`, `FormSection`, `FormActions`; M1-19: `Badge`, `Tabs`, `DangerButton`, `IconButton`, `ConfirmDialog`, `Card` thêm `padding`; M1-20: `DataTable`, `FilterBar`, `Pagination`, `Checkbox`, `LocalizedInput`, export `SegmentedControl`; app admin có `PermissionMatrix`, `FormTextField`, `PermissionGate` trong `shared-components`. Form dùng react-hook-form + `zodResolver` (`@hookform/resolvers`) với schema của contract; lỗi ô nhập dịch theo mã lỗi Zod (`common:validation.*`), không hiện câu của Zod.*
- [ ] M2 (`ui-web`): `ImageUpload`, `MoneyInput`, `Money`, `ProductImage`, sắp xếp kéo thả.
- [ ] M3 (`ui-pos`): `PosShell`, `ActionBar`, `ProductTile`, `CategoryTabs`, `CartLine`, `ModifierGroupPicker`, `NumPad`, `PinInput`, `ApprovalDialog`, `OfflineBanner`, `SyncStatus`, `PaymentMethodTile`, `Money`, `ConfirmDialog`, `Can`, `CashCountInput`, `PrinterStatus`, `ReceiptPreview`.
- [ ] M4 (`ui-pos`): theme `kds`, `KdsShell`, `TicketCard` (`TableTile` hoãn theo D-26).
- [ ] M5 (`ui-pos`): `QrDisplay`.
- [ ] M7 (`ui-web`): `StatCard`, `Chart`, `DateRangePicker`.
- [ ] M8 (pos-mobile): bản native của các component nền tảng POS, cùng tên với `ui-pos`, bố cục tablet và máy cầm tay (D-03, D-35).
- [ ] M10 (`ui-web`): theme `customer`, `CustomerShell`, `BottomBar`, `ProductCard`, `CategoryChips`, `VoucherCard`, `OrderTracker`, hoạ tiết sóng.
- [ ] M11 (app khách): vỏ WebView, không có bộ component riêng (D-42).
- [ ] M12 (`ui-mobile`): đặc tả thiết kế chung và bản React DOM cho Zalo Mini App: theme `mobile`, `TabBar`, `Sheet` và bộ kênh khách (D-43).

## 11. Câu hỏi mở

- Zalo Mini App dùng thư viện giao diện của Zalo hay tự dựng trên token (chốt ở M12-02).
- Có cần lưu lựa chọn sáng/tối theo tài khoản (đổi máy vẫn giữ) không; hiện chỉ lưu trên thiết bị.
