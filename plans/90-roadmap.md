# 90. Roadmap

Cập nhật lần cuối: **2026-11-27**

## Cách dùng

- `[ ]` chưa làm · `[~]` đang làm · `[x]` xong · `[-]` bỏ/hoãn (ghi lý do)
- Mỗi task có mã riêng (`M2-05`) và tham chiếu mã chức năng trong plan tính năng (`MENU-20`).
- Một task chỉ được tick `[x]` khi: code xong, có test, `pnpm verify` xanh (typecheck, lint, Prettier, test, build), chuỗi mới có đủ `vi` và `en`, và đã thử chạy thật.
- Cuối mỗi mốc: cập nhật bảng tiến độ, ghi vào nhật ký ở cuối file.
- Task tính năng nào cũng gồm phần quyền của nó: khai báo mã quyền, guard API, `<Can>` ở giao diện, gán nhóm mặc định, tên vi/en ([06](06-permissions.md) mục 11). Không tách thành task riêng.
- Task GĐ 0 và GĐ 1 chia chi tiết. Các giai đoạn sau chia ở mức nhóm việc, sẽ tách nhỏ khi tới lượt.

## Tiến độ tổng

| Giai đoạn | Mốc | Nội dung | Trạng thái | Task |
|---|---|---|---|---|
| Chuẩn bị | P | Tài liệu, quy chuẩn, chốt quyết định | Đang làm | 10/13 |
| GĐ 0 | M0 | Scaffold monorepo | Đang làm | 13/14 |
| GĐ 0 | M1 | Nền tảng: auth, phân quyền, chi nhánh, realtime, hàng đợi | Đang làm | 24/26 |
| GĐ 1 | M2 | Thực đơn | Chưa bắt đầu | 0/16 |
| GĐ 1 | M3 | POS bán hàng, ca, sổ quỹ, máy in và mẫu in, offline | Chưa bắt đầu | 0/34 |
| GĐ 1 | M4 | Bếp (phần bàn hoãn, D-26) | Chưa bắt đầu | 0/9 (6 hoãn) |
| GĐ 1 | M5 | Thanh toán QR | Chưa bắt đầu | 0/10 |
| GĐ 1 | M6 | Kho cơ bản | Chưa bắt đầu | 0/17 |
| GĐ 1 | M7 | Báo cáo, E2E, chạy thử | Chưa bắt đầu | 0/14 |
| GĐ 1.5 | M8 | POS Android | Chưa bắt đầu | 0/10 |
| GĐ 2 | M9 | Nhân sự, chấm công, lương | Chưa bắt đầu | 0/9 |
| GĐ 3 | M10 | Web khách hàng | Chưa bắt đầu | 0/11 |
| GĐ 4 | M11 | App khách hàng | Chưa bắt đầu | 0/5 |
| GĐ 5 | M12 | Zalo Mini App | Chưa bắt đầu | 0/5 |
| GĐ 6 | — | Mở rộng | Chưa lên lịch | — |

Thứ tự phụ thuộc: `M0 → M1 → M2 → M3 → (M4, M5, M6 song song được) → M7 → M8 → M9 → M10 → M11 → M12`.

- M4, M5, M6 song song được vì gateway Socket.IO và hàng đợi BullMQ đã có từ M1 (M1-25, M1-26; D-25).
- Quán bán tại quầy, thanh toán ngay (D-26): nên làm **M5 (QR) trước M4 (bếp)** vì thanh toán là bước đầu của mọi đơn; phần bàn của M4 hoãn sang GĐ 6.

---

## P. Chuẩn bị

- [x] **P-01** Chốt phạm vi và các quyết định lớn (D-01 → D-09)
- [x] **P-02** Viết tài liệu kiến trúc và đặc tả tính năng
- [x] **P-03** Lập roadmap
- [x] **P-07** Quy chuẩn: `AGENTS.md`, `CLAUDE.md`, `docs/code-style.md`, `docs/ui-rules.md`, plan 00–03 và 40
- [x] **P-08** Plan phân quyền: quyền theo tính năng, nhóm quyền mặc định và tuỳ chỉnh, hạn mức ([06](06-permissions.md))
- [x] **P-11** Phân tích logo và mặt tiền quán, đề xuất bộ màu và nhận diện ([07](07-brand.md))
- [ ] **P-04** Bạn rà soát plan tính năng và bộ quy chuẩn, chỉnh phạm vi GĐ 1 nếu cần
- [x] **P-05** Xác nhận các đề xuất D-10 (NestJS 12), D-11 (TypeScript 6.0), D-12 (pnpm 11.29)
- [ ] **P-06** Trả lời các câu hỏi cần cho M3: máy in và mẫu máy cầm tay (O-03), phí dịch vụ (O-05). Đã trả lời: thuế (D-28), giờ chốt ngày (D-36)
- [ ] **P-09** Bạn rà bảng quyền của bảy nhóm mặc định và hạn mức (06 mục 4, 5; O-13). Đã trả lời: O-14 (D-40), O-15 (D-41)
- [x] **P-10** Duyệt bộ màu (theo mã đo từ logo), nút chính đỏ, tên thương hiệu; nhận logo 1297 px (07, D-21)
- [x] **P-12** Rà soát chéo toàn bộ plan, bổ sung phần thiếu; thêm plan in ấn ([18](18-printing.md))
- [x] **P-13** Xác nhận D-22, D-23, D-24; D-25 (realtime và hàng đợi làm từ M1); trả lời O-16, O-09, O-05 (thuế), O-10

---

## GĐ 0 — Nền móng

### M0. Scaffold monorepo

Kết quả: clone repo, chạy 3 lệnh là có API + Admin + POS trống chạy được, CI xanh.

