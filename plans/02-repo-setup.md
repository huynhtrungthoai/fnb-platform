# 02. Repo và công cụ

## 1. Cây thư mục

```
fnb-platform/
  AGENTS.md  CLAUDE.md  README.md  LICENSE
  .editorconfig  .gitignore  .nvmrc  .prettierignore
  eslint.config.mjs  prettier.config.mjs      (cả hai chỉ gọi lại cấu hình trong packages/config)
  .githooks/pre-commit
  .github/workflows/ci.yml
  package.json  pnpm-workspace.yaml  turbo.json  docker-compose.yml  .env.example
  apps/
    api/              NestJS: src/modules/<domain>, src/common, src/db
    admin/            Web Admin
    pos/              POS web + KDS (route /kitchen)
    pos-mobile/       POS Android (Expo)            GĐ 1.5
    customer-web/     Web khách                     GĐ 3
    customer-app/     App khách (Expo)              GĐ 4
    zalo-mini-app/    Zalo Mini App                 GĐ 5
  packages/
    config/             tsconfig gốc, ESLint flat config, Prettier, Tailwind preset
    contract/           Zod schema, type, enum, mã quyền, mã lỗi
    i18n/               locales/vi, locales/en, định dạng tiền và ngày
    design-tokens/      tokens.json (palette → semantic sáng/tối → theme), bộ sinh theme web và native
    ui-web/             component nền tảng Web (admin, customer-web), shadcn
    ui-pos/             component nền tảng POS (POS + KDS), shadcn, density touch
        ui-mobile/          component nền tảng Mobile (zalo-mini-app; thiết kế chung, D-43); tạo ở GĐ 5
    pos-core/           logic POS thuần TypeScript
    api-client/         HTTP client, hook Query, socket client
    utils/              tiền, ngày giờ, UUID v7
  scripts/
    check-filenames.mjs  check-i18n.mjs  check-permissions.mjs
  brands/             logo và ảnh thương hiệu (không thuộc giấy phép MIT, 01 mục 1)
  plans/              bộ plan (README.md là mục lục)
  docs/               code-style.md, ui-rules.md
```

Cấu trúc bên trong một app (web, Expo, Zalo):

```
apps/<app>/src/
  routes/             định tuyến (file-based), chỉ ghép màn hình
  shared-components/  component dùng lại chỉ trong app này, ghép từ @fnb/ui-<nền tảng>; README.md liệt kê
  features/<name>/    màn hình, hook, component riêng của tính năng
  lib/                khởi tạo client, i18n, quyền
```

