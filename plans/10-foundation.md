# 10. Nền tảng: chi nhánh, tài khoản, phân quyền, thiết bị

Giai đoạn: **GĐ 0** · Module API: `auth`, `rbac`, `branches`, `users`, `devices`, `audit`, `media`

## Mục tiêu

Mọi tính năng sau này đều dựa trên: ai đang thao tác, ở chi nhánh nào, có quyền gì, trên thiết bị nào.

## Chức năng

### Chi nhánh

| Mã | Chức năng |
|---|---|
| CORE-01 | Tạo, sửa, ngừng hoạt động chi nhánh: tên, mã (dùng làm tiền tố hoá đơn), địa chỉ, số điện thoại, toạ độ |
| CORE-02 | Cấu hình theo chi nhánh: múi giờ, giờ mở cửa (mặc định 10:00–22:00), giờ chốt ngày (mặc định 00:00, D-36), thuế suất (mặc định 0%, giá đã gồm thuế, D-28), phí dịch vụ, thông tin in trên bill, tài khoản ngân hàng nhận QR |
| CORE-03 | Bộ chọn chi nhánh ở Admin; mọi màn hình vận hành lọc theo chi nhánh đang chọn |
| CORE-04 | Chế độ "tất cả chi nhánh" cho báo cáo (cần quyền) |

### Tài khoản nhân viên

| Mã | Chức năng |
|---|---|
| CORE-10 | Tạo, sửa, khoá nhân viên: họ tên, số điện thoại, tên đăng nhập, ảnh |
| CORE-11 | Gán nhân viên vào một hay nhiều chi nhánh (hoặc tất cả chi nhánh), mỗi chi nhánh một nhóm quyền |
| CORE-12 | Đăng nhập bằng **tên đăng nhập + mã PIN 6 số** ở Admin và khi đăng ký thiết bị POS (D-29). Riêng super admin đăng nhập Admin bằng **mật khẩu** |
| CORE-13 | Trên POS đã đăng ký thiết bị: chọn tên nhân viên rồi nhập cùng mã PIN 6 số đó (D-22) |
| CORE-14 | Nhân viên tự đổi PIN (phải nhập PIN cũ); admin đặt lại PIN và mở khoá tài khoản cho nhân viên |
| CORE-15 | Access token ngắn hạn + refresh token xoay vòng; thu hồi phiên khi khoá tài khoản |

### Phân quyền

Đặc tả đầy đủ (mô hình, danh mục 85 quyền, bảng nhóm mặc định, hạn mức, quy tắc): [06-permissions.md](06-permissions.md).

| Mã | Chức năng |
|---|---|
| CORE-20 | Danh mục quyền khai báo trong code (mỗi tính năng có quyền riêng), đồng bộ vào CSDL khi khởi động |
| CORE-21 | Nhóm quyền mặc định: Chủ, Quản lý chi nhánh, Thu ngân, Nhân viên, Bếp, Thủ kho, Kế toán |
| CORE-22 | Nhóm quyền tuỳ chỉnh: tạo mới, nhân bản từ nhóm có sẵn, tick quyền theo module, xoá khi không còn ai dùng |
| CORE-23 | Guard API mặc định cấm, kiểm tra quyền + chi nhánh; giao diện ẩn nút, menu, route không có quyền |
| CORE-24 | Duyệt tại chỗ: nhân viên thiếu quyền hoặc vượt hạn mức thì người có quyền nhập PIN để duyệt |
| CORE-25 | Hạn mức theo nhóm quyền: giảm giá tối đa, chi tiền mặt tối đa, hoàn tiền tối đa |
| CORE-26 | Sửa nhóm mặc định và khôi phục về mặc định; nhóm Chủ bị khoá |
| CORE-27 | Chống tự nâng quyền: chỉ cấp được quyền mình đang có; không sửa nhóm của chính mình |
| CORE-28 | Thay đổi quyền có hiệu lực ngay với phiên đang đăng nhập; ghi audit log trước/sau |
| CORE-29 | Xem quyền thực tế của một nhân viên tại từng chi nhánh; so sánh hai nhóm quyền |

