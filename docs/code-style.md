# Code style

Quy chuẩn để code trong repo đồng nhất. Trang này là checklist; lý do và cấu hình đầy đủ nằm ở `plans/02-repo-setup.md`. Nếu code, plan và trang này mâu thuẫn, dừng lại và nói rõ, rồi sửa bên sai trong cùng thay đổi.

## 1. Ngôn ngữ

| Thứ | Ngôn ngữ |
|---|---|
| Tên file, thư mục | Tiếng Anh, `kebab-case`, chỉ ASCII |
| Tên biến, hàm, type, bảng, cột, mã quyền, key i18n | Tiếng Anh |
| Comment trong code, mô tả test, thông báo log | Tiếng Anh |
| Commit message, tên nhánh | Tiếng Anh |
| Tài liệu (`plans/`, `docs/`, README) | Tiếng Việt được |
| Chữ người dùng nhìn thấy | Không viết trong code; nằm trong `packages/i18n` (vi + en) |

Tiếng Việt trong file code chỉ được phép ở: file ngôn ngữ `vi`, dữ liệu seed, dữ liệu mẫu trong test.

## 2. Đặt tên

| Thứ | Quy ước | Ví dụ |
|---|---|---|
| File, thư mục | `kebab-case` | `order-summary.tsx`, `use-cart.ts`, `orders.service.ts` |
| Component React | `PascalCase`, một component chính mỗi file | `OrderSummary` trong `order-summary.tsx` |
| Hook | `useXxx`, file `use-xxx.ts` | `useCart` |
| Biến, hàm | `camelCase` | `calculateTotals` |
| Type, interface, class | `PascalCase`, không tiền tố `I` | `OrderItem` |
| Hằng số | `UPPER_SNAKE_CASE` | `MAX_PIN_ATTEMPTS` |
| Zod schema | `camelCase` + `Schema`; type suy ra cùng tên | `orderSchema`, `type Order = z.infer<typeof orderSchema>` |
| Bảng, cột CSDL | `snake_case`, bảng số nhiều | `order_items.branch_id` |
| Mã quyền | `module.action` | `order.void_item` |
| Key i18n | `namespace:group.key`, `camelCase` | `orders:void.confirmTitle` |
| File test | cạnh file nguồn, `*.test.ts(x)`; E2E `*.e2e.ts` | `totals.test.ts` |
| Module NestJS | `<name>.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts` | |

Boolean bắt đầu bằng `is`, `has`, `can`, `should`. Hàm xử lý sự kiện: prop `onXxx`, hàm `handleXxx`.

## 3. An toàn với giá trị thiếu

Một giá trị thiếu không bao giờ được làm app crash.

| Quy tắc | Ví dụ |
|---|---|
| Truy cập giá trị có thể thiếu bằng `?.` | `order?.items`, `user?.branch?.name` |
| Đặt mặc định bằng `??`, không dùng `||` cho số và chuỗi | `order?.items ?? []`, `item?.quantity ?? 0` |
| Lặp trên mảng có thể thiếu | `(data?.items ?? []).map(...)` |
| Gọi hàm có thể thiếu | `onChange?.(value)` |
| Truy cập theo chỉ số hay key động luôn có thể thiếu | `rows[0]?.id`, `prices[variantId] ?? basePrice` |
| Không dùng `!` (non-null assertion) | sai: `order!.items` |
| Không ép kiểu để lách | sai: `data as Order` với dữ liệu từ ngoài |

Coi là **có thể thiếu**: phản hồi API, sự kiện socket, bộ nhớ cục bộ (IndexedDB, SQLite, storage), tham số route và query, giá trị form, biến môi trường, kết quả `find`, mọi kiểu có `?`, `| null`, `| undefined`.

Dữ liệu từ ngoài được **parse bằng Zod ở biên** (API client, socket, đọc bộ nhớ cục bộ, `/sync`). Sau khi parse, kiểu đã đúng; phần optional vẫn dùng `?.` và `??`.

Giao diện phải có trạng thái cho dữ liệu thiếu: đang tải, rỗng, lỗi (component của bộ `ui-*`, `docs/ui-rules.md` mục 4). Mỗi route có error boundary.

Trong tiền bạc: thiếu giá thì không tự coi là 0 rồi bán tiếp; báo lỗi rõ ràng. `?? 0` chỉ dùng cho hiển thị và cho trường thật sự tuỳ chọn (giảm giá, phụ thu).

## 4. TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`.
- Không `any`. Chưa biết kiểu thì dùng `unknown` rồi thu hẹp.
- Không `@ts-ignore`. `@ts-expect-error` phải kèm comment lý do.
- Type dùng chung lấy từ `packages/contract`; không khai báo lại ở app.
- `import type` cho import chỉ dùng làm kiểu.
- Không `enum` của TypeScript; dùng `as const` + union, hoặc `z.enum`.
- `switch` trên union phải xử lý hết các nhánh (kiểm tra bằng `never`).
- Không để promise trôi: `await`, `void`, hoặc xử lý lỗi.

## 5. Lint, format, typecheck

