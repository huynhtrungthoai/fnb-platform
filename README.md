# fnb-platform

Hệ thống quản lý nhà hàng/quán ăn cho một doanh nghiệp, nhiều chi nhánh: Web Admin, POS, màn hình bếp, kênh khách hàng. Hỗ trợ tiếng Việt và tiếng Anh.

**Trạng thái:** xong mốc M0 (khung monorepo). API, Admin và POS chạy được nhưng chưa có nghiệp vụ; việc tiếp theo ở [`plans/90-roadmap.md`](plans/90-roadmap.md).

## Chạy trên máy

Cần: Node 24 (`.nvmrc`), pnpm 11.29.0 qua corepack (`corepack enable`), Docker Desktop.

```bash
pnpm install
pnpm infra:up      # Postgres, Redis, MinIO bằng Docker Compose
pnpm dev           # API + Admin + POS
```

| Thứ | Địa chỉ |
|---|---|
| API | http://localhost:4000/health |
| Admin | http://localhost:5173 (trang mẫu component: `/dev/components`) |
| POS | http://localhost:5174 (trang mẫu component: `/dev/components`) |
| Postgres | `localhost:5433`, người dùng và CSDL `fnb` |
| Redis | `localhost:6379` |
| MinIO | `localhost:9000` (console `localhost:9001`) |

Cấu hình mặc định nằm ở [`.env.example`](.env.example). Muốn đổi cổng hay mật khẩu local thì chép thành `.env` rồi sửa; `.env` không được commit.

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `pnpm verify` | typecheck, lint, kiểm tra format, test, build. Phải xanh trước khi mở PR |
| `pnpm test` / `pnpm test -- <path>` | Mọi test / một file test |
| `pnpm lint` / `pnpm lint:fix` | ESLint, kiểm tra tên file và file ngôn ngữ |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm infra:up` / `infra:down` / `infra:ps` / `infra:logs` | Hạ tầng local |
| `git config core.hooksPath .githooks` | Bật pre-commit hook, chạy một lần sau khi clone |

`pnpm db:generate`, `db:migrate`, `db:seed` có tên sẵn nhưng chưa chạy được cho tới mốc M1.

## Cấu trúc

| Thư mục | Chứa |
|---|---|
| `apps/api` | API NestJS |
| `apps/admin`, `apps/pos` | Web Admin, POS web (Vite + React) |
| `packages/ui-web`, `packages/ui-pos` | Bộ component của nền tảng Web và POS |
| `packages/design-tokens` | Màu và metric dùng chung (`tokens.json`) |
| `packages/i18n` | File ngôn ngữ `vi`, `en`; định dạng tiền và ngày |
| `packages/contract`, `packages/utils` | Zod schema và kiểu dùng chung; tiền VND, ngày giờ, UUID v7 |
| `packages/config` | tsconfig, ESLint, Prettier dùng chung |
| `plans/`, `docs/`, `ui-mockup/` | Kế hoạch, quy chuẩn, mockup thiết kế |

Quy tắc làm việc: [`AGENTS.md`](AGENTS.md), [`docs/code-style.md`](docs/code-style.md), [`docs/ui-rules.md`](docs/ui-rules.md). Mục lục kế hoạch: [`plans/README.md`](plans/README.md).

## Giấy phép

Mã nguồn theo giấy phép MIT ([`LICENSE`](LICENSE)).

**Tài sản thương hiệu không thuộc giấy phép MIT.** Logo và ảnh trong [`brands/`](brands/), cùng các bản sao của chúng trong app (ví dụ `apps/*/public/favicon.png`), thuộc về chủ thương hiệu Banhkepchonong Burger&Co; mọi quyền được bảo lưu. Không dùng lại, sửa đổi hay phân phối các tài sản này khi chưa được chủ thương hiệu cho phép.
