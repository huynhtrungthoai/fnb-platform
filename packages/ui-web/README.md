# @fnb/ui-web

Bộ component của **nền tảng Web**: `apps/admin` (theme `admin`) và `apps/customer-web` (theme `customer`, từ M10). Dựng kiểu shadcn trên Radix và Tailwind 4, chỉ dùng token của `@fnb/design-tokens`.

Đặc tả: `plans/03-design-system.md` mục 7 và mockup `ui-mockup/spec-web.dc.html`. Quy tắc: `docs/ui-rules.md`.

## Quy tắc của package

- Nơi duy nhất của nền tảng Web được import Radix, `lucide-react`, `class-variance-authority`.
- Không mã màu, không số pixel tuỳ ý, không điều kiện theo tên theme; khác biệt giữa `admin` và `customer` nằm trong token.
- Không gọi API, không chứa nghiệp vụ. Nhãn của màn hình vào qua props; nhãn mặc định chung lấy từ i18n namespace `common`.
- Mỗi component chạy đúng ở sáng/tối và vi/en; có test trong `src/components/*.test.tsx`.
- Thêm component: đặt đúng tên chuẩn (03 mục 7.3), export ở `src/index.ts`, thêm một dòng vào bảng dưới và một mục trong trang mẫu `/dev/components` của app.

## Cách dùng trong app

```css
/* apps/<app>/src/styles.css */
@import 'tailwindcss';
@import '@fnb/design-tokens/theme.css';
@import '@fnb/ui-web/styles.css';
@source '../../../packages/ui-web/src';
```

App bọc cây giao diện bằng `I18nextProvider` (instance từ `createI18n` của `@fnb/i18n`) và `ThemeProvider`, gắn một `Toaster`.

## Component

