# FNB Platform agent guide

File này là nguồn quy tắc duy nhất cho mọi AI agent (Claude Code, Codex, Cursor…) làm việc trong repo. `CLAUDE.md` chỉ import file này; không viết quy tắc ở đó.

## Repo này là gì

Hệ thống quản lý nhà hàng/quán ăn cho **một doanh nghiệp, nhiều chi nhánh** (không phải SaaS multi-tenant): Web Admin, POS web, màn hình bếp, POS Android (Expo), web khách hàng, app khách hàng (Expo), Zalo Mini App. Làm theo giai đoạn, Admin + POS web trước. Hệ thống hỗ trợ **hai ngôn ngữ: tiếng Việt và tiếng Anh**.

**Trạng thái (2026-11-26): đang lập kế hoạch.** Repo chỉ có tài liệu; chưa có code, chưa có `package.json`, chưa có lệnh nào chạy được. Kiểm tra trước khi giả định một file hay lệnh tồn tại. Khi mốc M0 xong, cập nhật đoạn này và mục "Lệnh".

## Code nằm ở đâu

| Nơi | Chứa | Không bao giờ chứa |
|---|---|---|
| `apps/<app>/src/features`, `routes` | Màn hình, điều hướng, ghép component, gọi API | Component dùng lại được, thư viện UI gốc, màu/kích thước viết cứng, logic tính tiền, chuỗi hiển thị viết cứng |
| `packages/ui-web`, `ui-pos`, `ui-mobile` | **Bộ component của từng nền tảng giao diện**: Web (`admin`, `customer-web`), POS (POS + KDS), Mobile (`customer-app`, `zalo-mini-app`). Nơi duy nhất được import thư viện UI gốc | Gọi API, logic nghiệp vụ, màu/kích thước ngoài token, điều kiện theo tên theme |
| `apps/<app>/src/shared-components` | Component dùng lại **chỉ trong app đó**, ghép từ bộ của nền tảng | Thư viện UI gốc, gọi API, logic nghiệp vụ, import từ app khác |
| `packages/design-tokens` | **Màu và metric dùng chung cho mọi app**, chia ba lớp: bảng màu gốc → màu vai trò sáng/tối → theme (`admin`, `customer`, `pos`, `kds`, `mobile`) | Component |
| `packages/pos-core` | Logic POS thuần TypeScript: giỏ hàng, tính tiền, trạng thái đơn, outbox, nội dung in (`PrintDocument`) | React, DOM, React Native, byte lệnh máy in (nằm ở app) |
| `packages/contract` | Zod schema, type, enum, mã quyền | Logic |
| `packages/i18n` | File ngôn ngữ `vi` và `en`, hàm định dạng tiền và ngày | |
| `packages/api-client` | HTTP client có type, hook Query, socket client | Giao diện |
| `ui-mockup/` | Mockup thiết kế (artboard canvas `.dc.html`): đặc tả component từng nền tảng và luồng màn hình; dev dựng UI theo đây | Code app, nguồn token |
| `apps/api/src/modules/<domain>` | Nghiệp vụ phía server, mỗi domain một module | Ghi trực tiếp vào bảng của module khác |

Component chia theo ba nền tảng (D-14, `plans/03-design-system.md` mục 7): app chỉ dùng bộ `ui-*` của nền tảng mình. Mọi nền tảng dùng chung token, logic (`pos-core`), contract, i18n và **tên chuẩn** của component (03 mục 7.3). Theme và sáng/tối: D-31, 03 mục 5.

### Component mới? Quyết định ở đây

| Câu hỏi | Có → | Không → |
|---|---|---|
| App khác **cùng nền tảng** (ví dụ admin và web khách) có thể dùng nó không? | làm trong `packages/ui-<nền tảng>/` **trước**, đặt đúng tên chuẩn, thêm vào trang mẫu và README của package | câu tiếp |
| Màn hình khác **trong cùng app** có thể dùng nó với nhãn hay dữ liệu khác không? | làm trong `apps/<app>/src/shared-components/`, ghép từ bộ của nền tảng | câu tiếp |
| Nó là helper không có giao diện (định dạng, tính toán)? | `packages/utils`, `packages/i18n` hoặc `packages/pos-core` | câu tiếp |
| Nó cần API hay nghiệp vụ của một tính năng? | `apps/<app>/src/features/<name>/` | hỏi người dùng |
| Nó là một màu hay một kích thước mới? | thêm token vào `packages/design-tokens` | |

- Khi phân vân, đặt vào bộ `ui-*` của nền tảng.
- Component trong `features/` mà màn hình thứ hai bắt đầu cần thì chuyển lên `shared-components` của app; app thứ hai cùng nền tảng cần thì chuyển lên `ui-*`, trong cùng thay đổi.
- Không sao chép component vào `features/` để chỉnh; thêm tham số (`variant`, `size`, `density`) cho nó.
- Nền tảng khác cần component tương tự: làm trong bộ của nền tảng đó, cùng tên. Không import bộ của nền tảng khác, không import component của app khác.

