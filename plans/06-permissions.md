# 06. Phân quyền: quyền và nhóm quyền

Module API: `rbac` · Đặc tả chức năng: [10-foundation.md](10-foundation.md) (CORE-20 → CORE-29) · Làm ở mốc M1, mỗi mốc sau bổ sung quyền của tính năng mình.

## 1. Nguyên tắc

1. **Mỗi tính năng có quyền riêng.** Mỗi hành động cần kiểm soát là một mã quyền `module.action`. Không có tính năng nào chạy mà không gắn quyền.
2. **Quyền được cấp qua nhóm quyền.** Không gán quyền lẻ cho từng người. Người dùng được gán một nhóm quyền ở mỗi chi nhánh.
3. **Nhóm quyền tuỳ chỉnh được.** Có sẵn các nhóm mặc định (Thu ngân, Quản lý…); chủ quán sửa được, nhân bản được và tạo nhóm mới bằng cách tick quyền.
4. **Mặc định là cấm.** Endpoint không khai báo quyền thì không chạy được; nút không có quyền thì ẩn.
5. **API là nơi quyết định.** Giao diện ẩn/hiện chỉ để dễ dùng; API luôn kiểm tra lại.
6. **Thay đổi quyền có hiệu lực ngay** và luôn được ghi nhật ký.

## 2. Thuật ngữ

| Tiếng Việt | Tiếng Anh (giao diện) | Trong code | Ý nghĩa |
|---|---|---|---|
| Quyền | Permission | `permission` | Một hành động được phép, ví dụ `order.create` |
| Nhóm quyền | Permission group | `role` | Tập quyền có tên, ví dụ "Thu ngân" |
| Nhóm mặc định | Default group | `is_system = true` | Nhóm có sẵn khi cài đặt |
| Nhóm tuỳ chỉnh | Custom group | `is_system = false` | Nhóm do chủ quán tạo |
| Gán nhóm | Assignment | `user_role_assignments` | Người dùng X thuộc nhóm Y tại chi nhánh Z |
| Hạn mức | Limit | `role.limits` | Giới hạn bằng số đi kèm quyền, ví dụ giảm giá tối đa 10% |
| Duyệt tại chỗ | Approval | `approval` | Người có quyền nhập PIN để cho phép người thiếu quyền |

Các plan viết trước dùng chữ "vai trò"; từ nay gọi là **nhóm quyền**. Trong code vẫn là `role`.

## 3. Mô hình

```
permission (khai báo trong code)
     ▲ nhiều-nhiều
role (nhóm quyền) ── limits (hạn mức)
     ▲
user_role_assignments (user, branch | tất cả chi nhánh, role)
     ▲
user
```

### 3.1 Quyền

- Khai báo trong `packages/contract/src/permissions/`, mỗi module một file. Đây là nguồn duy nhất; CSDL chỉ lưu bản đồng bộ.
- Khi API khởi động: thêm mã mới vào bảng `permissions`, đánh dấu mã không còn trong code là ngừng dùng.
- Người dùng **không tạo được quyền mới** trên giao diện; quyền mới sinh ra khi có tính năng mới.

Mỗi quyền khai báo:

| Thuộc tính | Ý nghĩa |
|---|---|
| `code` | `module.action`, không đổi sau khi phát hành |
| `module` | Nhóm hiển thị trên màn hình tick quyền (Bán hàng, Kho…) |
| `scope` | `branch` (có hiệu lực trong chi nhánh được gán) hoặc `business` (ảnh hưởng mọi chi nhánh, mục 3.4) |
| `sensitive` | Hành động nhạy cảm: luôn ghi audit log, hiện nhãn cảnh báo khi tick |
| `approvable` | Người thiếu quyền được xin duyệt tại chỗ bằng PIN (mục 6) |
| `requires` | Quyền phải có kèm, ví dụ `menu.manage` cần `menu.view`; giao diện tự tick |
| `defaultRoles` | Nhóm mặc định nào có quyền này (bảng mục 4) |
| `surfaces` | Dùng ở đâu: `admin`, `pos`, `kds` (để lọc trên màn hình tick quyền) |

Tên và mô tả hiển thị của quyền nằm trong `packages/i18n`, namespace `permissions`, đủ `vi` và `en`.