### Thiết bị

| Mã | Chức năng |
|---|---|
| CORE-30 | Đăng ký thiết bị POS vào một chi nhánh, cấp mã thiết bị (tiền tố hoá đơn) |
| CORE-31 | Xem thiết bị đang hoạt động, lần đồng bộ cuối, thu hồi thiết bị |
| CORE-32 | Khai báo máy in theo chi nhánh: vai trò (bill, bếp theo trạm), kết nối (LAN/Bluetooth/USB), khổ giấy K57/K80. Quản lý máy in trên POS và mẫu in: [18-printing.md](18-printing.md) |
| CORE-33 | Xác thực thiết bị và phiên nhân viên trên POS (mục "Xác thực trên POS") |

### Nhật ký và file

| Mã | Chức năng |
|---|---|
| CORE-40 | Ghi audit log: ai, lúc nào, chi nhánh, thiết bị, hành động, dữ liệu trước/sau |
| CORE-41 | Màn hình tra cứu nhật ký, lọc theo người, hành động, thời gian |
| CORE-42 | Upload ảnh (món, nhân viên, chứng từ), tự nén và tạo ảnh thu nhỏ |

## Quy tắc nghiệp vụ

- Tài khoản Chủ không bị khoá hay xoá bởi nhóm quyền khác; luôn còn ít nhất một tài khoản Chủ.
- Quyền chỉ cấp qua nhóm quyền, không gán quyền lẻ cho từng người. Quy tắc quản lý nhóm quyền: 06 mục 8.
- Nhân viên chỉ thấy dữ liệu của chi nhánh mình được gán.
- PIN không cần duy nhất: POS chọn nhân viên rồi mới nhập PIN (D-22; bảo vệ PIN khi offline: 06 mục 7.3).

### Tài khoản nhân viên (D-29)

| Mục | Quy định |
|---|---|
| Tạo tài khoản | Người có `user.manage` tạo trong Admin: họ tên, số điện thoại, tên đăng nhập, PIN ban đầu, chi nhánh và nhóm quyền. Nhân viên không tự đăng ký |
| Tên đăng nhập | Duy nhất toàn doanh nghiệp, chữ thường không dấu và số, 3–30 ký tự; không đổi sau khi tạo |
| PIN | Đúng 6 chữ số, đặt tuỳ ý; hệ thống không chặn PIN dễ đoán (D-29) |
| PIN ban đầu và PIN vừa được đặt lại | Là PIN tạm: lần đăng nhập kế tiếp buộc đổi sang PIN mới trước khi làm việc khác |
| Sai PIN | Đếm chung cho Admin, POS và duyệt tại chỗ. Sai **5 lần liên tiếp** thì **khoá tài khoản**; đăng nhập đúng thì bộ đếm về 0 |
| Mở khoá | Người có `user.reset_credentials` (super admin, quản lý) mở khoá hoặc đặt lại PIN trong Admin; cả hai đều ghi audit log |
| Quên PIN | Báo quản lý hoặc super admin đặt lại. Không có đặt lại qua email hay tin nhắn cho nhân viên |
| Đặt lại PIN | Thu hồi mọi phiên đang đăng nhập của nhân viên đó. Không ai xem được PIN hiện tại của người khác |
| Lưu trữ | Chỉ lưu mã băm Argon2id; giới hạn tần suất đăng nhập theo IP ngoài bộ đếm theo tài khoản |

Cấp bậc (D-29):

| Cấp | Nhóm quyền | Ghi chú |
|---|---|---|
| Super admin | Chủ (`owner`) | Một tài khoản do chủ quán giữ, có mọi quyền, không ai khoá hay sửa được. Tạo sẵn khi cài đặt. Đăng nhập Admin bằng mật khẩu |
| Quản lý | `manager` | Tạo, khoá, mở khoá, đặt lại PIN cho thu ngân và nhân viên của chi nhánh mình; không tác động được tài khoản super admin |
| Thu ngân | `cashier` | |
| Nhân viên | `staff` | Tạo đơn, không thu tiền |