Cấu trúc một module API: `src/modules/<domain>/` gồm `<domain>.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `schema.ts` (bảng Drizzle), `*.test.ts`.

## 2. Phụ thuộc giữa các phần

| Phần | Được import | Không được import |
|---|---|---|
| `apps/admin`, `apps/customer-web` | `ui-web`, các package không phải `ui-*` | `ui-pos`, `ui-mobile`, app khác |
| `apps/pos` | `ui-pos`, các package không phải `ui-*` | `ui-web`, `ui-mobile`, app khác |
| `apps/customer-app`, `apps/zalo-mini-app` | `ui-mobile`, các package không phải `ui-*` | `ui-web`, `ui-pos`, app khác |
| `apps/<app>/src/features`, `routes` | `ui-*` của nền tảng, `shared-components` của chính app, `packages/*` | thư viện UI gốc |
| `apps/<app>/src/shared-components` | `ui-*` của nền tảng, `design-tokens`, `utils`, `i18n`, `contract` (chỉ kiểu và enum) | thư viện UI gốc, `api-client`, `features/`, `pos-core` |
| `packages/ui-web`, `ui-pos`, `ui-mobile` | thư viện UI gốc của nền tảng, `design-tokens`, `utils`, `i18n`, `contract` (chỉ kiểu và enum: `PermissionCode` cho `Can`, kiểu `{vi,en}` cho `LocalizedInput`, enum trạng thái cho `StatusBadge`) | `api-client`, `pos-core`, `ui-*` khác, mọi `apps/*` |
| `apps/api` | `contract`, `utils`, `i18n`, `pos-core` (để tính lại tiền) | `design-tokens`, `api-client` |
| `design-tokens` | không gì cả | mọi package khác, React |
| `pos-core` | `contract`, `utils` | React, DOM, React Native, `api-client` |
| `api-client` | `contract`, `utils` | `design-tokens`, mã giao diện |
| `contract` | `zod` | mọi package khác |

ESLint (`no-restricted-imports`, `import-x/no-restricted-paths`, `import-x/no-cycle`) kiểm tra các ràng buộc này.

## 3. Công cụ

| Việc | Công cụ | Phiên bản (kiểm tra 2026-11-26) |
|---|---|---|
| Runtime | Node | 24 (`.nvmrc`) |
| Quản lý package | pnpm qua corepack | 11.29.0 (ghim `packageManager`; 12.23 lỗi trên máy dev) |
| Chạy task | Turborepo | 2.11 |
| Ngôn ngữ | TypeScript | 6.0.3, ghim `~6.0.3` (05: D-11) |
| API | NestJS (ESM), build bằng `nest build`, test bằng Vitest + `unplugin-swc` (SWC sinh metadata cho decorator) | 12.6 (05: D-10) |
| CSDL | PostgreSQL + Drizzle ORM + drizzle-kit | 17 · 0.45 |
| Validate | Zod | 4.6 |
| Web | Vite, React, TanStack Router, TanStack Query | 8 · 19.3 · 1.170 · 5 |
| CSS | Tailwind | 4.3 |
| Đa ngôn ngữ | i18next + react-i18next | 27.2 · 18.0 (xác nhận ở M0-11) |
| Lint | ESLint flat config + typescript-eslint + `eslint-plugin-import-x` (bản `eslint-plugin-import` 2.32 chưa hỗ trợ ESLint 10) | 10.15 · 8.74 · 4.18 |
| Format | Prettier + plugin Tailwind | 3.10 |
| Test | Vitest, Testcontainers, Playwright | 5 · 12 |
| Hạ tầng local | Docker Compose: Postgres, Redis, MinIO | |
| CI | GitHub Actions | |

pnpm 11 chỉ cài bản đã phát hành quá 24 giờ (`minimumReleaseAge`). Bản vừa ra trong ngày thì hạ khoảng phiên bản trong `catalog` của `pnpm-workspace.yaml` xuống bản liền trước (ví dụ NestJS 12.6.2 thay cho 12.6.3 ngày 2026-11-26); không thêm `minimumReleaseAgeExclude`.

Phiên bản lấy từ registry ngày ghi trong bảng. Trước khi cài ở M0: kiểm tra lại và tra Context7 cho cú pháp cấu hình.

### 3.1 Lint, format, typecheck

Ba kiểm tra này bắt buộc và có ba lớp chặn:

| Lớp | Chạy gì | Khi nào |
|---|---|---|
| Trình soạn thảo | ESLint + Prettier khi lưu, `.editorconfig` | Lúc viết |
| `.githooks/pre-commit` | ESLint và Prettier trên file đã stage; `check-filenames` | Mỗi commit |
| CI | `pnpm verify` | Mỗi PR; đỏ thì không merge |

Bật hook một lần sau khi clone: `git config core.hooksPath .githooks`.

Lệnh gốc:

| Lệnh | Làm gì |
|---|---|
| `pnpm typecheck` | `tsc --noEmit` mọi package |
| `pnpm lint` | ESLint + `check-filenames` + `check-i18n` + `check-permissions` |
| `pnpm lint:fix` | ESLint tự sửa |
| `pnpm format` / `pnpm format:check` | Prettier ghi / chỉ kiểm tra |
| `pnpm test` | Vitest mọi package; `pnpm test -- <path>` cho một file |
| `pnpm verify` | typecheck + lint + format:check + test + build |

Danh sách rule ESLint bắt buộc, cấu hình Prettier và các cờ TypeScript: `docs/code-style.md` mục 4 và 5.

### 3.2 Script kiểm tra riêng

| Script | Chặn gì |
|---|---|
| `scripts/check-filenames.mjs` | Tên file hay thư mục có ký tự ngoài ASCII, có dấu cách, có chữ hoa, không phải `kebab-case` (trừ danh sách cho phép: `README.md`, `AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md`, `LICENSE`, `Dockerfile`). Bỏ qua `ui-mockup/` và `brands/` (đầu vào thiết kế). Trong `apps/<app>/src/routes/` cho phép ký hiệu của TanStack Router (`__root`, `_layout`, `$param`). Không tham số: kiểm mọi file git biết; có tham số: chỉ kiểm các đường dẫn đó (hook) |
| `scripts/check-i18n.mjs` | File namespace có ở `vi` mà thiếu ở `en` hoặc ngược lại; key lệch (hậu tố số nhiều `_one`/`_other` được phép khác nhau); key rỗng; tham số `{{…}}` lệch nhau; file chưa khai báo trong `packages/i18n/src/resources.ts`. Kiểm mã lỗi của contract có bản dịch: thêm ở M1 cùng namespace `errors` |
| `scripts/check-permissions.mjs` (từ M1) | Mã quyền thiếu tên vi/en; mã khai báo mà không endpoint nào dùng; bảng quyền trong plan 06 lệch với code |

Hai script có test riêng (`scripts/*.test.mjs`), chạy bằng `node --test` trong `pnpm test`.

### 3.3 `.editorconfig`

UTF-8, LF, dòng trống cuối file, bỏ dấu cách thừa cuối dòng (trừ `*.md`), thụt 2 dấu cách.

## 4. Nhánh và commit

- Nhánh mặc định `main`. Không push thẳng; mở PR từ nhánh tính năng.
- Tên nhánh: `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`.
- Commit theo Conventional Commits, tiếng Anh, kèm mã task: `feat(menu): add modifier groups (M2-04)`.
- Thay đổi contract đi cùng API và client của nó trong một commit.
- Migration: mỗi thay đổi schema một file migration; không sửa migration đã chạy trên môi trường thật.
- Agent không commit, push hay deploy khi chưa được yêu cầu.

## 5. Việc của giai đoạn này (M0)

Trùng với mục M0 trong `90-roadmap.md`; tick ở đó.

- Khởi tạo workspace, ghim Node và pnpm.
- `packages/config`: tsconfig, ESLint, Prettier; `.editorconfig`; `.githooks/pre-commit`.
- `scripts/check-filenames.mjs`, `scripts/check-i18n.mjs`.
- Docker Compose và `.env.example`.
- Khung `apps/api`, `apps/admin`, `apps/pos`.
- Khung `packages/contract`, `utils`, `i18n`, `design-tokens` (theme `admin`, `pos`); `packages/ui-web` và `packages/ui-pos` nền, dùng trong `apps/admin` và `apps/pos`.
- Script gốc và CI.
- Cập nhật `AGENTS.md` (trạng thái, lệnh thật) và `README.md` (cách chạy).

Xong khi: clone về, `docker compose up -d && pnpm install && pnpm dev` chạy được ba app trống ở cả `vi` và `en`; `pnpm verify` xanh; commit một file tên có dấu bị hook chặn.