```ts
// packages/contract/src/permissions/order.ts
export const orderPermissions = definePermissions('order', {
  'order.create': { scope: 'branch', surfaces: ['pos'], defaultRoles: ['manager', 'cashier', 'staff'] },
  'order.void_item': {
    scope: 'branch',
    surfaces: ['pos'],
    sensitive: true,
    approvable: true,
    requires: ['order.view'],
    defaultRoles: ['manager'],
  },
});
```

`PermissionCode` là kiểu union sinh từ các khai báo này; `@RequirePermission(...)`, `<Can permission=…>` và `usePermission(...)` chỉ nhận giá trị thuộc kiểu đó, gõ sai mã thì typecheck đỏ.

### 3.2 Nhóm quyền

| Thuộc tính | Ý nghĩa |
|---|---|
| `name` | Tên hai ngôn ngữ `{vi, en}` |
| `description` | Mô tả ngắn |
| `is_system` | Nhóm mặc định; không xoá được, khôi phục về mặc định được |
| `is_locked` | Chỉ nhóm **Chủ**: luôn có mọi quyền, không sửa được |
| `permissions` | Tập mã quyền (bảng `role_permissions`) |
| `limits` | Hạn mức (mục 5) |
| `version` | Tăng mỗi lần sửa; client dùng để biết cần tải lại |

Nhóm quyền thuộc cấp doanh nghiệp: tạo một lần, dùng cho mọi chi nhánh.

### 3.3 Gán nhóm cho người dùng

- Một người có **một nhóm quyền ở mỗi chi nhánh** được gán; các chi nhánh tách biệt, quyền ở chi nhánh này không có hiệu lực ở chi nhánh khác (D-40). Ví dụ: Lan là Thu ngân ở chi nhánh 1 và Quản lý ở chi nhánh 2.
- Có thể gán nhóm cho **tất cả chi nhánh** (kể cả chi nhánh tạo sau); dùng cho Chủ, Kế toán.
- Cần tổ hợp quyền khác (ví dụ thu ngân kiêm thủ kho): tạo nhóm tuỳ chỉnh "Thu ngân kiêm kho", không gán hai nhóm cho một người ở cùng chi nhánh.
- Quyền thực tế của một request = quyền của nhóm tại **chi nhánh đang thao tác**.
- Một người vừa được gán "tất cả chi nhánh" vừa được gán riêng ở một chi nhánh: **bản gán riêng thắng** tại chi nhánh đó, bản "tất cả chi nhánh" áp dụng cho các chi nhánh còn lại. Không cộng dồn hai nhóm. Quyền `scope: business` chỉ lấy từ bản "tất cả chi nhánh".

### 3.4 Quyền cấp doanh nghiệp

Một số quyền ảnh hưởng mọi chi nhánh (sửa thực đơn chung, sửa nhóm quyền, tạo chi nhánh). Các quyền này có `scope: business` và **chỉ có hiệu lực khi nhóm được gán cho tất cả chi nhánh**. Một quản lý chỉ được gán ở chi nhánh 1 không sửa được thực đơn chung dù nhóm của họ có tick quyền đó; màn hình gán nhóm hiện rõ điều này.

## 4. Nhóm mặc định và danh mục quyền

Cấp bậc theo D-29: super admin (nhóm Chủ) → Quản lý → Thu ngân → Nhân viên; Bếp, Thủ kho, Kế toán là nhóm có sẵn để dùng khi cần.

Bảy nhóm mặc định: **Chủ** (`owner`, tài khoản super admin do chủ quán giữ, mọi quyền, không liệt kê trong bảng), **Quản lý chi nhánh** (`manager`, QL), **Thu ngân** (`cashier`, TN), **Nhân viên** (`staff`, NV; nhân viên bán hàng không thu tiền), **Bếp** (`kitchen`, Bếp), **Thủ kho** (`stock_keeper`, Kho), **Kế toán** (`accountant`, KT).

Ký hiệu: ● có quyền · ◐ có quyền kèm hạn mức · trống là không có. Cột "Ghi chú": **DN** = quyền cấp doanh nghiệp, **N** = nhạy cảm, **D** = xin duyệt tại chỗ được.

Bảng này là giá trị lúc cài đặt; sau đó chủ quán sửa trên giao diện. Bảng và `defaultRoles` trong code phải khớp nhau.

### 4.1 Nền tảng (10)

