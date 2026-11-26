# @fnb/ui-pos

Bộ component của **nền tảng POS**: màn bán hàng và màn bếp (KDS) trong `apps/pos`, theme `pos` (và `kds` từ M4). Dựng kiểu shadcn trên Radix và Tailwind 4 với mật độ cảm ứng, chỉ dùng token của `@fnb/design-tokens`.

Đặc tả: `plans/03-design-system.md` mục 7 và mockup `ui-mockup/spec-pos.dc.html`. Quy tắc: `docs/ui-rules.md` (mục 7: POS và cảm ứng).

## Quy tắc của package

- Nơi duy nhất của nền tảng POS được import Radix, `lucide-react`, `class-variance-authority`. Không import `@fnb/ui-web`: primitive giống nhau được viết riêng theo mật độ của POS.
- Vùng chạm tối thiểu 44 px; nút mặc định 56 px. Không dựa vào hover: trạng thái nhấn (`active:`) phải rõ.
- Không mã màu, không số pixel tuỳ ý, không điều kiện theo tên theme.
- Không gọi API, không chứa nghiệp vụ, không import `@fnb/pos-core`. Nhãn của màn hình vào qua props; nhãn mặc định chung lấy từ i18n namespace `common`.
- Thêm component: đặt đúng tên chuẩn (03 mục 7.3), export ở `src/index.ts`, thêm một dòng vào bảng dưới và một mục trong trang mẫu `/dev/components` của app POS. Bản native của POS Android viết riêng trong `apps/pos-mobile`, cùng tên (D-03).

## Cách dùng trong app

```css
/* apps/pos/src/styles.css */
@import 'tailwindcss';
@import '@fnb/design-tokens/theme.css';
@import '@fnb/ui-pos/styles.css';
@source '../../../packages/ui-pos/src';
```

## Component (M0)

| Component | Việc | Props chính |
|---|---|---|
| `Button` | Nút cảm ứng | `variant: 'primary' \| 'secondary' \| 'ghost'`, `size?: 'lg'` (56 px, mặc định) `\| 'md'` (48 px), `icon?`, `loading?`, `disabled?`, `fullWidth?`, `trailing?` (ví dụ số tiền) |
| `Input` | Ô nhập một dòng cao 56 px | `label`, `value`, `onChange(value)`, `hint?`, `error?`, `prefix?`, `suffix?`, `disabled?` |
| `Card` | Thẻ nội dung | `title?`, `actions?` |
| `Dialog` | Hộp thoại, giữ focus, nút đóng 44 px | `open`, `onClose`, `title`, `description?`, `size?: 'sm' \| 'md' \| 'lg'`, `footer?` |
| `Toaster`, `toast()`, `dismissToast()` | Phản hồi sau hành động; hiện ở trên để không che `ActionBar` | `toast({ tone?: 'success' \| 'danger' \| 'info', message, action? })` |
| `Spinner` | Hành động đang chạy | `size?: 'sm' \| 'md' \| 'lg'`, `label?` |
| `Skeleton` | Nội dung đang tải | `shape?: 'line' \| 'rect' \| 'row'` |
| `EmptyState` | Vùng dữ liệu rỗng, không hoạ tiết | `title?`, `description?`, `action?` |
| `ErrorState` | Vùng dữ liệu lỗi | `message?`, `onRetry?`, `retryLabel?` |
| `Icon` | Icon lucide theo tên | `name: IconName`, `size?: 16 \| 20 \| 24` (mặc định 24), `label?` |
| `LanguageSwitcher` | Chọn vi/en trên thiết bị | `value: 'vi' \| 'en'`, `onChange` |
| `ThemeSwitcher` | Chọn Theo hệ thống / Sáng / Tối | `value: 'system' \| 'light' \| 'dark'`, `onChange` |
| `ThemeProvider`, `useThemeMode()` | Gắn `data-theme`, `data-mode` lên `<html>`, lưu lựa chọn trên thiết bị; POS mặc định sáng | `theme: 'pos'`, `storageKey?` |

`SegmentedControl` là phần nội bộ của hai switcher, chưa export.

Chưa có (làm ở mốc ghi trong 03 mục 10): `PosShell`, `ActionBar`, `ProductTile`, `CategoryTabs`, `CartLine`, `ModifierGroupPicker`, `NumPad`, `PinInput`, `MoneyInput`, `ApprovalDialog`, `ConfirmDialog`, `DangerButton`, `IconButton`, `OfflineBanner`, `SyncStatus`, `Can`, `Money`… (M3); `KdsShell`, `TicketCard`, theme `kds` (M4); `QrDisplay` (M5).
