# 04. Kiến trúc

## Bối cảnh

- Một doanh nghiệp, nhiều chi nhánh. Không làm SaaS multi-tenant.
- Một API duy nhất (modular monolith) phục vụ mọi ứng dụng.
- Viết mới hoàn toàn, không mang code từ `hotdog-web-app`.
- Dữ liệu mới, hệ thống cũ chạy song song.
- Hạ tầng chưa chốt: mọi thứ chạy bằng container, phát triển local với Docker Compose.

## Các ứng dụng

| Ứng dụng | Người dùng | Nền tảng | Giai đoạn |
|---|---|---|---|
| Web Admin | Chủ, quản lý, kế toán, thủ kho | Web | 0, 1 |
| POS web | Thu ngân, phục vụ | Web PWA, có offline | 1 |
| Màn hình bếp (KDS) | Bếp, bar | Web, nằm trong POS ở route `/kitchen` | 1 |
| POS Android | Thu ngân, phục vụ | Expo (development build) | 1.5 |
| Web khách hàng | Khách | Web | 3 |
| App khách hàng | Khách | Expo (iOS, Android) | 4 |
| Zalo Mini App | Khách | Zalo | 5 |

## Công nghệ

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Monorepo | pnpm + Turborepo, TypeScript strict | Chia sẻ contract và logic giữa các app |
| API | NestJS, module theo domain | Cấu trúc rõ, hợp hệ thống nhiều nghiệp vụ |
| CSDL | PostgreSQL 17 + Drizzle ORM | Type-safe, SQL rõ ràng, hợp báo cáo và sổ kho |
| Contract | Zod 4 dùng chung | Một nguồn cho cả type và validate runtime |
| Realtime | Socket.IO, room theo chi nhánh, Redis adapter; dựng ở M1 (D-25) | Bếp, đơn xong, thanh toán QR, thay đổi quyền |
| Hàng đợi | BullMQ + Redis, dựng ở M1 (D-25) | Webhook, trừ kho, báo cáo, thông báo |
| Email | Brevo (D-33) | Đặt lại PIN của khách, xác nhận email |
| Thông báo đẩy | Firebase Cloud Messaging (D-33) | Trạng thái đơn cho khách, đơn online mới cho nhân viên |
| Thông báo nội bộ | Discord webhook (D-33) | Báo cáo cuối ngày, cảnh báo vận hành |
| File | Lưu trữ kiểu S3 (MinIO khi local) | Ảnh món, chứng từ |
| Web | Vite, React 19, TanStack Router + Query, Tailwind 4, shadcn/ui | |
| POS offline | Dexie (IndexedDB) trên web, expo-sqlite trên Android | Cache menu và outbox |
| Mobile | Expo, expo-router, NativeWind | |
| Test | Vitest, test tích hợp trên Postgres và Redis thật (CSDL riêng `_test`, 02 mục 3.4), Playwright | |
| CI | GitHub Actions chạy typecheck, lint, test, build | |

Phiên bản cụ thể và các điểm tương thích: xem [05-decisions.md](05-decisions.md). Cây thư mục và công cụ: [02-repo-setup.md](02-repo-setup.md).

## Cấu trúc repo

```
apps/
  api/            NestJS: src/modules/<domain>, src/common, src/db
  admin/          Web Admin
  pos/            POS web + KDS
  pos-mobile/     POS Android (Expo)
  customer-web/   Web khách hàng
  zalo-mini-app/  Zalo Mini App (app riêng, dùng ui-mobile)
  customer-app/   App khách hàng (Expo)
packages/
  contract/       Zod schema, type, enum, mã quyền, chia theo module
  api-client/     HTTP client có type, hook TanStack Query, socket client
  pos-core/       Logic POS thuần TypeScript dùng chung web và Android
  i18n/           File ngôn ngữ vi và en, định dạng tiền và ngày
  design-tokens/  Màu và metric dùng chung cho mọi app; theme admin, customer, pos, kds, mobile
  ui-web/         Component nền tảng Web (admin, customer-web)
  ui-pos/         Component nền tảng POS (POS + KDS)
  ui-mobile/      Component nền tảng Mobile (zalo-mini-app; thiết kế chung, D-43)
  utils/          Tiền VND, ngày giờ
  config/         tsconfig, eslint, tailwind preset
plans/  docs/
docker-compose.yml   postgres, redis, minio
```