Khai báo trong code ở M1-10 (`packages/contract/src/permissions/foundation.ts`, module hiển thị `foundation`): 11 mã dưới đây trừ `printer.manage`. `printer.manage` được khai báo cùng tính năng máy in ở M3 (18), vì M1 chưa có endpoint nào dùng nó.

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `branch.view` | Xem danh sách và thông tin chi nhánh | ● | | | | | ● | |
| `branch.manage` | Tạo, sửa, ngừng chi nhánh | | | | | | | DN, N |
| `branch.settings` | Sửa cấu hình của chi nhánh (giờ mở cửa, thông tin bill) | ● | | | | | | N |
| `user.view` | Xem nhân viên | ● | | | | | ● | |
| `user.manage` | Tạo, sửa, khoá nhân viên | ● | | | | | | N |
| `user.reset_credentials` | Đặt lại PIN và mở khoá tài khoản cho nhân viên (không áp dụng với tài khoản super admin) | ● | | | | | | N |
| `role.view` | Xem nhóm quyền | ● | | | | | | |
| `role.manage` | Tạo, sửa, xoá nhóm quyền | | | | | | | DN, N |
| `role.assign` | Gán nhóm quyền cho nhân viên | ● | | | | | | N |
| `device.manage` | Đăng ký, thu hồi thiết bị POS | ● | | | | | | N |
| `printer.manage` | Khai báo máy in, gán vai trò in cho thiết bị, sửa mẫu in (Admin và POS, 18) | ● | | | | | | |
| `audit.view` | Xem nhật ký | ● | | | | | ● | |

### 4.2 Thực đơn (11)

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `menu.view` | Xem thực đơn | ● | ● | ● | ● | ● | ● | |
| `menu.manage` | Tạo, sửa nhóm món, món, tuỳ chọn | | | | | | | DN |
| `menu.price` | Sửa giá và bật/tắt bán theo chi nhánh | ● | | | | | | N |
| `menu.availability` | Đánh dấu tạm hết món | ● | ● | | ● | | | |
| `menu.import_export` | Nhập, xuất thực đơn bằng file | | | | | | | DN |

### 4.3 Bán hàng (12)

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `order.create` | Tạo đơn, thêm món | ● | ● | ● | | | | |
| `order.view` | Xem đơn của chi nhánh | ● | ● | ● | | | ● | |
| `order.print_bill` | In tạm tính và ra bill | ● | ● | | | | | |
| `order.reprint` | In lại bill đã in | ● | ● | | | | | N, D |
| `order.discount_item` | Giảm giá món | ● | ◐ | | | | | N, D |
| `order.discount_order` | Giảm giá đơn | ● | ◐ | | | | | N, D |
| `order.void_item` | Huỷ món đã gửi bếp | ● | | | | | | N, D |
| `order.void_order` | Huỷ đơn | ● | | | | | | N, D |
| `order.refund` | Quyết định trả hàng, hoàn tiền trên một đơn đã thanh toán (POS); hoàn tiền mặt chỉ cần quyền này | ● | | | | | | N, D |
| `order.open_drawer` | Mở ngăn kéo tiền không qua bán hàng | ● | ● | | | | | N |

### 4.4 Bàn và bếp (13)

`table.manage` và `table.operate` thuộc phần bàn đã hoãn (D-26, EXT-47): giữ trong danh mục, chỉ khai báo trong code khi làm phần đó.

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `table.manage` | Cấu hình khu vực, sơ đồ bàn | ● | | | | | | |
| `table.operate` | Mở, chuyển, gộp, tách bàn | ● | ● | ● | | | | |
| `kitchen.view` | Xem màn hình bếp | ● | ● | ● | ● | | | |
| `kitchen.update` | Đổi trạng thái phiếu chế biến | ● | | | ● | | | |
| `kitchen.manage_stations` | Cấu hình trạm chế biến | ● | | | | | | |