Các nhóm Bếp, Thủ kho, Kế toán vẫn có sẵn để dùng khi cần (06 mục 4).

### Super admin dùng mật khẩu

| Mục | Quy định |
|---|---|
| Admin | Super admin đăng nhập bằng tên đăng nhập + **mật khẩu** (tối thiểu 10 ký tự, có chữ và số). PIN của super admin **không** đăng nhập được Admin |
| POS | Super admin có thêm một PIN 6 số, chỉ dùng trên thiết bị POS đã đăng ký (chọn tên, nhập PIN) và để duyệt tại chỗ |
| Phân biệt lúc đăng nhập | Màn hình đăng nhập Admin có hai ô: "Tên đăng nhập" và "PIN hoặc mật khẩu". Ô thứ hai nhận chuỗi bất kỳ, không ép 6 số. **Server** tra tài khoản rồi so với đúng loại thông tin của tài khoản đó (`credential_type`: `pin` hoặc `password`). Người dùng không phải chọn loại, và màn hình không tiết lộ tài khoản nào là super admin |
| Thông báo lỗi | Luôn là "Sai tên đăng nhập hoặc PIN/mật khẩu", giống nhau cho mọi trường hợp |
| Sai 5 lần | Khoá, **tự mở sau 30 phút** (không ai khác mở được cho tài khoản này); có tin báo vào Discord (D-33) |
| Quên mật khẩu | Đặt lại bằng lệnh chạy trên server (`pnpm --filter @fnb/api cli reset-owner-password`; mật khẩu mới lấy từ biến `NEW_OWNER_PASSWORD`, không có thì sinh ngẫu nhiên và in ra một lần), cần quyền truy cập máy chủ |
| Lưu trữ | `users.credential_type`, `password_hash` (chỉ super admin), `pin_hash`; đều băm Argon2id |
- Chi nhánh ngừng hoạt động thì không tạo được đơn mới, dữ liệu cũ vẫn xem được.
- Mã chi nhánh và mã thiết bị không đổi sau khi đã có hoá đơn. Thiết bị đã thu hồi mà đăng ký lại thì nhận mã mới.
- Đổi giờ chốt ngày chỉ áp dụng từ ngày kinh doanh kế tiếp; đơn, ca, phiếu lưu sẵn `business_date` nên dữ liệu cũ không đổi (04).
- `branch_settings` do module `branches` giữ. Module khác (thanh toán, in ấn) đọc qua service của `branches`; cấu hình riêng của chúng (cổng QR, mẫu in) nằm ở bảng của chính module đó.

### Chi nhánh và cấu hình (M1-06)