Cây đầy đủ và ràng buộc import: [02-repo-setup.md](02-repo-setup.md) mục 1, 2 (nguồn chuẩn; cây ở đây chỉ để đọc nhanh).

`pos-core` chứa: giỏ hàng, tính giá/giảm giá/thuế, máy trạng thái đơn, outbox đồng bộ (lưu trữ qua adapter), dựng nội dung in dạng `PrintDocument` (18). Không phụ thuộc DOM hay React Native, nên test được bằng unit test thuần. Việc chuyển `PrintDocument` thành byte cho máy in nằm ở từng app.

## Module của API

| Module | Nội dung |
|---|---|
| `auth` | Đăng nhập, refresh token, PIN, phiên thiết bị |
| `rbac` | Quyền, nhóm quyền, hạn mức |
| `approvals` | Duyệt tại chỗ bằng PIN (tách khỏi `rbac` vì cần kiểm tra PIN của `users`, mà `users` đã phụ thuộc `rbac`) |
| `branches` | Chi nhánh, cấu hình chi nhánh |
| `users` | Nhân viên, gán chi nhánh, PIN và khoá tài khoản |
| `devices` | Thiết bị POS, máy in, gắn máy in với thiết bị, mẫu in (18) |
| `audit` | Nhật ký thao tác |
| `media` | Upload ảnh |
| `catalog` | Nhóm món, món, biến thể, tuỳ chọn, giá theo chi nhánh |
| `orders` | Đơn, món trong đơn, giảm giá, huỷ |
| `tables` | Khu vực, bàn, phiên bàn (hoãn sang GĐ 6, D-26) |
| `kitchen` | Trạm, phiếu chế biến |
| `cash` | Ca thu ngân, sổ quỹ |
| `payments` | Thanh toán, phương thức, cổng QR |
| `inventory` | Nguyên liệu, định lượng, phiếu kho, sổ kho |
| `reports` | Báo cáo |
| `sync` | Snapshot cho POS, nhận lệnh offline |
| `notifications` | Gửi email (Brevo), thông báo đẩy (Firebase), tin Discord; module khác gọi service này, không gọi thẳng dịch vụ ngoài |
| `realtime` | Gateway Socket.IO |
| `hr` | Lịch ca, chấm công, lương (GĐ 2) |
| `customers`, `online-orders`, `reservations`, `promotions`, `loyalty` | GĐ 3 |

Quy tắc: module chỉ ghi vào bảng của mình. Muốn thay đổi dữ liệu module khác thì gọi service của module đó.

## Nguyên tắc dữ liệu

