# 01. Giấy phép, tên gọi và ngôn ngữ

## 1. Giấy phép

| Mục | Giá trị |
|---|---|
| Giấy phép của repo | MIT (`/LICENSE`), © 2026 Huynh Trung Thoai |
| Mục đích | Dùng nội bộ cho doanh nghiệp của chủ dự án |
| Code sao chép từ nguồn khác | Không có (00) |
| Tài sản thương hiệu (`brands/`: logo, ảnh quán) | **Không** thuộc giấy phép MIT; mọi quyền thuộc chủ thương hiệu. Ghi rõ điều này trong `LICENSE` hoặc `brands/README.md` ở M0-10 |

### 1.1 Thư viện phụ thuộc

| Được dùng | Không dùng |
|---|---|
| MIT, BSD, Apache-2.0, ISC, MPL-2.0 | GPL/AGPL (trong code chạy phía server và client của mình), giấy phép cấm thương mại, Commons Clause, Elastic License |

- Thêm thư viện mới: kiểm tra giấy phép và mức độ bảo trì trước; ưu tiên thư viện đã có trong repo.
- Phông chữ, icon, hình minh hoạ: chỉ dùng thứ có giấy phép cho sản phẩm thương mại. Icon dùng một bộ duy nhất (03 mục 6).

## 2. Tên gọi

| Thứ | Giá trị | Ghi chú |
|---|---|---|
| Tên làm việc của dự án | FNB Platform | Tên repo: `fnb-platform` |
| Phạm vi package | `@fnb/*` | `@fnb/contract`, `@fnb/design-tokens`, `@fnb/pos-core`… |
| Tên thương hiệu hiển thị cho khách | **Banhkepchonong Burger&Co** (07 mục 8) | Không viết cứng tên quán trong code; lấy từ cấu hình doanh nghiệp/chi nhánh |
| Logo, màu thương hiệu | Đã chốt ở [07-brand.md](07-brand.md) | Logo: `brands/banhkepchonong-logo.png`; màu nằm trong token, đổi một chỗ |
| Bundle ID app Android/iOS | Chốt ở GĐ 1.5 và GĐ 4 | |

Tên quán, địa chỉ, số điện thoại, thông tin in trên bill là **dữ liệu** (10: CORE-01, CORE-02), không phải hằng số trong code.

## 3. Ngôn ngữ trong repo

| Thứ | Ngôn ngữ | Ví dụ |
|---|---|---|
| Tên file và thư mục | Tiếng Anh, `kebab-case`, chỉ ASCII | `12-pos-sales.md`, `order-summary.tsx` |
| Mã nguồn: biến, hàm, type, bảng, cột, mã quyền, key i18n, mã lỗi | Tiếng Anh | `order_items`, `order.void_item`, `ORDER_ALREADY_PAID` |
| Comment trong code, mô tả test, log | Tiếng Anh | `// CASH-05: expected cash excludes QR payments` |
| Commit message, tên nhánh, tiêu đề PR | Tiếng Anh | `feat(menu): add modifier groups (M2-04)` |
| Tài liệu: `plans/`, `docs/`, README | Tiếng Việt (tên file vẫn tiếng Anh) | |
| Chữ người dùng nhìn thấy | Tiếng Việt và tiếng Anh, nằm trong `packages/i18n` | 40 |

Không đặt tên file có dấu hay tiếng Việt không dấu (`thuc-don.md`, `ban-hang.tsx`). `scripts/check-filenames` chặn trong lint và pre-commit (02 mục 3).

Tiếng Việt trong file code chỉ được phép ở: file ngôn ngữ `vi`, dữ liệu seed, dữ liệu mẫu trong test.

## 4. Thuật ngữ

Dùng thống nhất trong code, giao diện và tài liệu. Bảng đầy đủ kèm bản dịch giao diện ở 40 mục 7.

| Tiếng Việt | Trong code | Không dùng |
|---|---|---|
| Chi nhánh | `branch` | store, outlet, location |
| Nhóm món | `category` | group, menu group |
| Món | `product` | item, dish, menu item |
| Biến thể (size) | `variant` | size, option |
| Nhóm tuỳ chọn | `modifier_group` | option group, addon group |
| Tuỳ chọn | `modifier` | option, topping, addon |
| Đơn | `order` | bill, invoice, ticket (để chỉ đơn) |
| Bill (tờ in cho khách) | `bill` (ví dụ `order.print_bill`) | receipt, invoice |
| Số hoá đơn (số in trên bill) | `invoice_number`, bảng `invoice_counters` | bill number |
| Máy in | `printer` | print device |
| Mẫu in | `print_template` | layout, receipt template |
| Khổ giấy | `paper` (`k57`, `k80`) | 58mm, 80mm trong code |
| Món trong đơn | `order_item` | line, order line |
| Phiếu chế biến | `kitchen_ticket` | KOT, docket |
| Trạm chế biến | `kitchen_station` | printer group |
| Ca thu ngân | `cash_session` | shift, register session |
| Ca làm việc | `shift` | (không dùng cho ca thu ngân) |
| Sổ quỹ | `cash_entries` / cashbook | transactions |
| Nguyên liệu | `ingredient` | material, stock item |
| Định lượng | `recipe` | BOM, formula |
| Sổ kho | `stock_movements` | inventory log |
| Quyền | `permission` | scope, ability |
| Nhóm quyền | `role` | group, permission_group; chữ "vai trò" trong tài liệu |
| Thiết bị POS | `device` | terminal, register |

Thêm thuật ngữ mới: thêm vào bảng này và 40 mục 7 trước khi dùng trong code.