## Đọc trước khi làm

1. `plans/README.md`: mục lục, quyết định, câu hỏi mở.
2. `plans/90-roadmap.md`: task nào tiếp theo.
3. File plan của phần bạn chạm vào (bảng dưới).

| Bạn chạm vào | Đọc trước |
|---|---|
| Bất kỳ code nào | `docs/code-style.md`, `plans/02-repo-setup.md` |
| Bất kỳ giao diện nào | `docs/ui-rules.md`, `plans/03-design-system.md` |
| Màu, phông, logo, hoạ tiết, `packages/design-tokens` | `plans/07-brand.md` (nguồn: `brands/`) |
| Bất kỳ màn hình hay component giao diện nào | `ui-mockup/README.md`, rồi `spec-<nền tảng>` và màn của luồng tương ứng. Dựng theo mockup; không copy markup vào `apps/` |
| Bất kỳ chữ nào người dùng nhìn thấy | `plans/40-i18n-copy.md` |
| Schema, migration, module API | `plans/04-architecture.md` và plan của tính năng (10–21) |
| Endpoint, nút, menu, route mới; nhóm quyền | `plans/06-permissions.md` |
| `packages/pos-core`, POS, đồng bộ offline | `plans/12-pos-sales.md`, `plans/04-architecture.md` mục Offline |
| Ca thu ngân, sổ quỹ | `plans/14-cash.md` |
| Máy in, mẫu in, khổ giấy K57/K80, bill, phiếu bếp | `plans/18-printing.md` |
| `apps/pos-mobile` | `plans/31-pos-android.md` |
| Web/app khách, `apps/zalo-mini-app` | `plans/21-customers.md`, `plans/32-customer-app-zalo.md` |
| Chọn hay nâng cấp thư viện | `plans/05-decisions.md`, rồi tra Context7 |

Nếu code và plan mâu thuẫn, dừng lại và nói rõ. Plan sai thì sửa plan trong cùng thay đổi; không lặng lẽ làm khác.

## Quy tắc cứng

### Quy trình

- **Làm từ từ, từng mốc.** Xong một mốc thì báo kết quả rồi mới sang mốc sau. Không viết code hàng loạt.
- **Roadmap là nơi theo dõi duy nhất.** Bắt đầu task: `[ ]` → `[~]`. Xong: `[x]`, cập nhật bảng tiến độ và nhật ký trong `plans/90-roadmap.md`, cùng thay đổi.
- Nghiệp vụ thay đổi thì sửa plan của tính năng trước, rồi mới tới task và code.
- **Plan và mockup luôn khớp nhau, sửa hai chiều trong cùng thay đổi.** Sửa mockup (`ui-mockup/`, canvas) mà đụng tới nghiệp vụ, luồng, tên component, props hay token thì sửa plan liên quan (03, 07, plan tính năng) cho khớp. Sửa plan mà đổi màn hình, luồng hay component thì sửa mockup cho khớp, chép lại file vào `ui-mockup/` và cập nhật README. Không chắc bên nào đúng thì hỏi người dùng.
- **Dev làm UI xem mockup trước khi dựng**: tên, props, biến thể, trạng thái lấy từ `spec-<nền tảng>.dc.html`; bố cục và luồng lấy từ các màn đánh số. Code lệch mockup thì sửa code, hoặc sửa mockup và plan nếu mockup sai.
- Mục "Đề xuất" và "Mở" trong `plans/05-decisions.md` chưa được xác nhận. Hỏi trước khi làm việc phụ thuộc vào chúng.
- Không commit, không push, không deploy khi chưa được yêu cầu. Không push thẳng `main`.
- **Không sao chép code** từ `../hotdog-web-app`, từ Odoo hay bất kỳ sản phẩm nào trong `plans/00-sources.md`. Chỉ tham khảo ý tưởng nghiệp vụ.
- Tra Context7 trước khi dùng API của thư viện (NestJS 12 đã chuyển ESM, TypeScript 6, Vite 8…); không dựa trí nhớ.

### Code (chi tiết: `docs/code-style.md`)

- **Lint, Prettier và typecheck phải xanh** trước khi coi task là xong: `pnpm verify`. Không tắt rule bằng `eslint-disable` hay `@ts-ignore` nếu không có chú thích nêu lý do.
- **Giá trị có thể thiếu thì truy cập bằng `?.` và đặt mặc định bằng `??`.** Áp dụng cho mọi dữ liệu từ API, socket, bộ nhớ cục bộ, tham số route, form và mọi kiểu optional: `order?.items ?? []`, `user?.branch?.name ?? ''`. Không dùng `!`. Một giá trị thiếu không được làm app crash.
- **Tên file và thư mục: tiếng Anh, `kebab-case`, chỉ ký tự ASCII.** Không dấu, không tiếng Việt, kể cả file tài liệu.
- **Comment trong code viết tiếng Anh.** Tên biến, hàm, bảng, mã quyền, key i18n cũng tiếng Anh. Tài liệu (`plans/`, `docs/`, README) viết tiếng Việt được.
- TypeScript strict; không `any`.