1. **Khoá chính UUID v7**, client tự sinh được. Đơn tạo offline có id ngay và đồng bộ không bị trùng.
2. **Cột chuẩn** cho mọi bảng: `id`, `created_at`, `updated_at`, `created_by`. Xoá mềm (`deleted_at`) với dữ liệu danh mục.
3. **`branch_id`** có trên mọi bảng vận hành (đơn, ca, sổ quỹ, kho, chấm công).
4. **Dữ liệu danh mục cấp doanh nghiệp** (món, nguyên liệu), kèm bảng ghi đè theo chi nhánh cho giá và trạng thái bán.
5. **Tiền là số nguyên VND.** Không dùng số thực. Ngoại lệ duy nhất: **đơn giá vốn** của nguyên liệu theo đơn vị cơ sở là số thập phân cố định `numeric(18,4)` (một gram có thể dưới 1 đồng); mọi số tiền tính ra từ nó được làm tròn về số nguyên (16).
6. **Thời gian lưu `timestamptz` UTC.** "Ngày kinh doanh" tính theo múi giờ và giờ chốt ngày của chi nhánh, và được **lưu vào bản ghi** (`business_date`) lúc tạo đơn, ca, phiếu; đổi giờ chốt ngày không làm đổi dữ liệu cũ.
7. **Kho và sổ quỹ là sổ cái chỉ ghi thêm.** Sửa sai bằng bút toán điều chỉnh. Số dư là bảng tổng hợp cập nhật trong cùng transaction.
8. **Đơn hàng lưu snapshot** tên, giá món và tuỳ chọn tại lúc bán.
9. **Mọi request ghi mang ngữ cảnh chi nhánh.** Guard kiểm tra người dùng thuộc chi nhánh và có mã quyền.
10. **Thao tác nhạy cảm ghi audit log**: huỷ món, giảm giá, sửa kho, sửa công, đổi quyền.
11. **Tên hiển thị của dữ liệu danh mục lưu hai ngôn ngữ** dạng `{vi, en}` (`jsonb`); `vi` bắt buộc, `en` tuỳ chọn và lùi về `vi` khi thiếu. Chi tiết: [40-i18n-copy.md](40-i18n-copy.md) mục 4.
12. **API trả mã lỗi, không trả câu chữ.** Client dịch mã sang ngôn ngữ đang dùng.

## Định dạng API (M1-02)

| Trường hợp | Thân phản hồi |
|---|---|
| Thành công, một giá trị | `{ "data": … }` (`data: null` khi không có gì trả về) |
| Thành công, danh sách | `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`; query `?page=1&pageSize=20`, `pageSize` tối đa 100 |
| Lỗi | `{ "error": { "code", "params"?, "issues"?, "requestId"? } }`; `issues` là `[{ path, rule }]` khi `VALIDATION_FAILED` |

- Mã lỗi khai báo ở `packages/contract/src/errors.ts` (`ERROR_CODES`); trạng thái HTTP của từng mã ở `apps/api/src/common/errors/app-error.ts` (`ERROR_STATUS`); bản dịch ở namespace `errors` của `packages/i18n`, `check-i18n` chặn mã thiếu bản dịch.
- Service ném `AppError(code, message, { params })`; `AllExceptionsFilter` dựng thân lỗi. Lỗi không lường trước trả `INTERNAL_ERROR`, không lộ thông báo gốc.
- Validate (M1-03, D-10): `@ZBody(schema)`, `@ZQuery(schema)`, `@ZParam(name, schema)`, `@UuidParam()` trong `apps/api/src/common/zod/` parse bằng schema Zod của `@fnb/contract` và ghi schema lên handler; `@ZResponse(schema, { isPage })` mô tả `data`. Tài liệu OpenAPI 3.1 sinh từ các schema đó bằng `z.toJSONSchema`, xem ở `GET /openapi.json` (không phục vụ khi `NODE_ENV=production`).
- Controller trả giá trị thường hoặc `Paginated`; `ResponseInterceptor` bọc. `@RawResponse()` chỉ dùng cho `/health`, `/openapi.json` và luồng file.

### Request id, log, giới hạn tần suất (M1-04)

- Mỗi request có một `requestId` (UUID v7; giữ lại id do proxy gửi qua header `X-Request-Id` nếu đúng dạng). Id nằm trong header phản hồi, trong `error.requestId` và trên mọi dòng log của request đó (`AppLogger`, đọc từ `RequestContext` dựa trên `AsyncLocalStorage`). Log dạng JSON khi `NODE_ENV=production`, dạng chữ khi dev. Dòng access log chỉ ghi đường dẫn, không ghi query string.
- `RequestContext` (`apps/api/src/common/context/`) cũng giữ IP, và sau khi guard chạy thì có người dùng, chi nhánh, thiết bị; audit log đọc từ đây.
- Giới hạn tần suất: `@RateLimit('login')` + `RateLimitGuard`, đếm theo IP trong Redis (cửa sổ cố định). Mặc định 10 lần mỗi 60 giây (`LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_SECONDS`); vượt thì `429 RATE_LIMITED` kèm header `Retry-After`. `TRUST_PROXY` là số proxy đứng trước API (0 khi local) để đọc đúng IP của client.