### 4.5 Ca thu ngân và sổ quỹ (14)

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `cash.open_session` | Mở ca | ● | ● | | | | | |
| `cash.close_session` | Đóng ca, đếm tiền | ● | ● | | | | | |
| `cash.pay_in_out` | Nộp, rút tiền két trong ca đang mở (POS) | ● | ◐ | | | | | N, D |
| `cash.carry_over_orders` | Đóng ca khi còn đơn chưa thanh toán, chuyển đơn sang ca sau | ● | | | | | | N, D |
| `cash.view_expected` | Xem số tiền hệ thống tính khi đóng ca | ● | | | | | ● | |
| `cash.approve_session` | Duyệt ca có chênh lệch | ● | | | | | ● | N |
| `cashbook.view` | Xem sổ quỹ | ● | | | | | ● | |
| `cashbook.create` | Lập phiếu thu, chi, chuyển quỹ trên mọi quỹ của chi nhánh (Admin) | ● | | | | | ● | N |
| `cashbook.void` | Huỷ phiếu thu, chi | | | | | | ● | N |
| `cashbook.manage_accounts` | Quản lý quỹ và loại thu chi | | | | | | ● | DN |

### 4.6 Thanh toán (15)

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `payment.take` | Nhận thanh toán | ● | ● | | | | | |
| `payment.confirm_manual` | Xác nhận tay giao dịch QR | ● | | | | | | N, D |
| `payment.refund` | Thực hiện và đánh dấu đã chuyển tiền hoàn cho yêu cầu hoàn chuyển khoản (Admin, 15: PAY-21) | ● | | | | | ● | N |
| `payment.reconcile` | Đối soát giao dịch | ● | | | | | ● | |
| `payment.manage_methods` | Cấu hình phương thức, cổng thanh toán | | | | | | | DN, N |

### 4.7 Kho (16)

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `inventory.view` | Xem tồn kho | ● | | | ● | ● | ● | |
| `inventory.manage_items` | Quản lý nguyên liệu, đơn vị | | | | | | | DN |
| `inventory.manage_recipes` | Quản lý định lượng | | | | | | | DN |
| `inventory.receive` | Lập phiếu nhập | ● | | | | ● | | |
| `inventory.issue` | Xuất dùng, huỷ hàng | ● | | | ● | ● | | N |
| `inventory.adjust` | Điều chỉnh tồn | ● | | | | | | N |
| `inventory.count` | Kiểm kê | ● | | | | ● | | |
| `inventory.view_cost` | Xem giá vốn | ● | | | | | ● | |
| `supplier.manage` | Quản lý nhà cung cấp | | | | | | | DN |

### 4.8 Báo cáo (17)

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `report.sales` | Báo cáo doanh thu | ● | | | | | ● | |
| `report.products` | Báo cáo món | ● | | | | | ● | |
| `report.control` | Báo cáo kiểm soát (huỷ, giảm giá, chênh lệch ca) | ● | | | | | ● | |
| `report.inventory` | Báo cáo kho | ● | | | | ● | ● | |
| `report.view_cost` | Xem giá vốn, lãi gộp trong báo cáo | ● | | | | | ● | |
| `report.export` | Xuất file | ● | | | | | ● | |
| `report.all_branches` | Xem gộp và so sánh mọi chi nhánh | | | | | | ● | DN |

### 4.9 Nhân sự (20, GĐ 2)

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `hr.view_employees` | Xem hồ sơ nhân viên | ● | | | | | ● | |
| `hr.manage_employees` | Sửa hồ sơ, mức lương | ● | | | | | | N |
| `schedule.view` | Xem lịch ca | ● | ● | ● | ● | ● | ● | |
| `schedule.manage` | Xếp lịch ca | ● | | | | | | |
| `attendance.punch` | Tự chấm công | ● | ● | ● | ● | ● | ● | |
| `attendance.view` | Xem bảng công | ● | | | | | ● | |
| `attendance.adjust` | Sửa công | ● | | | | | | N |
| `attendance.approve` | Duyệt công, duyệt yêu cầu sửa | ● | | | | | | N |
| `payroll.view` | Xem bảng lương | | | | | | ● | N |
| `payroll.manage` | Lập, tính bảng lương | | | | | | ● | N |
| `payroll.finalize` | Chốt và khoá kỳ lương | | | | | | | DN, N |
| `payroll.advance` | Ghi tạm ứng | ● | | | | | ● | N |

