# shared-components (admin)

Component dùng lại **chỉ trong app admin**, ghép từ `@fnb/ui-web`. Không import thư viện UI gốc, không gọi API, không chứa nghiệp vụ. Quy tắc: `docs/ui-rules.md` mục 1, `plans/03-design-system.md` mục 7.2.

Khi `customer-web` cũng cần một component ở đây thì chuyển nó lên `packages/ui-web` trong cùng thay đổi.

| Component          | File                    | Việc                                                                                                                                                 | Props                                                                          |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `SettingsBar`      | `settings-bar.tsx`      | `LanguageSwitcher` và `ThemeSwitcher` đặt cạnh nhau, đọc ngôn ngữ và chế độ sáng/tối hiện tại của app                                                | `onLocaleChange(locale)`                                                       |
| `PermissionGate`   | `permission-gate.tsx`   | Quyền của một màn hình (06 mục 7.2): vào thẳng URL không có quyền, hay mất quyền khi đang mở, thì hiện `NoPermission`                                | `permission`, `children`                                                       |
