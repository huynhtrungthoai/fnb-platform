# @fnb/ui-web

Bộ component của **nền tảng Web**: `apps/admin` (theme `admin`) và `apps/customer-web` (theme `customer`, từ M10). Dựng kiểu shadcn trên Radix và Tailwind 4, chỉ dùng token của `@fnb/design-tokens`.

Đặc tả: `plans/03-design-system.md` mục 7 và mockup `ui-mockup/spec-web.dc.html`. Quy tắc: `docs/ui-rules.md`.

## Quy tắc của package

- Nơi duy nhất của nền tảng Web được import Radix, `lucide-react`, `class-variance-authority`.
- Không mã màu, không số pixel tuỳ ý, không điều kiện theo tên theme; khác biệt giữa `admin` và `customer` nằm trong token.
- Không gọi API, không chứa nghiệp vụ. Nhãn của màn hình vào qua props; nhãn mặc định chung lấy từ i18n namespace `common`.
- Mỗi component chạy đúng ở sáng/tối và vi/en; có test trong `src/components/components.test.tsx`.
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

## Component (M0)

| Component | Việc | Props chính |
|---|---|---|
| `Button` | Nút hành động | `variant: 'primary' \| 'secondary' \| 'ghost'`, `size?: 'sm' \| 'md' \| 'lg'` (bỏ trống: theo theme, admin 40 px), `icon?`, `iconPosition?`, `loading?`, `disabled?`, `fullWidth?` |
| `Input` | Ô nhập một dòng | `label`, `value`, `onChange(value)`, `hint?`, `error?`, `prefix?`, `suffix?`, `disabled?` |
| `Card` | Thẻ nội dung | `title?`, `actions?` |
| `Dialog` | Hộp thoại, giữ focus, Esc đóng | `open`, `onClose`, `title`, `description?`, `size?: 'sm' \| 'md' \| 'lg'`, `footer?` |
| `Toaster`, `toast()`, `dismissToast()` | Phản hồi sau hành động | `toast({ tone?: 'success' \| 'danger' \| 'info', message, action? })` |
| `Spinner` | Hành động đang chạy | `size?: 'sm' \| 'md' \| 'lg'`, `label?` |
| `Skeleton` | Nội dung đang tải | `shape?: 'line' \| 'rect' \| 'row'` |
| `EmptyState` | Vùng dữ liệu rỗng | `title?`, `description?`, `action?` |
| `ErrorState` | Vùng dữ liệu lỗi | `message?`, `onRetry?`, `retryLabel?` |
| `Icon` | Icon lucide theo tên | `name: IconName`, `size?: 16 \| 20 \| 24`, `label?` |
| `LanguageSwitcher` | Chọn vi/en | `value: 'vi' \| 'en'`, `onChange` |
| `ThemeSwitcher` | Chọn Theo hệ thống / Sáng / Tối | `value: 'system' \| 'light' \| 'dark'`, `onChange` |
| `ThemeProvider`, `useThemeMode()` | Gắn `data-theme`, `data-mode` lên `<html>`, lưu lựa chọn trên thiết bị (`localStorage`), theo hệ điều hành khi chọn "Theo hệ thống" | `theme: 'admin'`, `storageKey?` |

`SegmentedControl` là phần nội bộ của hai switcher, chưa export.

Chưa có (làm ở mốc ghi trong 03 mục 10): `AppShell`, `Sidebar`, `PageHeader`, `DataTable`, `FilterBar`, bộ form, `ConfirmDialog`, `DangerButton`, `IconButton`, `Can`, `NoPermission`, `LocalizedInput` (M1); `Money`, `DateTime`, `ProductImage`, `ImageUpload`, `MoneyInput` (M2).