### 4.10 Khách hàng (21, GĐ 3)

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `customer.view` | Xem khách hàng | ● | ● | | | | | |
| `customer.manage` | Sửa, gộp khách hàng | ● | | | | | | |
| `online_order.accept` | Nhận, từ chối đơn online | ● | ● | | | | | |
| `online_order.settings` | Cấu hình đặt món online của chi nhánh | ● | | | | | | |
| `reservation.view` | Xem đặt bàn | ● | ● | ● | | | | |
| `reservation.manage` | Tạo, xác nhận, huỷ đặt bàn | ● | ● | | | | | |
| `reservation.settings` | Cấu hình đặt bàn của chi nhánh | ● | | | | | | |
| `promotion.manage` | Quản lý khuyến mãi, voucher | | | | | | | DN, N |
| `loyalty.manage` | Cấu hình tích điểm, hạng | | | | | | | DN |
| `loyalty.adjust` | Cộng, trừ điểm tay | ● | | | | | | N |

Tổng: 85 quyền. Tính năng ở [29-extensions.md](29-extensions.md) sẽ có quyền khi được lên plan.

## 5. Hạn mức

Một số quyền cần thêm con số. Hạn mức đặt trên nhóm quyền, chỉ có nghĩa khi nhóm có quyền tương ứng.

| Hạn mức | Đi kèm quyền | Mặc định Thu ngân | Mặc định Quản lý |
|---|---|---|---|
| `max_discount_percent` | `order.discount_item`, `order.discount_order` | 10% | 100% |
| `max_pay_out_amount` | `cash.pay_in_out` (mỗi phiếu chi) | 200.000 đ | Không giới hạn |
| `max_refund_amount` | `order.refund` (mỗi đơn) | — | Không giới hạn |

Vượt hạn mức thì xử lý như thiếu quyền: xin duyệt tại chỗ (mục 6). Con số mặc định là giá trị đề xuất, sửa được trên giao diện.

## 6. Duyệt tại chỗ

Áp dụng trên POS cho quyền có `approvable`.

1. Nhân viên thiếu quyền (hoặc vượt hạn mức) bấm hành động → `ApprovalDialog` mở, yêu cầu lý do.
2. Người có quyền đó **tại chi nhánh này** nhập PIN của mình.
3. Hành động chạy **một lần**; phiên làm việc vẫn là của nhân viên ban đầu.
4. Audit log ghi cả người yêu cầu, người duyệt, lý do.

- Người duyệt không tự duyệt cho chính mình khi bản thân thiếu quyền.
- Người duyệt được **chọn theo tên** trong danh sách người có quyền đó tại chi nhánh, rồi mới nhập PIN; hệ thống không dò người theo PIN (D-22).
- Sai PIN duyệt tính vào bộ đếm khoá tài khoản của người duyệt (5 lần, 10 mục "Tài khoản nhân viên").
- Khi mất mạng: POS kiểm tra PIN và quyền của người duyệt bằng dữ liệu đã tải về (mục 7.3); lệnh đẩy lên server kèm thông tin người duyệt. Lượt duyệt lúc offline được đánh dấu riêng trong báo cáo kiểm soát.

## 7. Thực thi

### 7.1 API

- Mỗi endpoint khai báo một trong ba: `@RequirePermission('order.void_item')`, `@Authenticated()` (chỉ cần đăng nhập, ví dụ xem hồ sơ của mình), `@Public()` (đăng nhập, webhook). **Không khai báo thì bị từ chối** và test `route-permissions.test.ts` đỏ.
- Guard chạy theo thứ tự: xác thực → xác định chi nhánh của request → người dùng có được gán ở chi nhánh đó → nhóm có quyền (và đúng `scope`) → hạn mức (kiểm tra trong service vì cần dữ liệu nghiệp vụ).
- Thiếu quyền trả `403` với mã lỗi `PERMISSION_DENIED` và `requiredPermission`; vượt hạn mức trả `LIMIT_EXCEEDED`.
- Sự kiện Socket.IO và việc vào room chi nhánh cũng qua cùng bộ kiểm tra.
- Quyền không nằm trong access token. API đọc quyền thực tế từ cache (Redis, một khoá cho mỗi người dùng `rbac:access:<userId>`, chứa mọi bản gán của người đó; quyền tại từng chi nhánh tính từ đó); cache bị xoá khi nhóm quyền hoặc việc gán nhóm thay đổi. Nhờ vậy thu hồi quyền có hiệu lực ngay, không chờ token hết hạn.
- Chi nhánh của request (M1-11): header `X-Branch-Id` là mặc định. Endpoint về đúng một chi nhánh khai báo `@RequirePermission(code, { branch: { param: 'id' } })` để lấy chi nhánh từ tham số route. Endpoint danh sách tự lọc theo phạm vi của người gọi khai báo `{ branch: 'any' }`: chỉ cần có quyền ở ít nhất một chi nhánh, service lọc bằng `branchReach`. Thiếu chi nhánh trả `400 BRANCH_REQUIRED`.
- Phiên đăng nhập đang hiệu lực được lưu trong Redis; guard kiểm tra ở mỗi request, nên đăng xuất, khoá tài khoản hay đặt lại PIN cắt quyền truy cập ngay. Token hết hạn hoặc phiên đã thu hồi trả `401 TOKEN_EXPIRED`; thiếu hay sai token trả `401 UNAUTHENTICATED`.
- Service khác module cần kiểm tra quyền thì gọi `rbac` service; không tự truy vấn bảng `role_permissions`.