| Mục | Quy định |
|---|---|
| Mã chi nhánh | 2–6 ký tự chữ hoa hoặc số (`Q1`, `TD02`), duy nhất; nhập chữ thường thì tự đổi sang chữ hoa. Trùng mã trả `409 BRANCH_CODE_TAKEN`. Việc khoá mã sau khi có hoá đơn làm cùng đơn hàng (M3-08) |
| Tên chi nhánh | Tên riêng, một ngôn ngữ (40 mục 4.2) |
| Ngừng hoạt động | `POST /branches/:id/deactivate` / `activate`; không xoá chi nhánh. `BranchesService.assertActive()` trả `409 BRANCH_INACTIVE`, dùng khi tạo đơn và đăng ký thiết bị |
| Cấu hình mặc định | Tạo cùng chi nhánh: múi giờ `Asia/Ho_Chi_Minh`, mở cửa 10:00–22:00, chốt ngày 00:00, thuế 0%, phí dịch vụ 0%, chưa có thông tin bill và tài khoản ngân hàng |
| Thuế suất, phí dịch vụ | Phần trăm tối đa hai chữ số thập phân; lưu dạng điểm cơ bản (`tax_rate_bps`, `service_charge_bps`) |
| Đổi giờ chốt ngày | Giá trị mới nằm ở `pending_day_cutoff_time` cùng `pending_day_cutoff_from` (ngày kinh doanh kế tiếp); `BranchesService.getSettings()` tự áp dụng khi ngày đó bắt đầu. Chọn lại đúng giờ đang dùng thì huỷ thay đổi đang chờ |
| Quyền | Danh sách và chi tiết: `branch.view` (danh sách tự lọc theo chi nhánh người gọi có quyền). Tạo, sửa, ngừng: `branch.manage` (cấp doanh nghiệp). Cấu hình: `branch.settings` tại chính chi nhánh đó |
| Nhật ký | `branch.create`, `branch.update`, `branch.deactivate`, `branch.activate` ghi ở cấp doanh nghiệp; `branch.settings_update` ghi theo chi nhánh |
| Màn hình (M1-19) | `/branches?id=`: danh sách bên trái, chi nhánh đang chọn bên phải với hai tab. Tab "Thông tin và bán hàng" có một nút Lưu: phần thông tin (cần `branch.manage`) gửi `PATCH /branches/:id`, phần giờ và thuế (cần `branch.settings` tại chính chi nhánh đó) gửi `PUT /branches/:id/settings`, chỉ phần đã sửa mới gửi; thiếu quyền thì ô bị khoá. Tab "Thông tin in trên bill" gồm thông tin bill và tài khoản nhận QR (để trống cả ba ô ngân hàng là không nhận QR). Ngừng hoạt động qua `ConfirmDialog` kiểu nguy hiểm. Giờ chốt mới đang chờ hiện dưới ô kèm ngày áp dụng |
| Chưa làm ở M1 | Các ô trong mockup `admin-branches` thuộc mốc khác: làm tròn tiền (POS-15, M3), bán kính chấm công GPS (HR-21, M9), phương thức thanh toán tại chi nhánh (M5), tab Thiết bị (M1-21) |

### Nhân viên và gán nhóm (M1-07)

| Mục | Quy định |
|---|---|
| Bảng | `users` (module `users`): `username` (duy nhất), `full_name`, `phone`, `avatar_media_id`, `credential_type`, `pin_hash`, `password_hash`, `must_change_pin`, `failed_attempts`, `locked_at`, `locked_until`, `is_active`, `last_login_at`. Không xoá tài khoản, chỉ vô hiệu hoá. `user_role_assignments.user_id` tham chiếu `users.id` |
| Endpoint | `GET /users` (lọc `search`, `status`: `active`/`disabled`/`locked`/`all`, `branchId`, `roleId`; phân trang), `GET /users/:id`, `GET /users/:id/access` (quyền thực tế từng chi nhánh, CORE-29), `POST /users`, `PATCH /users/:id`, `POST /users/:id/disable` / `enable`, `PUT /users/:id/assignments` (`{ branchId \| null, roleId }`), `DELETE /users/:id/assignments/:branchId` (`all` = bản gán tất cả chi nhánh) |
| Ai thấy ai | Người gọi thấy nhân viên được gán ở chi nhánh mình có `user.view`, chỉ kèm các bản gán ở những chi nhánh đó và bản "tất cả chi nhánh". Nhân viên chỉ có bản gán "tất cả chi nhánh" hoặc chưa được gán thì chỉ người được gán tất cả chi nhánh thấy. Không thấy thì trả `404` |
| Tạo | Cần `user.manage` **và** `role.assign` tại mọi nơi gán, và chỉ cấp được quyền mình có ở đó (`403 ROLE_ESCALATION`, kèm `missingPermissions`). PIN ban đầu là PIN tạm (`must_change_pin = true`). Trùng tên đăng nhập: `409 USERNAME_TAKEN` |
| Sửa, vô hiệu hoá | `user.manage` tại mọi chi nhánh nhân viên đó được gán, và người gọi phải có ít nhất các quyền của nhân viên ở đó. Vô hiệu hoá thu hồi mọi phiên ngay. Không tự vô hiệu hoá mình (`409 CANNOT_MODIFY_SELF`) |
| Gán, gỡ nhóm | `role.assign` tại nơi gán; không tự gán cho mình; không đổi nhóm của người đang có nhiều quyền hơn mình ở đó. Nhóm Chủ chỉ do người thuộc nhóm Chủ gán, và chỉ ở bản "tất cả chi nhánh" |
| Chủ cuối cùng | Không vô hiệu hoá, gỡ hay đổi nhóm của tài khoản Chủ đang hoạt động cuối cùng (`409 LAST_OWNER`) |
| Nhật ký | `user.create`, `user.update`, `user.disable`, `user.enable`, `user.assign_role`, `user.unassign_role`; ghi theo chi nhánh khi thao tác chỉ chạm một chi nhánh, còn lại ở cấp doanh nghiệp. Mã băm không bao giờ vào log hay phản hồi |
| Làm ở task khác | Đăng nhập, phiên (M1-08); đổi, đặt lại PIN, mở khoá (M1-09); ảnh đại diện (M1-15) |

