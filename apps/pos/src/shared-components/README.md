# shared-components (pos)

Component dùng lại **chỉ trong app pos** (POS và KDS), ghép từ `@fnb/ui-pos`. Không import thư viện UI gốc, không gọi API, không chứa nghiệp vụ. Quy tắc: `docs/ui-rules.md` mục 1, `plans/03-design-system.md` mục 7.2.

Component nào dùng lại được cho cả POS lẫn KDS theo đúng tên chuẩn thì đặt ở `packages/ui-pos`. Bản native của POS Android viết riêng trong `apps/pos-mobile` (D-03), không import từ đây.

| Component | File | Việc | Props |
|---|---|---|---|
| `SettingsBar` | `settings-bar.tsx` | `LanguageSwitcher` và `ThemeSwitcher` đặt cạnh nhau, đọc ngôn ngữ và chế độ sáng/tối hiện tại của app | `onLocaleChange(locale)` |