### 7.2 Client (Admin, POS, KDS)

- `GET /auth/me` trả: các chi nhánh được gán, với mỗi chi nhánh là danh sách mã quyền thực tế, hạn mức và `permissionsVersion`.
- `usePermission(code)` và `<Can permission="…">` (component trong `ui-web` / `ui-pos`, đọc quyền từ context của app) quyết định ẩn/hiện nút, mục menu, cột.
- Route có khai báo quyền; vào thẳng URL không có quyền thì hiện `NoPermission`.
- Hành động `approvable` trên POS không ẩn mà mở `ApprovalDialog`.
- Khi quyền đổi, server phát tín hiệu `permissions.changed`; client tải lại `/auth/me`. Client cũng tải lại `/auth/me` mỗi lần socket kết nối lại. Nếu người dùng mất quyền của màn hình đang mở thì chuyển sang `NoPermission`.

### 7.3 POS offline

- Snapshot của chi nhánh kèm: danh sách nhân viên được gán ở chi nhánh, nhóm quyền, quyền thực tế, hạn mức, mã băm PIN. Đủ để đổi nhân viên và duyệt tại chỗ khi mất mạng.
- POS kiểm tra quyền bằng dữ liệu đã tải; server kiểm tra lại khi nhận lệnh qua `/sync/push`.
- Lệnh tạo lúc offline mà quyền đã bị thu hồi trong thời gian đó: **vẫn được nhận** (đơn đã bán thật) nhưng bị đánh dấu và hiện trong báo cáo kiểm soát (RPT-3x).
- Khoá tài khoản hay thu hồi thiết bị có hiệu lực ở lần đồng bộ kế tiếp; snapshot hết hạn sau 72 giờ không đồng bộ (04 mục "Quy tắc khi đồng bộ"), nên một thiết bị không thể chạy offline vô hạn với quyền cũ.

Bảo vệ PIN trong snapshot (D-22). PIN là mật khẩu duy nhất của nhân viên, dùng được cả ở Admin (D-29), nên các biện pháp dưới đây là bắt buộc:

| Rủi ro | Cách xử lý |
|---|---|
| PIN 6 số chỉ có 10⁶ khả năng; ai lấy được DB cục bộ của POS là dò ra PIN từ mã băm | Băm bằng hàm chậm (Argon2id) có salt riêng từng người **và** trộn thêm khoá bí mật của thiết bị do server cấp lúc đăng ký. Khoá này không nằm trong snapshot, lưu ở kho khoá của nền tảng (Android Keystore; trên web là khoá WebCrypto không xuất được) |
| PIN quản lý bị lộ dùng để duyệt giảm giá, huỷ món | Lượt duyệt offline bị đánh dấu trong báo cáo kiểm soát; mọi lần đăng nhập Admin ghi audit log kèm IP; nghi lộ thì đặt lại PIN, việc này thu hồi mọi phiên |
| Đếm số lần sai PIN khi offline chỉ theo từng máy | Chấp nhận; số lần sai được gửi lên khi đồng bộ và cộng vào bộ đếm chung |
| Ràng buộc "PIN duy nhất trong chi nhánh" làm lộ PIN người khác khi đặt trùng | Bỏ ràng buộc này: POS chọn nhân viên rồi mới nhập PIN, nên hai người trùng PIN không sao |

## 8. Quy tắc quản lý nhóm quyền