| Công cụ | Dùng cho | Lệnh |
|---|---|---|
| TypeScript (`tsc --noEmit`) | Kiểm tra kiểu | `pnpm typecheck` |
| ESLint (flat config trong `packages/config`) | Quy tắc code | `pnpm lint`, `pnpm lint:fix` |
| Prettier | Định dạng | `pnpm format`, `pnpm format:check` |
| `scripts/check-filenames` | Tên file ASCII `kebab-case` | chạy trong `pnpm lint` |
| `scripts/check-i18n` | Key `vi` và `en` khớp nhau | chạy trong `pnpm lint` |
| Tất cả + test + build | Trước khi coi task là xong | `pnpm verify` |

Rule ESLint bắt buộc (mức error):

| Rule | Mục đích |
|---|---|
| `@typescript-eslint/no-explicit-any` | Không `any` |
| `@typescript-eslint/no-non-null-assertion` | Không `!` |
| `@typescript-eslint/no-floating-promises` | Không để promise trôi |
| `@typescript-eslint/consistent-type-imports` | `import type` |
| `@typescript-eslint/switch-exhaustiveness-check` | Xử lý hết nhánh |
| `@typescript-eslint/prefer-nullish-coalescing` | `??` thay cho `\|\|` |
| `@typescript-eslint/prefer-optional-chain` | `?.` thay cho chuỗi `&&` |
| `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` | Hook đúng cách |
| `i18next/no-literal-string` (JSX trong `apps/`) | Không viết cứng chuỗi hiển thị |
| `no-restricted-imports` trong `apps/*/src` | Thư viện UI gốc chỉ được import trong `packages/ui-*`; app chỉ import `ui-*` của nền tảng mình; cấm import từ app khác |
| `no-restricted-syntax` trong `apps/*` và `packages/ui-*` | Cấm mã màu viết cứng và `style={{…}}` với giá trị tuỳ ý |
| `import-x/no-cycle`, `import-x/order` (plugin `eslint-plugin-import-x`, bản hỗ trợ ESLint 10) | Không phụ thuộc vòng, thứ tự import |
| `no-console` (trừ `warn`, `error`) | Dùng logger |

Không bật `no-unnecessary-condition`: rule này mâu thuẫn với quy tắc phòng thủ ở mục 3.

Prettier: `printWidth 100`, `singleQuote`, `semi`, `trailingComma all`, thụt 2 dấu cách, plugin sắp xếp class Tailwind. `.editorconfig`: UTF-8, LF, có dòng trống cuối file.

Hook `pre-commit` (`.githooks/`, bật bằng `git config core.hooksPath .githooks`) chạy lint và Prettier trên file đã stage, cùng kiểm tra tên file. CI chạy `pnpm verify` trên mọi PR.

Tắt một rule tại chỗ chỉ khi có comment tiếng Anh nêu lý do ngay trên dòng đó.

## 6. Comment

- Viết tiếng Anh.
- Giải thích **vì sao**, không tả lại code làm gì.
- Ghi chú quy tắc nghiệp vụ kèm mã chức năng: `// CASH-05: expected cash excludes QR payments`.
- `TODO` phải kèm mã task: `// TODO(M3-11): support partial refunds`.
- Hàm và type export từ `packages/*` có JSDoc một dòng.

## 7. Cấu trúc

- Một file một việc. File quá 300 dòng thì xem lại việc tách.
- Mỗi tính năng trong app là một thư mục `src/features/<name>/` gồm màn hình, hook, component riêng.
- Component không gọi `fetch`/`axios` trực tiếp; dùng hook của `@fnb/api-client`.
- Dữ liệu từ server nằm trong TanStack Query; zustand chỉ cho trạng thái giao diện và phiên làm việc.
- Form: react-hook-form + schema Zod lấy từ `@fnb/contract`.
- API: controller mỏng, nghiệp vụ trong service, truy vấn trong repository. Thao tác ghi nhiều bảng nằm trong một transaction.
- Lỗi nghiệp vụ ở API trả mã lỗi ổn định (`ORDER_ALREADY_PAID`); client dịch mã đó, không hiển thị chuỗi từ server.
- Tiền chỉ tính bằng số nguyên qua hàm trong `pos-core`/`utils`; ngày giờ qua `packages/utils`, không tự cộng trừ múi giờ.

## 8. Commit và nhánh

- Conventional Commits, tiếng Anh, kèm mã task: `feat(menu): add modifier groups (M2-04)`.
- Loại: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`.
- Nhánh: `feat/<name>`, `fix/<name>`, `docs/<name>`. Không push thẳng `main`.
- Thay đổi contract, API và client của nó nằm trong cùng một commit.

## 9. Trước khi xong

1. `pnpm verify` xanh.
2. Rà diff: không `!`, không `any`, không `eslint-disable` thiếu lý do, không chuỗi hiển thị viết cứng, không tên file có dấu.
3. Mọi giá trị từ ngoài đã qua `?.` / `??` hoặc được parse bằng Zod.
4. Chuỗi mới có đủ `vi` và `en`.
5. Tính năng mới có mã quyền và test.
6. Plan đã cập nhật nếu hành vi đổi; đã tick trong `plans/90-roadmap.md`.