### Đăng nhập và phiên (M1-08)

| Mục | Quy định |
|---|---|
| Endpoint | `POST /auth/login` (`{ username, secret }`, `@Public`, giới hạn tần suất theo IP), `POST /auth/refresh` (`{ refreshToken }`), `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me` |
| Token | Access token JWT HS256 (mặc định 15 phút, `ACCESS_TOKEN_TTL_SECONDS`), không chứa quyền. Refresh token ngẫu nhiên 32 byte, chỉ lưu SHA-256 trong bảng `refresh_tokens` (`session_id`, `user_id`, `device_id`, `expires_at`, `used_at`, `revoked_at`); hạn 7 ngày (`REFRESH_TOKEN_TTL_SECONDS`), gia hạn mỗi lần refresh. Hai token trả trong body; client tự lưu |
| Xoay vòng | Mỗi refresh token dùng một lần. Token đã dùng mà quay lại thì coi là bị lộ: kết thúc cả phiên (mọi token của phiên bị thu hồi, access token đang dùng bị cắt ngay) |
| Phiên | Phiên đang hiệu lực nằm trong Redis (`session:<id>`), guard kiểm tra mỗi request. Đăng xuất, vô hiệu hoá tài khoản, đặt lại PIN gọi `SessionService.end` / `endAllOfUser` |
| Lỗi | Sai tên hoặc sai PIN/mật khẩu: cùng một lỗi `401 INVALID_CREDENTIALS` (tên không tồn tại vẫn chạy so mã băm để thời gian như nhau). Tài khoản vô hiệu hoá: `403 ACCOUNT_DISABLED`, chỉ báo khi PIN đúng. Refresh hỏng: `401 UNAUTHENTICATED` |
| `/auth/me` | Hồ sơ, `hasAllBranches`, mỗi chi nhánh được gán (chi nhánh, nhóm, quyền thực tế, hạn mức), `businessPermissions`, `permissionsVersion` (băm của toàn bộ phần quyền; đổi khi quyền đổi) |
| Nhật ký | `auth.login`, `auth.login_failed` (kèm tên đăng nhập và lý do, không kèm PIN), `auth.logout`; cấp doanh nghiệp, có IP |

### PIN, khoá tài khoản, mật khẩu super admin (M1-09)