## Phân quyền

Đặc tả đầy đủ: [06-permissions.md](06-permissions.md).

- Mỗi tính năng có quyền riêng, mã dạng `module.action`, khai báo trong `packages/contract`.
- Quyền chỉ cấp qua **nhóm quyền** (trong code: `role`). Có nhóm mặc định và nhóm tuỳ chỉnh. Người dùng được gán một nhóm ở mỗi chi nhánh.
- API mặc định cấm: endpoint phải khai báo `@RequirePermission`, `@Authenticated` hoặc `@Public`.
- Quyền không nằm trong token; đọc từ cache, đổi quyền có hiệu lực ngay.
- Mỗi tính năng mới phải có: mã quyền, guard ở API, ẩn/hiện ở giao diện, gán vào nhóm mặc định, tên quyền vi/en.

## Offline POS (mức cơ bản)

```
POS (web/Android)                              API
  ├─ DB cục bộ: menu, bàn, cấu hình  ◄── GET /sync/snapshot?since=version
  ├─ Thao tác bán hàng → ghi DB cục bộ + outbox
  └─ Outbox ──► POST /sync/push (theo lô, có idempotency key) ──► xử lý đúng một lần
```

- Mất mạng vẫn tạo đơn, in bill, thu tiền mặt.
- Số hoá đơn có tiền tố thiết bị, ví dụ `CN1-P02-000123`.
- Thanh toán QR và tồn kho chính xác cần mạng. Server là nguồn chuẩn.
- Đơn offline luôn được nhận khi đồng bộ. Tồn kho âm được ghi nhận và cảnh báo.
- Ngoài phạm vi: các máy POS đồng bộ với nhau qua LAN khi mất internet.

### Quy tắc khi đồng bộ

| Tình huống | Quy tắc |
|---|---|
| Phạm vi làm được khi offline | Thiết bị chỉ tạo và sửa **đơn do chính nó tạo**. Đơn của máy khác (đơn của quầy khác, đơn online) chỉ xem bản đã tải, không sửa được cho tới khi có mạng |
| Thứ tự | Mỗi thiết bị đánh số lệnh tăng dần (`seq`). Server xử lý theo đúng `seq`; thiếu số thì chờ, không nhảy cóc |
| Lệnh lỗi do dữ liệu (ví dụ món đã bị xoá) | Lệnh bán hàng đã xảy ra thật nên **vẫn được nhận** và đánh dấu để kiểm tra; không chặn các lệnh sau |
| Lệnh lỗi do hệ thống (mạng, 5xx) | Thử lại có giãn cách; các lệnh sau **của cùng đơn** chờ, lệnh của đơn khác vẫn đi |
| Lệnh bị từ chối hẳn (sai định dạng, thiết bị đã thu hồi) | Giữ trong outbox ở trạng thái lỗi, hiện ở `SyncStatus`; quản lý xem và xử lý tay. Không tự xoá |
| Đơn đã thanh toán hoặc đã huỷ trên server mà lệnh offline còn sửa | Nhận thành bản ghi điều chỉnh gắn với đơn, đánh dấu, hiện trong báo cáo kiểm soát; không sửa ngược đơn đã đóng |
| Số hoá đơn | Bộ đếm theo thiết bị. Server lưu số lớn nhất đã nhận của mỗi thiết bị và trả về khi thiết bị đăng ký hay tải snapshot; thiết bị bị xoá dữ liệu lấy lại bộ đếm từ đó. Đăng ký lại một máy đã thu hồi thì cấp **mã thiết bị mới** |
| Giờ của thiết bị | Lệnh mang `occurred_at` (giờ thiết bị) và server ghi thêm `received_at`. Ngày kinh doanh tính theo `occurred_at`. Khi online, POS so giờ với server; lệch quá 5 phút thì cảnh báo và đánh dấu các lệnh tạo trong lúc lệch |
| Thời hạn offline | Snapshot có hạn 72 giờ kể từ lần đồng bộ cuối (cấu hình được). Quá hạn thì POS yêu cầu có mạng trước khi bán tiếp, để việc khoá tài khoản và thu hồi thiết bị không bị treo vô hạn |
| Phiên bản | Lệnh mang `catalogVersion` và `calcVersion` để server tính lại đúng giá thiết bị đã dùng (12) |
| Ca thu ngân | Ca chỉ duyệt được khi server đã nhận đủ lệnh của ca (14) |