### Giao diện (chi tiết: `docs/ui-rules.md`)

- **Ba nền tảng, mỗi nền tảng một bộ component** (`@fnb/ui-web`, `@fnb/ui-pos`, `@fnb/ui-mobile`); màn hình chỉ ghép từ bộ đó và `shared-components` của app. `features/` và `routes/` không tự dựng nút, ô nhập, bảng, hộp thoại, thẻ, trạng thái rỗng/lỗi/đang tải. Thư viện UI gốc (Radix, shadcn primitives, thư viện native, Zalo) chỉ import trong `packages/ui-*`.
- **Màu và metric dùng chung** từ `@fnb/design-tokens`. Mỗi app gắn một theme; **Admin đơn giản**, **web khách kiểu riêng** thương hiệu cao. Mọi màn hình chạy đúng ở sáng và tối; người dùng chọn qua `ThemeSwitcher`.
- Màu, khoảng cách, bo góc, cỡ chữ chỉ lấy từ token. Không viết mã màu hay số pixel tuỳ ý ở bất kỳ đâu trong `apps/` và `packages/ui-*`.
- **Không viết cứng chuỗi hiển thị.** Mọi chữ đi qua i18n, có đủ `vi` và `en` trong cùng thay đổi.
- Hành động khó hoàn tác (huỷ đơn, huỷ món, hoàn tiền, xoá, chốt kỳ lương) phải qua `ConfirmDialog` kiểu nguy hiểm của bộ nền tảng.

### Dữ liệu và nghiệp vụ (chi tiết: `plans/04-architecture.md`)

- Khoá chính UUID v7, client tự sinh được. Bảng vận hành luôn có `branch_id`.
- Tiền là số nguyên VND. Thời gian lưu `timestamptz` UTC; báo cáo theo ngày kinh doanh của chi nhánh.
- Kho và sổ quỹ là sổ cái chỉ ghi thêm; sửa sai bằng bút toán điều chỉnh/đảo.
- Đơn hàng lưu snapshot tên (cả hai ngôn ngữ) và giá tại lúc bán.
- Dữ liệu danh mục có tên hiển thị (món, nhóm món, tuỳ chọn…) lưu hai ngôn ngữ (`plans/40-i18n-copy.md` mục 4).
- Module chỉ ghi bảng của mình; muốn đổi dữ liệu module khác thì gọi service của nó.
- **Mỗi tính năng có quyền riêng** (`module.action`), cấp qua **nhóm quyền** (`role`), không gán quyền lẻ cho người dùng. Thêm tính năng thì làm đủ các bước ở `plans/06-permissions.md` mục 11: khai báo quyền trong `packages/contract`, tên vi/en, `@RequirePermission` ở API, `<Can>` ở giao diện, gán vào nhóm mặc định, thêm dòng vào bảng quyền. Thao tác nhạy cảm ghi audit log.
- **API mặc định cấm.** Endpoint phải khai báo `@RequirePermission`, `@Authenticated` hoặc `@Public`. Không kiểm tra quyền bằng tên nhóm (`role === 'manager'`); luôn kiểm tra mã quyền.
- Logic tính tiền chỉ nằm trong `packages/pos-core`; server tính lại để kiểm chứng.
- POS ghi qua outbox có idempotency key; server xử lý đúng một lần.
- Test không gọi dịch vụ thật (cổng thanh toán, Brevo, Firebase, Discord, ZNS); dùng bản giả lập.
- Bí mật (khoá cổng thanh toán, JWT secret, mật khẩu CSDL) không nằm trong repo.

## Lệnh

Chưa có; được định nghĩa ở M0 (`plans/02-repo-setup.md` mục 5). Dự kiến:

```bash
docker compose up -d            # postgres, redis, minio
pnpm dev                        # api + admin + pos
pnpm verify                     # typecheck + lint + format check + test + build
pnpm lint && pnpm format        # eslint, prettier
pnpm test -- <path>             # chạy một file test
pnpm db:migrate && pnpm db:seed
```

Dùng Node 24 và pnpm 11.29.0 (bản 12.23 lỗi qua corepack trên máy dev).

## Cách viết tài liệu và plan

- Tài liệu viết tiếng Việt; tên file tiếng Anh. Comment và mọi thứ trong code viết tiếng Anh.
- Nêu rõ tên file, hàm, mã, con số. Ưu tiên bảng hơn đoạn văn dài.
- Plan đánh số: `0x` nền tảng, `1x`/`2x` tính năng, `3x` ứng dụng, `4x` chất lượng, `90` roadmap.
- Xong một việc trong plan thì tick trong `plans/90-roadmap.md` trong cùng thay đổi.

## Ghi chú môi trường (2026-11-26)

- Docker daemon trên máy dev đang tắt; cần bật Docker Desktop trước khi chạy hạ tầng local.
- Cổng 3000 đang bị tiến trình khác dùng; API dùng cổng khác.
- `plan.md` ở gốc repo là file rỗng của người dùng; để nguyên.