| Mục | Quy định |
|---|---|
| Bộ đếm | `UserCredentialsService.checkSecret()` là nơi duy nhất so PIN/mật khẩu (Admin, đổi PIN, sau này POS và duyệt tại chỗ). Sai thì `failed_attempts + 1` (tăng nguyên tử); đúng thì về 0. Lần sai thứ 5 (`MAX_FAILED_ATTEMPTS`) đặt `locked_at`, ghi `auth.account_locked`. Đang khoá thì trả `423 ACCOUNT_LOCKED`, kể cả khi PIN đúng |
| Super admin | Khoá có `locked_until = locked_at + 30 phút` (`SUPER_ADMIN_LOCK_MINUTES`), tự mở khi hết hạn; `423` kèm `params.lockedUntil`. Không ai mở khoá hay đặt lại PIN cho tài khoản này qua API (`403 ACCOUNT_PROTECTED`). Báo Discord khi khoá làm ở M7-07 |
| PIN tạm | Access token mang cờ `mcp`. Guard trả `403 PIN_CHANGE_REQUIRED` cho mọi endpoint trừ endpoint gắn `@AllowTemporaryPin()`: `GET /auth/me`, `POST /auth/logout`, `POST /auth/change-pin` |
| Tự đổi | `POST /auth/change-pin` (`currentPin`, `newPin` khác PIN cũ), `POST /auth/change-password` (chỉ super admin). PIN cũ sai tính vào bộ đếm. Đổi xong: kết thúc mọi phiên, trả bộ token mới |
| Quản lý | `POST /users/:id/reset-pin` (`{ pin }`: PIN tạm, mở khoá, kết thúc mọi phiên) và `POST /users/:id/unlock` (giữ PIN), quyền `user.reset_credentials` tại mọi chi nhánh của người đó, không làm cho chính mình; log `user.reset_pin`, `user.unlock` theo chi nhánh |
| Lệnh server | `reset-owner-password`: đặt mật khẩu mới, mở khoá, thu hồi refresh token của super admin; access token đang dùng hết hạn sau tối đa 15 phút |

### Duyệt tại chỗ (M1-12)

| Mục | Quy định |
|---|---|
| Luồng | POS gọi `GET /approvals/approvers?permission=<mã>` (header chi nhánh) để lấy danh sách người duyệt; người duyệt chọn tên, nhập PIN; `POST /approvals` (`permission`, `approverUserId`, `pin`, `reason`) trả `{ id, token, expiresAt }`. POS gửi lại hành động kèm `X-Approval-Token` |
| Kiểm tra | Quyền phải `approvable` (`400 NOT_APPROVABLE`); người duyệt đang hoạt động, có quyền đó **tại chi nhánh này**, khác người xin. PIN sai tính vào bộ đếm khoá của người duyệt (`401 INVALID_CREDENTIALS`, lần thứ 5 `423 ACCOUNT_LOCKED`) |
| Token | Lưu trong Redis 120 giây (`APPROVAL_TTL_SECONDS`), chỉ dùng một lần, chỉ cho đúng quyền, chi nhánh và người xin; sai thì `403 APPROVAL_INVALID` và token vẫn còn cho đúng hành động. Phiên làm việc vẫn là của người xin |
| Hạn mức | Hành động vượt hạn mức (giảm giá, chi tiền, hoàn tiền) tự gọi `ApprovalsService.consume()` trong service ở mốc của nó |
| Offline | Kiểm tra bằng snapshot ở M3 (06 mục 7.3) |

### Thiết bị POS (M1-13)

| Mục | Quy định |
|---|---|
| Đăng ký | Trên máy POS, người có `device.manage` tại chi nhánh đăng nhập (`POST /auth/login`), rồi máy gọi `POST /devices` (header `X-Branch-Id`, `{ name, kind: pos \| handheld \| kds }`). Chi nhánh phải đang hoạt động. Server trả **một lần** `deviceToken` (lưu SHA-256) và `deviceSecret` (khoá trộn vào mã băm PIN của snapshot offline, M3). Sau đó máy đăng xuất người quản lý |
| Mã thiết bị | `<mã chi nhánh>-<P\|H\|K><số 2 chữ số>`, ví dụ `Q1-P01`, `Q1-K01`; tăng theo chi nhánh và loại, không dùng lại mã của máy đã thu hồi. Mockup đang có hai kiểu khác nhau (`Q1-A` ở `admin-devices`, `POS-Q1-02` ở `pos-device-register`); code theo kiểu này, gần với ví dụ `CN1-P02-000123` ở plan 04, chờ chủ quán chốt |
| Phiên nhân viên | `GET /devices/staff` (header `X-Device-Token`): người đang hoạt động được gán ở chi nhánh của máy hoặc tất cả chi nhánh. `POST /devices/session` (`{ userId, pin }`): kiểm PIN qua bộ đếm chung, trả bộ token gắn `deviceId`; refresh token sống tối đa 12 giờ. Super admin dùng PIN ở đây |
| Mỗi request | Phiên có `deviceId` thì guard kiểm tra thiết bị chưa bị thu hồi, và chi nhánh của request (nếu có) phải là chi nhánh của máy (`403`) |
| Thu hồi | `POST /devices/:id/revoke` (`device.manage` tại chi nhánh của máy): token máy hết hiệu lực (`401 DEVICE_REVOKED`), mọi phiên trên máy kết thúc ngay. Đăng ký lại thì nhận mã mới |
| Danh sách | `GET /devices?branchId=&status=active\|revoked\|all`, lọc theo chi nhánh người gọi có `device.manage`; có lần thấy cuối, phiên bản app, người dùng cuối |
| Nhật ký | `device.register`, `device.revoke`, `device.session_open`, theo chi nhánh của máy |
| Làm ở mốc khác | Bộ đếm số hoá đơn theo thiết bị, trạng thái đồng bộ (M3); máy in (M3, 18) |