## Realtime

- Mỗi chi nhánh một room. Client vào room sau khi xác thực.
- Sự kiện: đơn thay đổi, trạng thái bàn, phiếu bếp, thanh toán QR thành công, món tạm hết.
- Sự kiện chỉ là tín hiệu "có thay đổi". Client lấy dữ liệu qua API để tránh lệch trạng thái.
- Gateway Socket.IO và hàng đợi BullMQ dựng ở **M1** (D-25): tín hiệu `permissions.changed` (M1), webhook thanh toán (M5) và trừ kho (M6) đều cần chúng.

| Việc | Sự kiện | Client làm gì khi nhận |
|---|---|---|
| Quyền thay đổi | `permissions.changed` | Tải lại `/auth/me` |
| Bếp có phiếu mới, phiếu đổi trạng thái | `ticket.created`, `ticket.updated` | Tải lại danh sách phiếu của trạm; phát âm báo |
| Đơn đã xong, gọi số | `order.ready` | Quầy hiện số thứ tự cần gọi |
| Khách đã chuyển khoản | `payment.confirmed` | POS đóng màn hình QR, in bill |
| Thực đơn đổi, món tạm hết | `catalog.changed`, `product.availability_changed` | So `version`, tải lại thực đơn |
| Đơn thay đổi | `order.updated` | Tải lại đơn đang mở |

Hàng đợi (M1-25): `QueueService` (`apps/api/src/queue`, BullMQ 6, prefix `fnb`). Module gọi `register(queue, zodSchema, processor)` một lần và `enqueue(queue, jobName, data, { jobId? })`. Mặc định 5 lần thử, giãn cách luỹ thừa từ 2 giây; dữ liệu job parse bằng Zod, sai thì hỏng ngay; processor ném `UnrecoverableError` để không thử lại. Job hỏng hẳn giữ 30 ngày, ghi log lỗi (báo Discord ở M7-07); xem và chạy lại bằng `pnpm --filter @fnb/api cli jobs-failed <queue>` / `jobs-retry <queue> <jobId>`. Worker chạy trong tiến trình API trừ khi `QUEUE_WORKERS=false`.

Khi mất kết nối socket:

- Client tự kết nối lại có giãn cách. **Mỗi lần kết nối lại thì tải lại toàn bộ dữ liệu của màn hình đang mở**, vì sự kiện phát trong lúc mất kết nối không được gửi bù.
- Màn hình bếp và quầy hiện rõ trạng thái "mất kết nối" (không để đứng hình âm thầm); bếp phát âm báo khi mất quá 10 giây.
- Màn hình QR đang chờ thanh toán tự hỏi lại trạng thái mỗi 5 giây trong lúc socket mất, để không bỏ sót một giao dịch đã về.
- Hook trong `api-client` (`useKitchenTickets`, `usePaymentStatus`…) gói cả phần nghe sự kiện và tải lại; màn hình không tự mở socket.

## Thông báo (D-33)

