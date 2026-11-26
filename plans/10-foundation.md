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
| Quên mật khẩu | Đặt lại bằng lệnh chạy trên server (`pnpm --filter api cli reset-owner-password`), cần quyền truy cập máy chủ |
| Lưu trữ | `users.credential_type`, `password_hash` (chỉ super admin), `pin_hash`; đều băm Argon2id |
- Chi nhánh ngừng hoạt động thì không tạo được đơn mới, dữ liệu cũ vẫn xem được.
- Mã chi nhánh và mã thiết bị không đổi sau khi đã có hoá đơn. Thiết bị đã thu hồi mà đăng ký lại thì nhận mã mới.
- Đổi giờ chốt ngày chỉ áp dụng từ ngày kinh doanh kế tiếp; đơn, ca, phiếu lưu sẵn `business_date` nên dữ liệu cũ không đổi (04).
- `branch_settings` do module `branches` giữ. Module khác (thanh toán, in ấn) đọc qua service của `branches`; cấu hình riêng của chúng (cổng QR, mẫu in) nằm ở bảng của chính module đó.

### Audit log (M1-14)

| Mục | Quy định |
|---|---|
| Bảng | `audit_logs`: `occurred_at`, `actor_user_id`, `branch_id` (null = thao tác cấp doanh nghiệp như nhóm quyền, chi nhánh), `device_id`, `action` (`<đối tượng>.<động từ>`, ví dụ `user.reset_pin`), `entity_type`, `entity_id`, `before`, `after`, `metadata` (lý do, người duyệt…), `ip`, `request_id` |
| Chỉ ghi thêm | Không có API sửa hay xoá; trigger CSDL `fnb_forbid_change` từ chối `UPDATE` và `DELETE` (dùng lại cho sổ kho, sổ quỹ) |
| Cách ghi | Endpoint gắn `@Audited('user.create')`; service gọi `AuditService.describe({ entityType, entityId, before, after, metadata })`; dòng log được ghi sau khi handler chạy xong, thao tác lỗi thì không ghi. Sự kiện ngoài luồng đó (đăng nhập sai) gọi `AuditService.record()` trực tiếp |
| Bí mật | Mọi khoá có tên chứa `pin`, `password`, `secret`, `token`, `hash` bị thay bằng `[redacted]` trước khi lưu |
| Tra cứu | `GET /audit-logs` (quyền `audit.view`): lọc theo người, hành động (`user.create` hoặc tiền tố `user.`), đối tượng, khoảng thời gian; phân trang, mới nhất trước. Mặc định chỉ thấy log của chi nhánh đang chọn; `scope=business` xem log cấp doanh nghiệp, chỉ dành cho người được gán tất cả chi nhánh |

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