### Audit log (M1-14)

| Mục | Quy định |
|---|---|
| Bảng | `audit_logs`: `occurred_at`, `actor_user_id`, `branch_id` (null = thao tác cấp doanh nghiệp như nhóm quyền, chi nhánh), `device_id`, `action` (`<đối tượng>.<động từ>`, ví dụ `user.reset_pin`), `entity_type`, `entity_id`, `before`, `after`, `metadata` (lý do, người duyệt…), `ip`, `request_id` |
| Chỉ ghi thêm | Không có API sửa hay xoá; trigger CSDL `fnb_forbid_change` từ chối `UPDATE` và `DELETE` (dùng lại cho sổ kho, sổ quỹ) |
| Cách ghi | Endpoint gắn `@Audited('user.create')`; service gọi `AuditService.describe({ entityType, entityId, before, after, metadata })`; dòng log được ghi sau khi handler chạy xong, thao tác lỗi thì không ghi. Sự kiện ngoài luồng đó (đăng nhập sai) gọi `AuditService.record()` trực tiếp |
| Bí mật | Mọi khoá có tên chứa `pin`, `password`, `secret`, `token`, `hash` bị thay bằng `[redacted]` trước khi lưu |
| Tra cứu | `GET /audit-logs` (quyền `audit.view`): lọc theo người, hành động (`user.create` hoặc tiền tố `user.`), đối tượng, khoảng thời gian; phân trang, mới nhất trước. Mặc định chỉ thấy log của chi nhánh đang chọn; `scope=business` xem log cấp doanh nghiệp, chỉ dành cho người được gán tất cả chi nhánh |

### Upload ảnh (M1-15)

| Mục | Quy định |
|---|---|
| Endpoint | `POST /media?purpose=<mục đích>` với body là **byte của ảnh** và `Content-Type` `image/jpeg`, `image/png` hoặc `image/webp`, tối đa 10 MB (`413 MEDIA_TOO_LARGE`; loại khác hay ảnh hỏng: `415 MEDIA_UNSUPPORTED`). `GET /media/:id` (cần đăng nhập) trả thông tin; `GET /media/:id/content?variant=full\|thumb` trả ảnh, công khai như link CDN (id là UUID ngẫu nhiên) |
| Xử lý | `sharp`: xoay theo EXIF rồi bỏ mọi metadata (GPS, máy ảnh), thu về tối đa 1600 px (WebP chất lượng 80) và ảnh thu nhỏ 320 px (WebP 75). Không giữ file gốc |
| Lưu trữ | Giao thức S3 (`@aws-sdk/client-s3`, `forcePathStyle`), key `media/<id>.webp` và `media/<id>-thumb.webp`; bảng `media` (`purpose`, `storage_key`, `thumb_key`, kích thước, dung lượng trước và sau nén, `branch_id` cho chứng từ của chi nhánh). API tự tạo bucket khi thiếu (MinIO local). Test dùng `MemoryObjectStorage`, không gọi MinIO |
| Quyền | Theo mục đích: `user_avatar` cần `user.manage` (M1). M2 thêm `product` (`menu.manage`), M3 thêm chứng từ. `PATCH /users/:id` chỉ nhận `avatarMediaId` là ảnh `user_avatar` |
| Nhật ký | `media.upload` |