| Component | Việc | Props chính |
|---|---|---|
| `Button` | Nút hành động | `variant: 'primary' \| 'secondary' \| 'ghost'`, `size?: 'sm' \| 'md' \| 'lg'` (bỏ trống: theo theme, admin 40 px), `icon?`, `iconPosition?`, `loading?`, `disabled?`, `fullWidth?` |
| `Input` | Ô nhập một dòng | `label`, `value`, `onChange(value)`, `hint?`, `error?`, `prefix?`, `suffix?`, `disabled?` |
| `Card` | Thẻ nội dung | `title?`, `actions?`, `padding?: 'md' \| 'none'` (`none` cho danh sách, bảng chạy sát mép) |
| `Dialog` | Hộp thoại, giữ focus, Esc đóng | `open`, `onClose`, `title`, `description?`, `size?: 'sm' \| 'md' \| 'lg'`, `footer?` |
| `Toaster`, `toast()`, `dismissToast()` | Phản hồi sau hành động | `toast({ tone?: 'success' \| 'danger' \| 'info', message, action? })` |
| `Spinner` | Hành động đang chạy | `size?: 'sm' \| 'md' \| 'lg'`, `label?` |
| `Skeleton` | Nội dung đang tải | `shape?: 'line' \| 'rect' \| 'row'` |
| `EmptyState` | Vùng dữ liệu rỗng | `title?`, `description?`, `action?` |
| `ErrorState` | Vùng dữ liệu lỗi | `message?`, `onRetry?`, `retryLabel?` |
| `Icon` | Icon lucide theo tên | `name: IconName`, `size?: 16 \| 20 \| 24`, `label?` |
| `LanguageSwitcher` | Chọn vi/en | `value: 'vi' \| 'en'`, `onChange` |
| `ThemeSwitcher` | Chọn Theo hệ thống / Sáng / Tối | `value: 'system' \| 'light' \| 'dark'`, `onChange` |
| `AppShell` | Khung trang Admin: menu trái, thanh trên, nội dung rộng tối đa `content-max`; dưới `lg` menu thành ngăn kéo mở từ thanh trên (M1-18) | `sidebar`, `topbar`, `children` |
| `Sidebar` | Menu chính, ẩn mục thiếu quyền (đọc `PermissionProvider`), ẩn nhóm rỗng | `label`, `groups: NavGroup[]` (`{ key, label?, items: NavItem[] }`; `NavItem`: `key`, `label`, `icon`, `href`, `permission?`), `activeKey?`, `onNavigate?(href)`, `brand?` |
| `PageHeader` | Tiêu đề trang, đường dẫn, hành động | `title`, `description?`, `breadcrumb?: Crumb[]` (`{ label, onSelect? }`), `actions?` |
| `Select` | Chọn một giá trị trong danh sách ngắn (Radix Select) | `label`, `hideLabel?`, `options: SelectOption[]` (`value`, `label`, `description?`, `disabled?`), `value` (`''` là chưa chọn), `onChange`, `placeholder?`, `hint?`, `error?`, `disabled?` |
| `Menu` | Danh sách thao tác bật ra (Radix DropdownMenu) | `trigger`, `items: MenuItem[]` (`key`, `label`, `icon?`, `onSelect`, `tone?: 'danger'`, `disabled?`), `header?`, `align?` |
| `PermissionProvider`, `usePermission()`, `Can` | Quyền của người đang dùng tại chi nhánh đang làm việc; app tính từ `/auth/me` và bọc cây giao diện. Ngoài provider không có quyền nào | `PermissionProvider`: `permissions: PermissionCode[]`; `Can`: `permission`, `fallback?` |
| `NoPermission` | Thay cho màn hình hay vùng không có quyền; nêu tên quyền còn thiếu | `permission?`, `title?`, `action?` |
| `FormSection`, `FormActions` | Nhóm ô nhập có tiêu đề (lưới 1 cột, 2 cột từ `md`); hàng nút cuối form: nguy hiểm bên trái, nút chính bên phải | `FormSection`: `title`, `description?`; `FormActions`: `primary`, `secondary?`, `danger?` |
| `Badge` | Nhãn trạng thái hay thẻ; trạng thái luôn kèm icon (M1-19) | `tone?: 'neutral' \| 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'`, `icon?` |
| `Tabs` | Chia nội dung một màn hình (Radix Tabs), gạch dưới tab đang chọn | `label`, `items: TabItem[]` (`value`, `label`, `content`, `disabled?`), `value`, `onChange` |
| `DangerButton` | Hành động khó hoàn tác; `solid` chỉ dùng trong `ConfirmDialog` | `variant?: 'outline' \| 'solid'`, `icon` (bắt buộc), `loading?` |
| `IconButton` | Nút chỉ có icon | `icon`, `label` (bắt buộc, làm `aria-label`), `variant?: 'ghost' \| 'outline'` |
| `ConfirmDialog` | Hỏi lại trước khi chạy hành động; kiểu `danger` dùng `DangerButton` đặc | `open`, `onClose`, `onConfirm(reason)`, `tone?`, `title`, `description?`, `confirmLabel`, `confirmIcon?`, `reasonRequired?`, `reasonLabel?`, `loading?` |
| `SegmentedControl` | Hàng lựa chọn loại trừ nhau (nền của hai switcher; bộ lọc nhanh) | `label`, `value`, `options: SegmentedOption[]` (`value`, `label`, `icon?`), `onChange` |
| `DataTable` | Bảng chuẩn của Admin: hàng chờ khi tải, `EmptyState`, `ErrorState` có "Thử lại", tô hàng, phân trang bên dưới (M1-20) | `label`, `columns: Column[]` (`key`, `header`, `cell(row)`, `align?`, `hideOnMobile?`), `rows`, `rowKey`, `loading?`, `error?`, `onRetry?`, `empty?`, `rowTone?(row)`, `footer?` |
| `FilterBar` | Hàng lọc trên bảng: ô tìm, bộ lọc, "Xoá bộ lọc" khi đang lọc | `search?: { label, value, onChange, placeholder? }`, `children`, `isFiltered`, `onClear` |
| `Pagination` | "Hiển thị 1–20 trên 31" và nút trang | `page`, `pageSize`, `total`, `onChange(page)` |
| `Checkbox` | Ô tick có nhãn (Radix Checkbox), hỗ trợ trạng thái một phần | `checked: boolean \| 'indeterminate'`, `onChange`, `label`, `hideLabel?`, `description?`, `disabled?` |
| `LocalizedInput` | Tên hai ngôn ngữ: tiếng Việt bắt buộc, nhắc khi thiếu tiếng Anh | `label`, `value: LocalizedText`, `onChange`, `error?`, `disabled?` |
| `ThemeProvider`, `useThemeMode()` | Gắn `data-theme`, `data-mode` lên `<html>`, lưu lựa chọn trên thiết bị (`localStorage`), theo hệ điều hành khi chọn "Theo hệ thống" | `theme: 'admin'`, `storageKey?` |



Chưa có (làm ở mốc ghi trong 03 mục 10): `Money`, `DateTime`, `ProductImage`, `ImageUpload`, `MoneyInput` (M2).