| Kênh | Dùng cho | Từ mốc |
|---|---|---|
| Discord (webhook vào kênh của quán) | Báo cáo cuối ngày (RPT-52); cảnh báo: ca có chênh lệch, tồn dưới mức tối thiểu, tài khoản bị khoá do sai PIN, lệnh đồng bộ lỗi, lỗi hệ thống | M7 |
| Firebase Cloud Messaging | Khách: trạng thái đơn, khuyến mãi (web, app). Nhân viên: đơn online mới | GĐ 3 |
| Brevo (email) | Khách: đặt lại PIN, xác nhận email | GĐ 3 |
| Zalo ZNS | Khách dùng Zalo Mini App | GĐ 5 |

- Module `notifications` là nơi duy nhất gọi các dịch vụ này; gửi qua hàng đợi, lỗi thì thử lại, không làm hỏng thao tác chính.
- Tin Discord không chứa PIN, khoá, số điện thoại đầy đủ của khách. URL webhook là bí mật, nằm trong biến môi trường; mỗi chi nhánh có thể có kênh riêng.
- Nội dung theo ngôn ngữ của người nhận, lấy từ `packages/i18n` (40 mục 5).

## Kiểm thử

| Loại | Phạm vi |
|---|---|
| Unit (Vitest) | `pos-core`: tính tiền, ràng buộc tuỳ chọn, outbox |
| Tích hợp API (Postgres thật) | Phân quyền theo chi nhánh, tính tiền đơn, idempotency, trừ kho, đối soát ca |
| E2E (Playwright) | Luồng đầy đủ: tạo món → mở ca → order → bếp → thanh toán → kho → báo cáo |
| Thủ công | Offline, in ấn trên máy in thật |

## Môi trường

- Local: Docker Compose (Postgres, Redis, MinIO), `pnpm dev`.
- Triển khai lần đầu (D-34): **Vercel + Neon**.

| Phần | Chạy ở đâu | Ghi chú (theo tài liệu Vercel tra ngày 2026-11-26; kiểm lại ở M7-10) |
|---|---|---|
| `admin`, `pos`, `customer-web` | Vercel, file tĩnh | PWA của POS vẫn chạy offline sau khi đã tải |
| API NestJS | Vercel Functions, bật Fluid compute | Hỗ trợ WebSocket; kết nối bị đóng khi hết thời lượng tối đa của function nên client phải tự kết nối lại |
| Socket.IO | Cùng function của API | Client đặt `transports: ['websocket']`. Room và pub/sub đi qua Redis adapter, không giữ trạng thái trong bộ nhớ của function |
| Worker BullMQ | Vercel Daemon (container chạy liên tục) | Tách điểm vào riêng `apps/api/src/worker.ts`; API chỉ đẩy job, không tự xử lý job |
| PostgreSQL | Neon | API dùng chuỗi kết nối có pooling; migration dùng chuỗi kết nối trực tiếp |
| Redis | Dịch vụ Redis trên Vercel Marketplace | Cache quyền, BullMQ, Socket.IO adapter |
| File (ảnh món, chứng từ) | Lưu trữ kiểu S3 | Chọn nhà cung cấp ở M7-10; code chỉ dùng giao thức S3 |

- **Giữ để chuyển nơi chạy được sau này:** API vẫn khởi động được như một tiến trình Node thường (`pnpm --filter api start`) và có Dockerfile; không dùng API riêng của Vercel trong code nghiệp vụ; không giữ trạng thái trong bộ nhớ giữa các request; mọi cấu hình qua biến môi trường.
- Local không đổi: Docker Compose (Postgres, Redis, MinIO); test tích hợp chạy trên chính Postgres đó với CSDL riêng `<tên>_test` (02 mục 3.4).
- PWA, Web Bluetooth và in ấn cần HTTPS: trước M7-10 thử bằng `localhost` và chứng chỉ nội bộ trên máy dev (spike M3-00).