### Seed (M1-16)

| Mục | Quy định |
|---|---|
| Lệnh | `pnpm db:seed`, chạy lại bao nhiêu lần cũng được: danh mục quyền và bảy nhóm mặc định → super admin → chi nhánh mẫu |
| Super admin | Chỉ tạo khi chưa có tài khoản `credential_type = password`: tên `SEED_OWNER_USERNAME` (mặc định `owner`), mật khẩu `SEED_OWNER_PASSWORD`, PIN POS `SEED_OWNER_PIN`, nhóm Chủ ở tất cả chi nhánh. Thiếu mật khẩu hay PIN thì sinh ngẫu nhiên và in ra một lần; ở production từ chối mật khẩu bắt đầu bằng `dev-only-`. Giá trị dev nằm trong `.env.example` |
| Chi nhánh mẫu | Chỉ tạo khi chưa có chi nhánh nào: `SEED_BRANCH_CODE` / `SEED_BRANCH_NAME`, cấu hình mặc định |

### Xác thực trên POS

| Lớp | Cách làm |
|---|---|
| Thiết bị | Người có `device.manage` đăng nhập bằng tên đăng nhập + PIN một lần để đăng ký thiết bị vào chi nhánh. Server cấp **token thiết bị** dài hạn (thu hồi được) và khoá bí mật của thiết bị |
| Nhân viên | Trên thiết bị đã đăng ký: chọn tên → nhập PIN → server cấp **phiên nhân viên** ngắn hạn gắn với thiết bị đó. Khoá máy hoặc đổi người thì phiên cũ kết thúc |
| Mỗi request | Mang token thiết bị và phiên nhân viên; guard kiểm tra thiết bị còn hiệu lực, thuộc đúng chi nhánh, rồi mới tới quyền của nhân viên |
| Offline | Kiểm tra PIN và quyền bằng snapshot; lệnh ghi kèm id nhân viên và id thiết bị, server kiểm tra lại khi nhận |
| Admin | Đăng nhập bằng tên đăng nhập + PIN 6 số; super admin dùng mật khẩu (D-29) |

PIN băm bằng Argon2id. Màn hình bếp (KDS) là một thiết bị đã đăng ký, chạy bằng phiên của nhân viên có `kitchen.view`.

## Dữ liệu chính

`branches`, `branch_settings`, `users`, `user_role_assignments` (user, branch hoặc tất cả chi nhánh, role), `roles`, `permissions`, `role_permissions`, `devices`, `device_sessions`, `printers`, `device_printers`, `print_templates` (18), `refresh_tokens`, `audit_logs`, `media`.

## Mã quyền

`branch.view`, `branch.manage`, `branch.settings`, `user.view`, `user.manage`, `user.reset_credentials`, `role.view`, `role.manage`, `role.assign`, `device.manage`, `printer.manage`, `audit.view`.

Nhóm mặc định nào có quyền nào: 06 mục 4.1. `printer.manage` khai báo trong code ở M3 cùng tính năng máy in (CORE-32, 18); M1 khai báo 11 mã còn lại.

## Màn hình

- Admin: Đăng nhập · Chi nhánh (danh sách, chi tiết, cấu hình) · Nhân viên (kèm phân quyền theo chi nhánh) · Nhóm quyền (danh sách, sửa, so sánh) · Thiết bị và máy in · Nhật ký.
- POS: Đăng ký thiết bị · Màn hình khoá (chọn nhân viên, nhập PIN) · Máy in (18).

## Câu hỏi mở

- Danh sách nhóm quyền mặc định đã khớp với cách quán vận hành chưa? (06 mục 14)