| Quy tắc | Chi tiết |
|---|---|
| Nhóm Chủ bị khoá | Luôn có mọi quyền, kể cả quyền mới thêm sau; không sửa, không xoá |
| Luôn còn một Chủ | Không gỡ hay khoá tài khoản Chủ cuối cùng |
| Không tự nâng quyền | Người sửa nhóm hay gán nhóm chỉ được cấp những quyền chính mình đang có; không sửa nhóm của chính mình, không tự gán nhóm cho mình |
| Nhóm mặc định sửa được | Sửa được quyền và hạn mức; có nút "Khôi phục mặc định"; không xoá, không đổi mã |
| Nhân bản | Tạo nhóm tuỳ chỉnh từ một nhóm có sẵn rồi chỉnh |
| Xoá nhóm tuỳ chỉnh | Chỉ khi không còn ai được gán; nếu còn thì phải chuyển họ sang nhóm khác trước |
| Quyền phụ thuộc | Tick một quyền thì tự tick quyền trong `requires`; bỏ tick quyền nền thì bỏ luôn quyền phụ thuộc, có báo trước |
| Quyền mới từ bản cập nhật | Tự thêm vào nhóm Chủ và các nhóm mặc định theo `defaultRoles`; **không** tự thêm vào nhóm tuỳ chỉnh. Màn hình nhóm quyền hiện nhãn "Mới" để chủ quán rà lại |
| Ghi nhật ký | Tạo, sửa, xoá nhóm; đổi hạn mức; gán, gỡ nhóm: audit log có dữ liệu trước và sau |
| Hiệu lực | Ngay sau khi lưu, với mọi phiên đang đăng nhập |

## 9. Màn hình (Admin)

| Màn hình | Nội dung |
|---|---|
| Danh sách nhóm quyền | Tên, loại (mặc định/tuỳ chỉnh), số quyền, số nhân viên; nút Tạo, Nhân bản |
| Sửa nhóm quyền | Tên vi/en, mô tả · bảng tick quyền chia theo module (mục 4), có tìm kiếm, tick cả module, nhãn Nhạy cảm/Doanh nghiệp/Mới, mô tả từng quyền · phần Hạn mức · tab Nhân viên trong nhóm |
| So sánh nhóm | Đặt hai nhóm cạnh nhau, tô khác biệt |
| Nhân viên → Phân quyền | Bảng chi nhánh × nhóm quyền của một người; xem "quyền thực tế" tại từng chi nhánh |

Component cần thêm vào `apps/admin/src/shared-components` (chỉ admin dùng): `PermissionMatrix` (bảng tick theo nhóm, nhận dữ liệu qua props), dùng lại `DataTable`, `Tabs`, `Badge`, `ConfirmDialog`.

## 10. Dữ liệu chính

| Bảng | Cột chính |
|---|---|
| `permissions` | `code` (khoá), `module`, `scope`, `is_sensitive`, `is_approvable`, `is_deprecated` |
| `roles` | `id`, `code` (chỉ nhóm mặc định), `name` (`{vi,en}`), `description`, `is_system`, `is_locked`, `limits` (jsonb), `version` |
| `role_permissions` | `role_id`, `permission_code` |
| `user_role_assignments` | `user_id`, `branch_id` (null = tất cả chi nhánh), `role_id`; duy nhất theo (`user_id`, `branch_id`) với `NULLS NOT DISTINCT`, để mỗi người chỉ có một bản gán "tất cả chi nhánh" (mặc định PostgreSQL coi các giá trị null là khác nhau) |

Bảng `user_role_assignments` thay cho `user_branches` ghi ở plan 10 trước đây.

## 11. Khi thêm một tính năng mới

1. Khai báo quyền trong `packages/contract/src/permissions/<module>.ts` (đủ `scope`, `defaultRoles`, và `sensitive`/`approvable`/`requires` nếu có).
2. Thêm tên và mô tả vào `packages/i18n` (`permissions`, vi + en).
3. Gắn `@RequirePermission` cho endpoint; viết test: có quyền thì qua, thiếu quyền thì `403`, sai chi nhánh thì `403`.
4. Bọc nút, mục menu, route bằng `<Can>` / khai báo quyền của route.
5. Thao tác nhạy cảm: ghi audit log.
6. Thêm một dòng vào bảng mục 4 của file này và mục "Mã quyền" trong plan của tính năng.

`scripts/check-permissions.mjs` (chạy trong `pnpm lint`) chặn: mã quyền thiếu tên vi/en, mã khai báo mà không endpoint nào dùng, mã trong bảng mục 4 lệch với code.