- [x] **M0-01** Khởi tạo pnpm workspace + Turborepo, ghim `packageManager`, `.nvmrc`, `.editorconfig`
- [x] **M0-02** `packages/config`: tsconfig strict, ESLint flat config với các rule bắt buộc (`docs/code-style.md` mục 5), Prettier
- [x] **M0-03** `docker-compose.yml`: Postgres 17, Redis, MinIO; file `.env.example`
- [x] **M0-04** `apps/api`: NestJS khung, endpoint `/health`, đọc và kiểm tra biến môi trường
- [x] **M0-05** `packages/contract`, `packages/utils` (tiền VND, ngày giờ, UUID v7) kèm unit test
- [x] **M0-06** `packages/design-tokens`: `tokens.json` ba lớp `palette` → `semantic` (sáng/tối) → `theme` (`admin`, `pos` trước) + bộ sinh biến CSS/Tailwind 4 theo `data-theme` × `data-mode` và theme native (03 mục 5); giá trị màu, bo góc, phông lấy từ 07; `contrast.test.ts` kiểm tương phản mọi theme × hai chế độ (07 mục 3)
- [x] **M0-07** `packages/ui-web` và `packages/ui-pos` nền (shadcn trên token, README); `apps/admin` (theme `admin`) và `apps/pos` (theme `pos`): Vite + React + TanStack Router, trang mẫu `/dev/components`; `LanguageSwitcher` và `ThemeSwitcher` (Theo hệ thống / Sáng / Tối, lưu trên thiết bị) chạy được (03 mục 5.3, 7, 10)
- [x] **M0-08** Script gốc: `dev`, `build`, `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `test`, `verify`, `db:*`, `infra:*`
- [~] **M0-09** GitHub Actions chạy `pnpm verify` — *Đã thêm `.github/workflows/ci.yml` (YAML hợp lệ; cùng chuỗi lệnh `pnpm install --frozen-lockfile && pnpm verify` đã chạy xanh trên một bản clone sạch ở máy dev). **Chưa kiểm:** workflow chưa chạy trên GitHub vì chưa push. Tick sau lần push đầu tiên có CI xanh.*
- [x] **M0-10** Cập nhật `AGENTS.md` (trạng thái, lệnh thật) và `README.md` (cách chạy); ghi rõ `brands/` không thuộc giấy phép MIT (01 mục 1)
- [x] **M0-11** `packages/i18n`: i18next, `locales/vi` và `locales/en`, kiểu của key, `formatMoney`, `formatDate`, `localize` (40 mục 10)
- [x] **M0-12** `scripts/check-filenames.mjs` và `scripts/check-i18n.mjs`, gắn vào `pnpm lint`
- [x] **M0-13** `.githooks/pre-commit`: ESLint + Prettier trên file đã stage, kiểm tra tên file
- [x] **M0-14** Rule ESLint ranh giới: thư viện UI gốc chỉ trong `packages/ui-*`, app chỉ import `ui-*` của nền tảng mình, không import chéo app, không chuỗi hiển thị viết cứng, không mã màu, ngoại lệ cho biến thể trạng thái và biến CSS của shadcn (03 mục 7.4); ràng buộc import giữa các package (02 mục 2)

### M1. Nền tảng (đặc tả: [10](10-foundation.md), phân quyền: [06](06-permissions.md))

Kết quả: đăng nhập Admin, tạo chi nhánh, nhân viên, nhóm quyền (mặc định và tuỳ chỉnh); API chặn đúng theo quyền và chi nhánh.

API khung
- [x] **M1-01** Drizzle: kết nối, helper cột chuẩn, quy trình migration, lệnh seed
- [x] **M1-02** Định dạng phản hồi chung, bộ lọc lỗi, mã lỗi nghiệp vụ, phân trang
- [x] **M1-03** Pipe validate Zod + sinh tài liệu OpenAPI
- [x] **M1-04** Logging có request id; giới hạn tần suất cho đăng nhập
- [x] **M1-05** Hạ tầng test tích hợp với Postgres thật — *CSDL riêng `fnb_test` trên Postgres của compose, không dùng Testcontainers (02 mục 3.4). Workflow CI đã thêm service Postgres và Redis nhưng **chưa chạy trên GitHub** (cùng tình trạng với M0-09).*

Nghiệp vụ
- [x] **M1-06** Chi nhánh và cấu hình chi nhánh — CORE-01, 02
- [x] **M1-07** Nhân viên, gán nhóm quyền theo chi nhánh hoặc tất cả chi nhánh — CORE-10, 11
- [x] **M1-08** Đăng nhập bằng tên đăng nhập + PIN 6 số, refresh token xoay vòng, đăng xuất, thu hồi phiên — CORE-12, 15
- [x] **M1-09** PIN 6 số: quy tắc PIN, PIN tạm buộc đổi, tự đổi PIN, admin đặt lại và mở khoá, khoá tài khoản sau 5 lần sai; super admin đăng nhập Admin bằng mật khẩu (`credential_type`), tự mở khoá sau 30 phút, lệnh đặt lại mật khẩu trên server — CORE-13, 14; 10 mục "Tài khoản nhân viên"
- [x] **M1-10** `definePermissions` + kiểu `PermissionCode` trong contract, đồng bộ vào CSDL, seed bảy nhóm quyền mặc định — CORE-20, 21
- [x] **M1-11** Guard mặc định cấm (`@RequirePermission` / `@Authenticated` / `@Public`), ngữ cảnh chi nhánh, quyền cấp doanh nghiệp — CORE-23
- [x] **M1-12** Duyệt tại chỗ bằng PIN của người có quyền — CORE-24
- [x] **M1-23** Nhóm quyền tuỳ chỉnh, nhân bản, khôi phục mặc định, hạn mức, chống tự nâng quyền; cache quyền + tín hiệu `permissions.changed` — CORE-22, 25 → 28
- [x] **M1-13** Thiết bị POS: đăng ký, thu hồi, token thiết bị, phiên nhân viên bằng PIN — CORE-30, 31, 33
- [x] **M1-14** Audit log: interceptor ghi + API tra cứu — CORE-40
- [x] **M1-15** Upload ảnh lên lưu trữ S3 — CORE-42
- [x] **M1-16** Seed: tài khoản Chủ, một chi nhánh mẫu
- [x] **M1-25** Hạ tầng hàng đợi BullMQ trên Redis: module chung, thử lại, job lỗi (D-25)
- [ ] **M1-26** Gateway Socket.IO (xác thực, room chi nhánh, Redis adapter) và socket client trong `api-client`: tự kết nối lại, tải lại dữ liệu khi kết nối lại, trạng thái mất kết nối (D-25)

Admin
- [x] **M1-17** `packages/api-client`: HTTP client, tự refresh token, hook Query — *dùng thẳng mã nguồn như `ui-web` (không build); refresh dùng chung một lần và khoá Web Lock giữa các tab; Admin đã gắn `ApiProvider`, POS gắn ở M3 (phiên thiết bị). Socket client làm ở M1-26.*
- [x] **M1-18** Đăng nhập, layout, menu theo quyền, bộ chọn chi nhánh — CORE-03 — *một ô "PIN hoặc mật khẩu" theo plan 10 (mockup A1 đã sửa trong repo); chi nhánh đang chọn lưu trên máy (`fnb.admin.branch`), đổi chi nhánh thì xoá cache dữ liệu; quyền của màn hình = quyền tại chi nhánh đang chọn + quyền cấp doanh nghiệp*
- [x] **M1-19** Màn hình Chi nhánh — *tab Thiết bị của mockup làm ở M1-21*
- [x] **M1-20** Màn hình Nhân viên (phân quyền theo chi nhánh, xem quyền thực tế), Nhóm quyền (`PermissionMatrix`, hạn mức, so sánh) — CORE-29
- [x] **M1-21** Màn hình Thiết bị, Nhật ký — CORE-41 — *chưa có "Xuất CSV" của mockup Nhật ký*
- [ ] **M1-22** Test tích hợp: phân quyền theo chi nhánh, vòng đời token, khoá tài khoản sau 5 lần sai PIN và mở khoá
- [x] **M1-24** `route-permissions.test.ts` (mọi endpoint có khai báo quyền) và `scripts/check-permissions.mjs` — 06 mục 11 — *file test là `apps/api/src/route-permissions.int.test.ts` vì khởi động `AppModule` thật (02 mục 3.4)*

---

## GĐ 1 — Web Admin + POS web

### M2. Thực đơn (đặc tả: [11](11-menu.md))

Kết quả: tạo được thực đơn đầy đủ có tuỳ chọn, giá theo chi nhánh; có API snapshot cho POS.

- [ ] **M2-01** Schema và migration nhóm `catalog` (tên hai ngôn ngữ `{vi, en}`, cột tìm kiếm bỏ dấu có chỉ mục)
- [ ] **M2-02** API nhóm món, sắp xếp — MENU-01, 02, 03
- [ ] **M2-03** API món và biến thể — MENU-10, 11, 12, 14, 15, 16
- [ ] **M2-04** API nhóm tuỳ chọn, tuỳ chọn, gán cho món — MENU-20 → 25
- [ ] **M2-05** API bật/tắt, giá theo chi nhánh, tạm hết — MENU-30, 31, 32
- [ ] **M2-06** Sao chép cấu hình giữa chi nhánh — MENU-33
- [ ] **M2-07** Phiên bản thực đơn theo chi nhánh + API snapshot trả toàn bộ thực đơn của chi nhánh — MENU-40
- [ ] **M2-08** Admin: Nhóm món (kéo thả sắp xếp)
- [ ] **M2-09** Admin: Danh sách món, tìm và lọc — MENU-18
- [ ] **M2-10** Admin: Form món (thông tin, ảnh, biến thể, nhóm tuỳ chọn)
- [ ] **M2-11** Admin: Nhóm tuỳ chọn
- [ ] **M2-12** Admin: Giá và trạng thái theo chi nhánh
- [ ] **M2-13** Admin: Xem trước thực đơn như POS — MENU-41
- [ ] **M2-14** Nhập/xuất Excel — MENU-17 (ưu tiên thấp, hoãn được sang sau M3)
- [ ] **M2-15** Test tích hợp: ràng buộc tuỳ chọn, giá hiệu lực, xoá mềm, phiên bản
- [ ] **M2-16** Seed thực đơn mẫu

### M3. POS bán hàng (đặc tả: [12](12-pos-sales.md), [14](14-cash.md), [15](15-payments.md))

Kết quả: thu ngân ghép máy in, mở ca, bán mang đi bằng tiền mặt, in bill trên giấy K57 hoặc K80, đóng ca và in báo cáo ca; bán được khi mất mạng.

Đặc tả in ấn: [18](18-printing.md).

Spike (làm trước, kết quả ghi vào 05)
- [ ] **M3-00** Spike in ấn trên máy in thật của quán: POS web HTTPS gửi lệnh tới máy in LAN, Bluetooth cổ điển và BLE, in tiếng Việt dạng ảnh, tốc độ trên K57 và K80 — O-03, O-18

`pos-core`
- [ ] **M3-01** Mô hình giỏ hàng, kiểm tra ràng buộc tuỳ chọn — POS-02, 03, 04
- [ ] **M3-02** Bộ tính tiền: giảm giá, phí dịch vụ, VAT, phụ thu, làm tròn — POS-10 → 15
- [ ] **M3-03** Máy trạng thái đơn (hai trường `status`, `payment_status`, D-23) và món
- [ ] **M3-04** Outbox (đánh số `seq`, quy tắc thử lại theo 04) + giao diện adapter lưu trữ kèm bộ test hợp đồng — SYNC-03, 04
- [ ] **M3-05** `PrintDocument` và các mẫu bill, tạm tính, báo cáo ca, phiếu nộp/rút, trang in thử; test snapshot ở K57 và K80 — PRINT-01, 02, 20, 24, 26
- [ ] **M3-06** Unit test đầy đủ cho các mục trên

API
- [ ] **M3-07** Schema `orders`, `payments`, `cash`
- [ ] **M3-08** Tạo/sửa đơn, server tính lại tiền, snapshot món
- [ ] **M3-09** Giảm giá, huỷ món, huỷ đơn, lý do, hạn mức theo nhóm quyền — POS-20 → 24
- [ ] **M3-10** Thanh toán tiền mặt và nhiều phương thức, tip — PAY-01 → 05
- [ ] **M3-11** Hoàn tiền toàn bộ và một phần — POS-23, PAY-20, 22
- [ ] **M3-12** Ca thu ngân: mở, nộp/rút, đóng, chuyển đơn sang ca sau, duyệt; ca gắn với két và quỹ; ca chỉ duyệt được khi đã nhận đủ lệnh — CASH-01 → 10
- [ ] **M3-13** Sổ quỹ: quỹ, loại, phiếu thu chi, tự ghi sổ — CASH-20 → 26
- [ ] **M3-14** `/sync/snapshot` (kèm nhân viên, quyền, hạn mức, mã băm PIN của chi nhánh) và `/sync/push` idempotent theo `seq`, `catalogVersion`, `calcVersion`; đánh dấu lệnh offline trái quyền; quy tắc đồng bộ ở 04 — SYNC-01, 02, 07; 06 mục 7.3
- [ ] **M3-15** Sinh số hoá đơn theo thiết bị, khôi phục bộ đếm từ server; số thứ tự gọi món theo ngày — SYNC-06, POS-09

POS web
- [ ] **M3-16** Đăng ký thiết bị, màn hình khoá (chọn nhân viên, nhập PIN), hạn offline của snapshot — CORE-33
- [ ] **M3-17** DB cục bộ (Dexie), tải và cập nhật snapshot
- [ ] **M3-18** Màn hình bán hàng: lưới món, tìm kiếm, giỏ; bố cục tablet và máy cầm tay (D-35) — POS-01
- [ ] **M3-33** Đơn tạm và nhiều đơn song song, gắn khách vào đơn, số khách, nhập giá món thời giá — POS-05 → 08
- [ ] **M3-19** Hộp chọn biến thể và tuỳ chọn: mở khi chạm món có biến thể hoặc tuỳ chọn, chọn 1 hoặc chọn nhiều theo tối thiểu/tối đa, sửa lại từ dòng giỏ (12 mục "Thêm món vào đơn") — POS-02, 04
- [ ] **M3-20** Giảm giá, phụ thu, hạn mức, duyệt tại chỗ bằng PIN (chạy được khi offline)
- [ ] **M3-21** Màn hình thanh toán — POS-30, 31, 32
- [ ] **M3-22** Danh sách và chi tiết đơn, in lại — POS-40, 41
- [ ] **M3-23** Mở ca, xem nhanh ca, nộp/rút, đóng ca và đếm tiền theo mệnh giá, in báo cáo ca; chạy được khi offline — 14 mục "Luồng trên POS", CASH-10
- [ ] **M3-24** Thanh trạng thái đồng bộ, xử lý lệnh lỗi — SYNC-05
- [ ] **M3-25** PWA: cài đặt, chạy khi không có mạng — SYNC-08
- [ ] **M3-26** In: renderer ảnh và chữ, đường truyền LAN và Bluetooth theo kết quả M3-00, hàng đợi in lưu cục bộ, mở két — PRINT-04 → 09
- [ ] **M3-31** POS: màn hình Máy in (thêm Bluetooth/LAN, khổ K57/K80, gán vai trò, in thử, trạng thái, tự kết nối lại, hàng đợi in) — PRINT-10 → 18

Admin
- [ ] **M3-27** Danh sách đơn và chi tiết
- [ ] **M3-28** Ca thu ngân và duyệt; sổ quỹ, phiếu thu chi
- [ ] **M3-29** Cấu hình: lý do huỷ, phương thức thanh toán, máy in theo chi nhánh — CORE-32
- [ ] **M3-32** Mẫu in theo chi nhánh: bật/tắt khối, nội dung hai ngôn ngữ, tuỳ chọn, xem trước K57/K80 trên Admin và POS — PRINT-03, 21 → 23

Kiểm chứng
- [ ] **M3-30** Test tích hợp (tính tiền, idempotency, đối soát ca) + thử offline thủ công + in thử trên máy in thật ở K57 và K80

### M4. Bếp (đặc tả: [13](13-tables-kitchen.md))

Kết quả: đơn thanh toán xong thì phiếu xuống đúng trạm, bếp bấm xong thì quầy biết để gọi số, các máy thấy cùng trạng thái. Các task phần bàn đánh dấu `[-]`: hoãn sang GĐ 6 theo D-26 (EXT-47).

- [ ] **M4-01** Schema `kitchen`
- [-] **M4-04** API khu vực, bàn, tạo hàng loạt, QR bàn — TABLE-01 → 05
- [-] **M4-05** Phiên bàn: mở, gọi thêm, khoá đơn có hết hạn và giành lại — TABLE-12, 18
- [-] **M4-06** Chuyển, gộp, tách đơn, chuyển món, tách bàn đã gộp — TABLE-13 → 17, 19
- [ ] **M4-07** Trạm chế biến và định tuyến — KDS-01, 02, 03
- [ ] **M4-08** Gửi bếp tự động khi đơn thanh toán xong: tách phiếu theo trạm, phiếu huỷ — KDS-10, 12, 13
- [ ] **M4-09** Trạng thái phiếu và món, báo quầy đơn xong kèm số thứ tự qua socket — KDS-21, 24
- [-] **M4-10** Admin: Khu vực, bàn, thiết kế sơ đồ
- [ ] **M4-11** Admin: Trạm và định tuyến
- [-] **M4-12** POS: Sơ đồ bàn realtime — TABLE-10, 11
- [-] **M4-13** POS: Chi tiết bàn, chuyển/gộp/tách, tách thanh toán
- [ ] **M4-14** Mẫu phiếu chế biến và phiếu huỷ ở K57/K80, máy in theo trạm và máy dự phòng — KDS-11, 14; PRINT-13, 25
- [ ] **M4-15** KDS: bảng phiếu, cảnh báo quá giờ, âm báo — KDS-20, 22, 27
- [ ] **M4-16** KDS: xem gộp, lịch sử, báo tạm hết — KDS-23, 25, 26
- [ ] **M4-17** Test tích hợp: định tuyến, gửi bếp sau thanh toán; thử POS và KDS cùng lúc

### M5. Thanh toán QR (đặc tả: [15](15-payments.md))

Kết quả: khách quét QR, vài giây sau POS tự báo đã thanh toán.

- [ ] **M5-01** Đăng ký SePay (D-44), nối tài khoản ngân hàng nhận tiền, chọn gói theo số giao dịch, lấy khoá thử
- [ ] **M5-02** Giao diện `PaymentProvider` + adapter SePay — PAY-18
- [ ] **M5-03** Yêu cầu thanh toán: sinh VietQR, mã tham chiếu, hết hạn — PAY-10, 14
- [ ] **M5-04** Webhook: kiểm tra chữ ký, lưu thô, xử lý qua hàng đợi (M1-25), idempotent — PAY-12
- [ ] **M5-05** Khớp giao dịch, xử lý thiếu/thừa/trùng — PAY-13, 15
- [ ] **M5-06** POS: hiển thị QR, chờ xác nhận realtime (hỏi lại khi socket mất), in QR lên tạm tính — PAY-11
- [ ] **M5-07** Xác nhận tay có quyền — PAY-16
- [ ] **M5-08** Admin: cấu hình cổng theo chi nhánh — PAY-19
- [ ] **M5-09** Admin: đối soát chuyển khoản, hoàn chuyển khoản — PAY-17, 21
- [ ] **M5-10** Test tích hợp với webhook giả lập; thử một giao dịch thật

### M6. Kho cơ bản (đặc tả: [16](16-inventory.md))

Kết quả: bán một món thì nguyên liệu tự giảm đúng định lượng; kiểm kê ra chênh lệch.

- [ ] **M6-01** Schema `inventory`
- [ ] **M6-02** Nguyên liệu, đơn vị, quy đổi — INV-01, 02
- [ ] **M6-03** Nhà cung cấp, kho theo chi nhánh — INV-03, 04
- [ ] **M6-04** Lõi sổ kho: ghi biến động + cập nhật tồn + giá vốn bình quân trong một transaction; quy tắc khi tồn âm và khi đảo phiếu (16)
- [ ] **M6-05** Định lượng món, biến thể, tuỳ chọn; giá vốn món — INV-10 → 14
- [ ] **M6-06** Phiếu nhập, thanh toán phiếu nhập — INV-20, 21, 22
- [ ] **M6-07** Phiếu xuất huỷ, điều chỉnh, đảo phiếu — INV-23, 24, 25
- [ ] **M6-08** Job trừ kho khi đơn thanh toán (hàng đợi từ M1-25), idempotent, định lượng theo ngày hiệu lực — INV-30, 33, 34
- [ ] **M6-09** Hoàn kho khi hoàn tiền; hao hụt khi huỷ món — INV-31, 32
- [ ] **M6-10** Kiểm kê — INV-40, 41
- [ ] **M6-11** Admin: Nguyên liệu, nhà cung cấp
- [ ] **M6-12** Admin: Định lượng trong form món
- [ ] **M6-13** Admin: Phiếu nhập, phiếu xuất huỷ
- [ ] **M6-14** Admin: Kiểm kê
- [ ] **M6-15** Admin: Tồn kho, thẻ kho, cảnh báo tồn thấp — INV-42, 43, 44
- [ ] **M6-16** Báo cáo nhập–xuất–tồn, chênh lệch tiêu hao — INV-45, 46
- [ ] **M6-17** Test tích hợp: trừ kho theo định lượng, không trừ hai lần, giá vốn bình quân, kiểm kê

### M7. Báo cáo và hoàn thiện GĐ 1 (đặc tả: [17](17-reports.md))

Kết quả: chạy thử thật ở một chi nhánh.

- [ ] **M7-01** Lớp truy vấn báo cáo theo `business_date` và chỉ mục; đo tốc độ trên dữ liệu mẫu lớn (bảng tổng hợp chỉ làm nếu chậm quá 2 giây, 17)
- [ ] **M7-02** Dashboard, chế độ "tất cả chi nhánh" — RPT-01 → 04, CORE-04
- [ ] **M7-03** Báo cáo doanh thu — RPT-10 → 15
- [ ] **M7-04** Báo cáo món — RPT-20 → 23
- [ ] **M7-05** Báo cáo kiểm soát — RPT-30 → 34
- [ ] **M7-06** Bộ lọc chung, xuất Excel — RPT-50, 51
- [ ] **M7-07** Module `notifications` + Discord webhook: báo cáo cuối ngày và cảnh báo vận hành — RPT-52, D-33
- [ ] **M7-08** Playwright E2E toàn luồng: tạo món → mở ca → gọi món tại quầy → thanh toán → KDS → gọi số → kho giảm → báo cáo khớp
- [ ] **M7-09** Rà soát quyền: mọi endpoint có guard, mọi nút có kiểm tra quyền, bảng 06 mục 4 khớp code và khớp cách quán vận hành
- [ ] **M7-10** Triển khai lên Vercel + Neon (D-34): web tĩnh, API trên Functions có Fluid compute, worker BullMQ dạng daemon, Redis, lưu trữ S3; Dockerfile; sao lưu CSDL và thử khôi phục; đo khởi động nguội và độ trễ socket; viết `plans/42-release-ops.md`
- [ ] **M7-11** Giám sát lỗi và log trên môi trường thật; viết `plans/41-testing.md`
- [ ] **M7-12** Tài liệu hướng dẫn sử dụng cho thu ngân, bếp, quản lý
- [ ] **M7-13** Chạy thử tại một chi nhánh, thu phản hồi, sửa lỗi
- [ ] **M7-14** Kế hoạch và script chuyển từ hệ thống cũ: thực đơn, nhân viên, tồn đầu kỳ, quỹ đầu kỳ, ngày chuyển, quay lui (00 mục 2.1)

---

## GĐ 1.5 — POS Android

### M8 (đặc tả: [31](31-pos-android.md))

- [ ] **M8-01** Chọn mẫu tablet và máy cầm tay (D-35, O-03); khởi tạo app Expo trong monorepo, development build; component native trong `src/shared-components` theo thiết kế và tên của nền tảng POS (D-03)
- [ ] **M8-02** Adapter lưu trữ expo-sqlite cho outbox và snapshot — MPOS-05
- [ ] **M8-03** Đăng ký thiết bị, đăng nhập, PIN — MPOS-01
- [ ] **M8-04** Bán hàng và thanh toán — MPOS-02, 08 (tách theo màn hình khi tới M8)
- [ ] **M8-05** Bố cục tablet và máy cầm tay — MPOS-04, D-35 (sơ đồ bàn MPOS-03 hoãn theo D-26)
- [ ] **M8-06** In nhiệt Bluetooth/LAN/USB (renderer và đường truyền native cho `PrintDocument`), màn hình Máy in, mở két — MPOS-06, 07
- [ ] **M8-07** Ca thu ngân — MPOS-09
- [ ] **M8-08** Thông báo đẩy, quét mã — MPOS-10, 11
- [ ] **M8-09** Kiosk, giữ màn hình, OTA, log lỗi — MPOS-12 → 15
- [ ] **M8-10** Thử trên thiết bị thật, phát hành APK nội bộ

---

## GĐ 2 — Nhân sự

### M9 (đặc tả: [20](20-hr.md))

- [ ] **M9-01** Lấy con số cụ thể cho lương: mức phạt đi trễ, ân hạn, phụ cấp, hệ số tăng ca (cách làm đã chốt ở D-37, D-38)
- [ ] **M9-02** Hồ sơ nhân viên, mức lương theo ngày hiệu lực — HR-01 → 04
- [ ] **M9-03** Mẫu ca, xếp lịch tuần, yêu cầu đổi ca/nghỉ — HR-10 → 15
- [ ] **M9-04** Trang `/me` trong Admin cho nhân viên, bố cục điện thoại — HR-12, D-37
- [ ] **M9-05** Chấm công GPS trên `/me`: bán kính theo chi nhánh, lưu toạ độ và độ chính xác, đánh dấu lần chấm cần xem lại — HR-20, 21, 22, 28
- [ ] **M9-06** Ghép ca, quy tắc trễ/sớm/tăng ca, sửa công, bảng công — HR-23 → 27
- [ ] **M9-07** Bộ tính lương: giờ, tháng, hệ số, phụ cấp, thưởng phạt, tạm ứng — HR-30 → 36
- [ ] **M9-08** Bảng lương: nháp, chỉnh, chốt, trả lương, phiếu lương — HR-37 → 41
- [ ] **M9-09** Trang nhân viên tự xem lịch, công, lương; báo cáo chi phí lương

---

## GĐ 3 — Web khách hàng

### M10 (đặc tả: [21](21-customers.md))

- [ ] **M10-01** Chốt hình thức giao hàng; tạo tài khoản Brevo và dự án Firebase (D-33); tách plan 21 thành plan 22 → 26 và chia lại task của M10
- [ ] **M10-02** Tài khoản khách: số điện thoại + PIN 6 số, email, đặt lại PIN qua email (Brevo), khoá sau 5 lần sai, hồ sơ, địa chỉ — CUS-01 → 04, 07
- [ ] **M10-03** Quản lý khách ở Admin, gộp khách POS và online — CUS-05, 06
- [ ] **M10-04** Web khách: khởi tạo `apps/customer-web` trên `ui-web` với theme `customer` (đầu trang thương hiệu, hoạ tiết sóng, `ProductCard`, `BottomBar`; 03 mục 5.2, 10); chọn chi nhánh, thực đơn, giỏ, đặt đơn — ORD-01 → 06
- [ ] **M10-05** Nhận đơn online ở POS, theo dõi trạng thái, thông báo đẩy qua Firebase — ORD-07 → 12
- [ ] **M10-06** Gọi món tại bàn bằng QR — QR-01 → 07
- [ ] **M10-07** Đặt bàn phía khách: chỗ trống, đặt, cọc, nhắc lịch — RSV-01 → 06
- [ ] **M10-08** Đặt bàn phía quán: lịch, gán bàn, khách đến, không đến — RSV-07 → 12
- [ ] **M10-09** Voucher và khuyến mãi — PROMO-01 → 07
- [ ] **M10-10** Tích điểm và hạng thành viên — LOY-01 → 05
- [ ] **M10-11** Báo cáo khách hàng và khuyến mãi; E2E luồng đặt món và đặt bàn

---

## GĐ 4 — App khách hàng

### M11 (đặc tả: [32](32-customer-app-zalo.md))

- [ ] **M11-01** Khởi tạo app Expo là vỏ WebView bọc web khách, giữ phiên đăng nhập, màn hình mất mạng — APP-01, 02, D-42
- [ ] **M11-02** Rà web khách ở bề rộng điện thoại trong WebView: thanh dưới, vùng chạm, cử chỉ quay lại — APP-02
- [ ] **M11-03** Thông báo đẩy, liên kết sâu — APP-03, 07
- [ ] **M11-04** Cầu nối native cho web: thẻ thành viên QR, camera quét mã, định vị — APP-04, 05, 06
- [ ] **M11-05** Xoá tài khoản, OTA, phát hành lên cửa hàng ứng dụng — APP-08, 09, 10

---

## GĐ 5 — Zalo Mini App

### M12 (đặc tả: [32](32-customer-app-zalo.md))

- [ ] **M12-01** Chuẩn bị Zalo OA, đăng ký Mini App, mẫu ZNS
- [ ] **M12-02** Khởi tạo `apps/zalo-mini-app`; `ui-mobile`: đặc tả thiết kế chung và bản React DOM cho Mini App, theme `mobile` (D-43); lớp nền tảng Zalo — ZMA-01, 02
- [ ] **M12-03** Đăng nhập Zalo, lấy số điện thoại, gộp khách — ZMA-03
- [ ] **M12-04** Đặt món, đặt bàn, voucher, điểm, thanh toán — ZMA-04, 07, 09
- [ ] **M12-05** ZNS, quan tâm OA, chia sẻ; gửi kiểm duyệt và phát hành — ZMA-05, 06, 08

---

## GĐ 6 — Mở rộng

Danh sách ứng viên ở [29-extensions.md](29-extensions.md). Chọn và lên lịch sau khi GĐ 1 chạy ổn định ở quán.

---

## Việc đang chờ bạn

| Việc | Cần cho |
|---|---|
| Rà soát plan tính năng và bộ quy chuẩn (P-04) | Bắt đầu M0 |
| Rà bảng quyền của nhóm mặc định và hạn mức (P-09) | M1-10 |
| Bật Docker Desktop trên máy dev | M0-03 |
| Thông tin máy in (hãng, K57/K80, LAN/Bluetooth), mẫu máy cầm tay, có thu phí dịch vụ không; cho mượn một máy in thật để làm spike | M3-00 |
| Mở tài khoản SePay và tài khoản ngân hàng nhận tiền (D-44) | M5-01 |

## Nhật ký

| Ngày | Nội dung |
|---|---|
| 2026-11-26 | Chốt phạm vi và kiến trúc. Viết bộ tài liệu và roadmap. Kiểm tra phiên bản thư viện: phát sinh đề xuất D-10, D-11, D-12. Chưa viết code. |
| 2026-11-26 | Chuyển tài liệu sang `plans/` đánh số, tên file tiếng Anh. Thêm `AGENTS.md`, `docs/code-style.md`, `docs/ui-rules.md`, plan 00–03 và 40. Chốt D-13 → D-18 (hai ngôn ngữ, shared-components, an toàn giá trị thiếu, lint/Prettier, tên file tiếng Anh). M0 tăng lên 14 task. |
| 2026-11-26 | Thêm plan 06 phân quyền: 84 quyền theo tính năng, bảy nhóm quyền mặc định, nhóm tuỳ chỉnh, hạn mức, duyệt tại chỗ, API mặc định cấm. Chốt D-19; mở O-13 → O-15. M1 tăng lên 24 task. Đổi thuật ngữ "vai trò" thành "nhóm quyền". |
| 2026-11-26 | Đổi design system: chỉ màu và metric dùng chung (`packages/design-tokens`); mỗi app có `src/shared-components` riêng, bỏ package component chung và Storybook (thay bằng trang mẫu trong app). Zalo Mini App thành app riêng (D-20). Sửa D-14, plan 02, 03, 32, `AGENTS.md`, `docs/ui-rules.md`. |
| 2026-11-26 | Phân tích `brands/` (logo, phối cảnh quán). Thêm plan 07: bảng màu đỏ/cam/nâu ấm, màu theo vai trò sáng/tối đã đo tương phản AA, phông, cách dùng logo. Thêm token `accent`; trạng thái "đang phục vụ" chuyển sang `accent`; `danger` dùng đỏ hồng để tách khỏi đỏ thương hiệu. |
| 2026-11-26 | Chốt thương hiệu (D-21): tên Banhkepchonong Burger&Co, nút chính đỏ, màu lấy mẫu lại từ logo 1297 px (`#CA0404`, `#ED6F03`, `#F99903`, `#F5BC09`). Cập nhật plan 07, 01, 05. |
| 2026-11-26 | Rà soát chéo toàn bộ plan (P-12). Thêm plan 18 in ấn: quản lý máy in Bluetooth/LAN trên POS, mẫu in, khổ K57 và K80, `PrintDocument`; chuyển PRINT-01 → 07 từ plan 12 sang. Bổ sung luồng mở ca/đóng ca trên POS (14). Đề xuất D-22 → D-25; mở O-16 → O-20; O-09 kéo về trước M3. Thêm quy tắc đồng bộ offline (04), xác thực POS (10), quyền `cash.carry_over_orders` (85 quyền). Roadmap: Socket.IO và BullMQ về M1 (M1-25, M1-26, bỏ M4-02, M4-03); M3 thêm M3-00, M3-31 → M3-34; thêm M7-14. Báo cáo GĐ 1 truy vấn trực tiếp, hoãn bảng tổng hợp. |
| 2026-11-26 | Chốt D-26: gọi món tại quầy, thanh toán ngay; mọi đơn trả tiền trước rồi gửi bếp, có số thứ tự gọi món (POS-09). Phần bàn hoãn sang GĐ 6 (EXT-47): M4 còn 9 task bếp, 6 task bàn đánh dấu hoãn; nên làm M5 trước M4. Chốt D-27: hoá đơn điện tử làm sau (EXT-20). Đóng O-16, O-09. |
| 2026-11-26 | Chốt D-28: hộ kinh doanh, giá đã gồm thuế; VAT tắt mặc định, bill không có dòng VAT. O-05 chỉ còn câu hỏi phí dịch vụ. |
| 2026-11-26 | Xác nhận D-22. Chốt D-29: nhân viên dùng tên đăng nhập + PIN 6 số cho cả Admin và POS, không có mật khẩu riêng; sai 5 lần khoá tài khoản, admin mở và đặt lại; một super admin do chủ giữ; nhóm `waiter` đổi thành `staff` (Nhân viên). Chốt D-30: khách dùng số điện thoại + PIN 6 số, email để đặt lại, bỏ OTP; số điện thoại là khoá chuẩn mọi kênh. Sửa plan 06, 10, 21, 32. |
| 2026-11-26 | Đổi design system lần hai theo yêu cầu: component chia ba nền tảng **Web** (`admin`, `customer-web` → `packages/ui-web`), **POS** (POS + KDS → `packages/ui-pos`), **Mobile** (`customer-app`, `zalo-mini-app` → `packages/ui-mobile`). Chốt D-31: token ba lớp có theme `admin` (đơn giản), `customer` (kiểu riêng), `pos`, `kds`, `mobile`; mọi app có `ThemeSwitcher` sáng/tối. Mở O-21 (dùng chung code giữa Expo và Zalo). Sửa D-14, plan 00, 02, 03, 04, 06, 07, 18, 31, 32, README, `AGENTS.md`, `docs/ui-rules.md`, `docs/code-style.md`, M0-06, M0-07, M0-14, M8-01, M10-04, M11-01, M12-02. Mockup trang Design system trong `ui-mockup/`. |
| 2026-11-26 | Xác nhận D-23, D-24. D-25 không làm sớm, thay bằng D-32: GĐ 1 dùng polling, realtime nâng cấp sau chạy thử (M7-15); bỏ M1-25, M1-26, M3-34; thêm M4-18; BullMQ dựng ở M5-04. Chốt D-33: Brevo (email), Firebase (thông báo đẩy), Discord (thông báo nội bộ, báo cáo cuối ngày); đóng O-10. Sửa D-29: PIN đặt tuỳ ý; super admin đăng nhập Admin bằng mật khẩu, server phân biệt theo `credential_type`. |
| 2026-11-26 | Đổi lại: chốt D-25, realtime làm ngay. Socket.IO và BullMQ dựng ở M1 (M1-25, M1-26); bỏ D-32, M4-18, M7-15 và phần polling. Thêm quy tắc khi mất kết nối socket (04). Môi trường triển khai vẫn ở M7-10. |
| 2026-11-26 | Mockup theo ba nền tảng (`ui-mockup/`, canvas bốn trang Nền tảng / POS / Web / Mobile): thêm đặc tả component chi tiết cho từng nền tảng (`spec-pos`, `spec-web`, `spec-mobile`) và luồng màn hình đánh số: POS 9 bước (đăng nhập → đóng ca), Admin 4 bước, web khách 6 bước, app 7 bước, Zalo. Logo nền trong suốt `brands/*-transparent.png`. Thêm tên `StaffPicker`, `QueueNumber`, `ItemTotals`, `CartPanel`, `MemberCard`, `PermissionCard` vào plan 03 mục 7.3; cập nhật 07 mục 1.4, 6. |
| 2026-11-26 | Chốt D-34 (Vercel + Neon; đã tra tài liệu Vercel: Functions có Fluid compute chạy được WebSocket, worker BullMQ chạy dạng daemon), D-35 (POS trên tablet và máy cầm tay), D-36 (mở 10:00–22:00, chốt ngày 00:00), D-37 (chấm công GPS trên `/me` trong Admin), D-38 (lương theo giờ và tháng), D-39 (bill tiếng Việt), D-40 (quyền tách biệt theo chi nhánh), D-41 (quản lý không sửa thực đơn chung), D-42 (web khách responsive trước, app là vỏ WebView), D-43 (`ui-mobile` là thiết kế chung, mỗi công nghệ một bản code). Xác nhận lại D-03 (POS Android giao diện native riêng). Đóng O-01, 04, 06, 07, 08, 12, 14, 15, 17, 19, 20, 21. |
| 2026-11-26 | Mockup Admin đủ màn tính năng (37 màn mới trong `ui-mockup/`, trang Web của canvas): hệ thống và phân quyền, thực đơn, bán hàng và quỹ, thanh toán, kho, báo cáo, nhân sự (kèm `/me`), khách hàng và ưu đãi; menu trái chuẩn chung cho mọi màn Admin. Sửa trang Mobile của mockup cho khớp D-42, D-43 (app khách là WebView của web khách; `ui-mobile` cho Zalo). |
| 2026-11-26 | Chốt D-44: cổng QR đầu tiên là SePay; đóng O-02. |
| 2026-11-26 | Bổ sung luồng thêm món trên POS: chạm món có biến thể hoặc nhóm tuỳ chọn thì mở hộp chọn (chọn 1 / chọn nhiều, bắt buộc, tạm hết, ghi chú, số lượng), món không có thì thêm thẳng; sửa lại tuỳ chọn từ dòng giỏ. Thêm mục "Thêm món vào đơn" vào plan 12, sửa mockup `pos-sale.dc.html` (trong repo, chưa đưa lên canvas), `ui-mockup/README.md`, M3-19. |
| 2026-11-26 | Mockup POS bổ sung 15 màn (P10–P17, P20–P26): danh sách và chi tiết đơn, duyệt tại chỗ, gắn khách và ưu đãi, thanh toán QR, chia tiền, bố cục máy cầm tay (D-35), nộp/rút tiền, báo cáo ca, máy in, hàng đợi in, đăng ký và cài đặt thiết bị, lịch sử phiếu KDS. Sửa giờ ca trong mockup cho khớp D-36. |
| 2026-11-26 | Xác nhận D-10 (NestJS 12), D-11 (TypeScript 6.0), D-12 (pnpm 11.29); tick P-05. Bắt đầu M0 trên nhánh `dev` (tách từ `main`): mỗi task một commit thẳng lên `dev`, không push. |
| 2026-11-26 | **M0 (scaffold) làm xong 13/14 task**, mỗi task một commit trên `dev`, chưa push. Có: workspace pnpm 11.29 + Turborepo; `packages/config` (tsconfig strict, ESLint 10 flat config, Prettier); Docker Compose (Postgres 17, Redis 8, MinIO) đã chạy thật; `apps/api` NestJS 12 ESM với `/health`; `contract`, `utils`, `i18n` (i18next 27), `design-tokens` (theme `admin`, `pos`, test tương phản), `ui-web`, `ui-pos`, `apps/admin`, `apps/pos` với `/dev/components`; script kiểm tên file và i18n; rule ESLint ranh giới; pre-commit hook; workflow CI. Còn `[~]` M0-09: workflow chưa chạy trên GitHub vì chưa push. Lệch so với plan, đã sửa plan: `eslint-plugin-import-x` thay `eslint-plugin-import`; NestJS 12.6.2, Vite 8.3.8, lucide 1.80 (pnpm chỉ cài bản phát hành quá 24 giờ); image MinIO của Chainguard; Postgres ra cổng host 5433; `localizedTextSchema` làm sớm ở M0-05; `pnpm db:*` chỉ là lệnh giữ chỗ tới M1-01. Phát hiện: hai cặp màu trung tính chưa đạt AA ở chế độ sáng (07 mục 3, chờ duyệt). |
| 2026-11-27 | Xong M1-17: `packages/api-client` (`createApiClient`, `createHttpClient` parse Zod và bóc `{ data }`, `ApiError` + `errorMessageKey`, `TokenStore`, `createQueryClient`, `ApiProvider`, hook `auth`). Tự refresh khi `TOKEN_EXPIRED`, dùng chung một lần refresh, khoá Web Lock giữa các tab để không dùng lại refresh token đã xoay. Thêm TanStack Query 5.108 vào catalog. Đã chạy thử với API thật: đăng nhập, `/auth/me`, tự refresh sau khi access token hết hạn, đăng xuất. |
| 2026-11-27 | Xong M1-24: `apps/api/src/route-permissions.int.test.ts` duyệt mọi endpoint của `AppModule`: phải khai báo `@Public` / `@Authenticated` / `@RequirePermission`, danh sách endpoint `@Public` cố định trong test (mở thêm phải sửa test), mã quyền đã khai báo và tham số chi nhánh có trên route; gọi thật: không token → `401`, nhóm không có quyền → `403`, sai chi nhánh → `403`. `scripts/check-permissions.mjs` (trong `pnpm lint`, test `scripts/check-permissions.test.mjs`) đọc mã nguồn contract: quyền thiếu tên/mô tả vi, en; quyền không endpoint nào dùng; `@RequirePermission` với mã chưa khai báo; bảng 06 mục 4 lệch nhóm mặc định hay ghi chú DN/N/D. |
| 2026-11-27 | Xong M1-18: Admin có màn đăng nhập (tên + một ô PIN hoặc mật khẩu, lỗi chung cho mọi trường hợp sai), màn đổi PIN/mật khẩu (bắt buộc khi PIN tạm), route guard `/_app` dựa trên `/auth/me` (chưa đăng nhập → `/login?redirect=`, PIN tạm → `/change-pin`), `AdminShell` với menu theo quyền, bộ chọn chi nhánh (gửi `X-Branch-Id`), ngôn ngữ, sáng/tối, menu tài khoản. `ui-web` thêm `AppShell`, `Sidebar`, `PageHeader`, `Select`, `Menu`, `Can`, `NoPermission`, `FormSection`, `FormActions`. Thêm react-hook-form 7.92 và `@hookform/resolvers` 7.0.9 vào catalog. Namespace i18n `admin`. |
| 2026-11-27 | Xong M1-19: màn Chi nhánh `/branches` (HT1): danh sách và trạng thái, tạo chi nhánh, sửa thông tin, giờ và ngày kinh doanh, thuế và phí, thông tin bill, tài khoản nhận QR; ngừng/hoạt động lại qua `ConfirmDialog`. Ô bị khoá theo quyền tại chính chi nhánh đang xem (`permissionsAt`). `api-client` thêm module `branches`; `ui-web` thêm `Badge`, `Tabs`, `DangerButton`, `IconButton`, `ConfirmDialog`. Namespace i18n `branches`. |
| 2026-11-27 | Xong M1-20: màn Nhân viên `/staff` (mẫu chuẩn cho các màn danh sách sau), chi tiết nhân viên (thông tin, phân quyền theo chi nhánh, quyền thực tế, đăng nhập và PIN; PIN tạm do màn hình sinh và hiện một lần), Nhóm quyền `/roles` (danh sách, nhân bản, xoá), sửa/tạo nhóm với `PermissionMatrix` và hạn mức, khôi phục mặc định, so sánh hai nhóm. `ui-web` thêm `DataTable`, `FilterBar`, `Pagination`, `Checkbox`, `LocalizedInput`; token `z-popover` (1350) để `Select`/`Menu` mở được trong hộp thoại. `api-client` thêm module `users`, `roles`. Namespace i18n `staff`, `roles`. |
| 2026-11-27 | Xong M1-21: màn Thiết bị `/devices` (lọc, thu hồi; hướng dẫn đăng ký trên máy POS), tab Thiết bị trong màn Chi nhánh, màn Nhật ký `/audit-log` (lọc người, loại, phạm vi, ngày; hộp thoại trước/sau), tab Nhật ký ở trang nhân viên. API: `GET /audit-logs` trả thêm `actorName` (trước đây luôn `null`). `api-client` thêm module `devices`, `audit`. Namespace i18n `devices`, `audit`. Còn thiếu so với mockup: nút "Xuất CSV" và ô tìm theo mã đơn ở Nhật ký. |