## 12. Ngoài phạm vi

- Khách hàng (web, app, Zalo) là hệ tài khoản riêng, không dùng nhóm quyền này (21).
- Không có quyền theo từng bản ghi (ví dụ "chỉ sửa đơn do mình tạo") ở GĐ 1; nếu cần sẽ thêm thành quyền riêng như `order.view_all`.
- Không có quyền theo khung giờ hay theo thiết bị.

## 13. Việc cần làm

Tick ở `90-roadmap.md`.

- [x] M1-10: `definePermissions`, kiểu `PermissionCode`, đồng bộ vào CSDL, seed bảy nhóm mặc định. Đồng bộ danh mục chạy mỗi lần API khởi động (`syncPermissionCatalog`); bảy nhóm mặc định do `pnpm db:seed` tạo (`seedDefaultRoles`), lấy tên và hạn mức từ `DEFAULT_ROLES` trong `packages/contract/src/permissions/roles.ts`.
- [x] M1-11: guard mặc định cấm, `@RequirePermission` / `@Authenticated` / `@Public`, ngữ cảnh chi nhánh, `scope`. Code: `apps/api/src/modules/auth/access.guard.ts`, decorator ở `apps/api/src/common/decorators/access.decorators.ts`, cách tính quyền ở `apps/api/src/modules/rbac/access.ts`. Cache quyền làm luôn ở đây vì guard cần.
- [x] M1-12: duyệt tại chỗ bằng PIN. Module `approvals`: `GET /approvals/approvers?permission=` (người có quyền tại chi nhánh, chọn theo tên), `POST /approvals` (PIN người duyệt, lý do) trả token dùng một lần, hạn 120 giây; gửi kèm hành động trong header `X-Approval-Token`, guard nhận thay cho quyền còn thiếu nếu quyền đó `approvable`. Vượt hạn mức thì service gọi `ApprovalsService.consume()`. Audit: `approval.grant`, `approval.reject`, và hành động được duyệt có `metadata.approval` (người duyệt, lý do).
- [ ] M1-20: màn hình nhóm quyền, `PermissionMatrix`, gán nhóm cho nhân viên.
- [x] M1-23: nhóm tuỳ chỉnh, nhân bản, hạn mức, quy tắc mục 8, cache quyền và tín hiệu `permissions.changed` (gateway Socket.IO: M1-26). Endpoint: `GET /permissions` (danh mục kèm `addedAt` để hiện nhãn "Mới": quyền có `addedAt` sau `updatedAt` của nhóm), `GET /roles`, `GET /roles/:id`, `POST /roles`, `POST /roles/:id/clone`, `PATCH /roles/:id`, `POST /roles/:id/restore-default`, `DELETE /roles/:id`; thành viên của nhóm lấy qua `GET /users?roleId=`. API tự thêm quyền trong `requires`. Chống tự nâng quyền: chỉ kiểm tra quyền **được thêm** (bỏ bớt quyền không phải nâng quyền); không sửa nhóm mình đang thuộc. Mọi thay đổi gọi `RbacService.invalidateUsers()`, hàm này xoá cache và phát `permissions.changed` qua Redis pub/sub (kênh `events:permissions.changed`, payload `{ userIds }`). Nhóm Chủ chỉ người thuộc nhóm Chủ gán được, và chỉ ở bản "tất cả chi nhánh". Hạn mức chưa bị giới hạn theo hạn mức của người sửa (mục 8 không yêu cầu).
- [ ] M1-24: `route-permissions.test.ts`, `scripts/check-permissions.mjs`.
- [ ] M2 → M6, M9, M10: mỗi mốc khai báo quyền của module mình theo mục 11.
- [ ] M3: quyền và PIN trong snapshot offline; đánh dấu lệnh offline trái quyền.
- [ ] M7-09: rà soát toàn bộ quyền trước khi chạy thử.

## 14. Câu hỏi mở

- Bảy nhóm mặc định và bảng mục 4 đã khớp cách quán vận hành chưa? Đặc biệt: Thu ngân có được giảm giá (tối đa 10%) và chi tiền mặt (tối đa 200.000 đ) không?
- Đã chốt: một người ở một chi nhánh thuộc **một** nhóm, quyền tách biệt theo chi nhánh (D-40); quản lý chi nhánh không sửa thực đơn chung (D-41).
