# 40. Hai ngôn ngữ và chữ trên giao diện

Hệ thống hỗ trợ **tiếng Việt (`vi`, mặc định và ngôn ngữ dự phòng)** và **tiếng Anh (`en`)** ở mọi ứng dụng, ngay từ M0.

## 1. Phạm vi

| Thứ | Hai ngôn ngữ? | Cách làm |
|---|---|---|
| Chuỗi giao diện (nút, nhãn, thông báo, lỗi) | Có | File ngôn ngữ trong `packages/i18n` (mục 2, 3) |
| Tên dữ liệu danh mục (món, nhóm món, tuỳ chọn…) | Có | Lưu hai ngôn ngữ trong CSDL (mục 4) |
| Lỗi từ API | Có | API trả mã lỗi; client dịch (mục 5) |
| Bill, phiếu bếp, thông báo gửi khách | Có | Theo cấu hình (mục 6) |
| Định dạng tiền, ngày, số | Có | `Intl` theo ngôn ngữ (mục 8) |
| Dữ liệu người dùng nhập tự do (ghi chú đơn, lý do, tên khách) | Không | Hiển thị nguyên văn |
| Tài liệu trong repo, comment code | Không | 01 mục 3 |

## 2. Thư viện và tổ chức

- Thư viện: `i18next` 27 + `react-i18next` 18, dùng chung cho web và Expo (đã xác nhận ở M0-11). `@fnb/i18n` không phụ thuộc React: `createI18n({ locale, plugins })` tạo instance, app React truyền `initReactI18next` vào `plugins`; API và `pos-core` dùng được cùng package.
- Vị trí: `packages/i18n`.

```
packages/i18n/
  locales/
    vi/  common.json  auth.json  menu.json  orders.json  tables.json  kitchen.json
         cash.json  payments.json  inventory.json  reports.json  errors.json …
    en/  (cùng danh sách file, cùng key)
  src/   khởi tạo i18n (create-i18n.ts), danh sách namespace (resources.ts), kiểu của key (types.ts),
         formatMoney / formatNumber / formatDate / formatTime (format.ts), localize()
```

- Thêm namespace: tạo file ở cả `locales/vi` và `locales/en`, rồi khai báo trong `src/resources.ts` (`NAMESPACES` và `resources`). Ở M0 mới có `common`.
- Mỗi module nghiệp vụ một namespace; `common` cho chữ dùng chung ("Lưu", "Huỷ", "Thử lại"); `errors` cho mã lỗi.
- Key có kiểu TypeScript sinh từ file `vi`: gõ sai key là lỗi typecheck.

## 3. Quy tắc cho chuỗi giao diện

| Quy tắc | Chi tiết |
|---|---|
| Không viết cứng | Mọi chữ người dùng thấy đi qua `t()`. ESLint `i18next/no-literal-string` chặn trong JSX. |
| Đủ hai ngôn ngữ cùng lúc | Thêm key ở `vi` thì thêm ở `en` trong cùng thay đổi. `scripts/check-i18n.mjs` chặn khi lệch. |
| Key tiếng Anh, theo ý nghĩa | `orders:void.confirmTitle`, không đặt theo nội dung (`orders:banCoChacKhong`). |
| Không nối chuỗi | Dùng tham số: `t('orders:itemsCount', { count })`. Không ghép `t('a') + ' ' + t('b')`. |
| Số nhiều | Dùng cơ chế plural của i18next (`_one`, `_other`); tiếng Việt chỉ cần `_other`. |
| `shared-components` không viết cứng chuỗi | Nhãn của màn hình vào qua props; nhãn mặc định chung ("Thử lại", "Huỷ") lấy từ namespace `common`. |
| Không dịch máy rồi bỏ đó | Bản `en` do người viết task soạn theo bảng thuật ngữ mục 7; đánh dấu chỗ chưa chắc để rà soát. |
| Ngoài React | Code thuần (ví dụ `pos-core` dựng bill) nhận hàm `t` hoặc bảng nhãn qua tham số; không import i18n trực tiếp. |

### 3.1 Văn phong

| | Tiếng Việt | Tiếng Anh |
|---|---|---|
| Xưng hô | Trung tính, không "bạn/quý khách" trong POS và Admin; web khách dùng "bạn" | "you" |
| Nút | Động từ ngắn: "Lưu", "Thanh toán", "Gửi bếp" | Sentence case: "Save", "Pay", "Send to kitchen" |
| Lỗi | Nói điều đã xảy ra và việc cần làm: "Mất kết nối. Đơn đã lưu trên máy và sẽ tự đồng bộ." | "Connection lost. The order is saved on this device and will sync automatically." |
| Xác nhận nguy hiểm | Nêu rõ hậu quả: "Huỷ món đã gửi bếp? Bếp sẽ nhận phiếu huỷ." | "Void an item already sent to the kitchen? The kitchen will get a void ticket." |
| Viết hoa | Chỉ chữ đầu câu và tên riêng | Sentence case, không Title Case |

## 4. Dữ liệu danh mục hai ngôn ngữ

Tên hiển thị của dữ liệu do quán nhập lưu cả hai ngôn ngữ.

### 4.1 Kiểu dữ liệu

```ts
// packages/contract
const localizedTextSchema = z.object({
  vi: z.string().min(1),
  en: z.string().optional(),
});
```

- Cột CSDL kiểu `jsonb`, tên cột không kèm hậu tố ngôn ngữ: `products.name = {"vi":"Hotdog phô mai","en":"Cheese hotdog"}`.
- `vi` bắt buộc; `en` tuỳ chọn.
- **Chuỗi rỗng là thiếu.** Schema cắt khoảng trắng hai đầu và đổi `en: ""` thành không có `en` ngay lúc parse, vì `??` không coi chuỗi rỗng là thiếu. `LocalizedInput` để trống ô `en` thì gửi lên không có trường `en`.
- Hiển thị bằng `localize(value, locale)`: lấy theo ngôn ngữ hiện tại, thiếu thì lùi về `vi`.
- Tìm kiếm khớp trên cả hai ngôn ngữ, bỏ dấu tiếng Việt. Phía server dùng cột sinh sẵn đã bỏ dấu có chỉ mục trigram (11); POS offline tìm trên bản đã bỏ dấu lưu sẵn trong DB cục bộ.
- Admin nhập bằng component `LocalizedInput` (hai ô vi/en).

### 4.2 Trường áp dụng

| Bảng | Trường |
|---|---|
| `categories`, `products`, `product_variants` | `name`; `products.description` |
| `modifier_groups`, `modifiers` | `name` |
| `areas`, `kitchen_stations` | `name` |
| `payment_methods`, `cash_categories`, `void_reasons` | `name` |
| `roles` (nhóm quyền) | `name` |
| `ingredients`, đơn vị tính | `name` |
| `vouchers`, `promotions`, `loyalty_tiers` (GĐ 3) | `name`, `description` |

Không áp dụng: tên chi nhánh, tên bàn, tên nhân viên, tên khách, tên nhà cung cấp (tên riêng).

### 4.3 Snapshot

Đơn hàng lưu snapshot tên món và tuỳ chọn **ở cả hai ngôn ngữ** tại lúc bán, để in lại và báo cáo đúng ở ngôn ngữ nào cũng được.

## 5. API

| Quy tắc | Chi tiết |
|---|---|
| Lỗi nghiệp vụ trả mã | `{ code: "ORDER_ALREADY_PAID", params: {...} }`. Không trả câu chữ để hiển thị. |
| Client dịch mã | Key `errors:ORDER_ALREADY_PAID` có ở cả `vi` và `en`. Mã chưa có bản dịch thì hiện thông báo chung kèm mã. |
| Lỗi validate | Trả đường dẫn trường + mã quy tắc; client ghép với nhãn trường đã dịch. |
| Dữ liệu danh mục | API trả nguyên đối tượng `{vi, en}`; client chọn ngôn ngữ. POS offline vì vậy đổi ngôn ngữ được mà không cần tải lại. |
| Nội dung do server tạo (thông báo đẩy, ZNS, báo cáo gửi tự động, file xuất) | Server dùng cùng file ngôn ngữ, theo ngôn ngữ của người nhận. |
| Mã lỗi | Khai báo trong `packages/contract`; `check-i18n` kiểm tra mỗi mã có bản dịch. |

## 6. Ngôn ngữ áp dụng theo ngữ cảnh

| Ngữ cảnh | Lấy ngôn ngữ từ |
|---|---|
| Admin | Lựa chọn của nhân viên (lưu theo tài khoản); mặc định `vi` |
| POS, KDS | Cấu hình thiết bị; nhân viên đổi nhanh được, trở về mặc định khi khoá máy |
| Web khách, Zalo | Ngôn ngữ trình duyệt/Zalo, khách đổi được; mặc định `vi` |
| App khách | Ngôn ngữ thiết bị, đổi được trong app |
| Bill in cho khách | Tiếng Việt (D-39). Mẫu in vẫn có tuỳ chọn ngôn ngữ để đổi sau (18: PRINT-22) |
| Phiếu chế biến | Tuỳ chọn của mẫu in theo trạm; mặc định `vi` |
| Thông báo cho khách | Ngôn ngữ khách đã chọn |

## 7. Bảng thuật ngữ

Dùng đúng cặp từ này trong giao diện. Tên trong code: 01 mục 4.

| Tiếng Việt | English |
|---|---|
| Chi nhánh | Branch |
| Nhóm món | Category |
| Món | Item |
| Biến thể / Size | Size |
| Nhóm tuỳ chọn | Modifier group |
| Tuỳ chọn | Modifier |
| Tạm hết | Sold out |
| Đơn | Order |
| Ăn tại quán / Mang đi / Giao hàng | Dine-in / Takeaway / Delivery |
| Số thứ tự | Order number |
| Tạm tính | Subtotal |
| Giảm giá | Discount |
| Phí dịch vụ | Service charge |
| Phụ thu | Surcharge |
| Tổng cộng | Total |
| Thanh toán | Pay / Payment |
| Tiền thừa | Change |
| Hoàn tiền | Refund |
| Huỷ món / Huỷ đơn | Void item / Void order |
| Gửi bếp | Send to kitchen |
| Phiếu chế biến | Kitchen ticket |
| Trạm chế biến | Station |
| Bàn / Khu vực | Table / Area |
| Chuyển bàn / Gộp bàn / Tách đơn | Move table / Merge tables / Split order |
| Ca thu ngân | Cash session |
| Mở ca / Đóng ca | Open session / Close session |
| Sổ quỹ | Cashbook |
| Phiếu thu / Phiếu chi | Cash in / Cash out |
| Nguyên liệu | Ingredient |
| Định lượng | Recipe |
| Phiếu nhập | Goods receipt |
| Kiểm kê | Stock count |
| Tồn kho | Stock on hand |
| Giá vốn | Cost |
| Ca làm việc | Shift |
| Chấm công | Attendance |
| Bảng lương | Payroll |
| Đặt bàn | Reservation |
| Khách hàng | Customer |
| Thành viên / Điểm | Member / Points |
| Nhóm quyền / Quyền | Permission group / Permission |

Trong giao diện tiếng Anh, "món" là **Item** (trong code vẫn là `product`).

## 8. Định dạng

| Loại | `vi` | `en` | Hàm |
|---|---|---|---|
| Tiền | `120.000 ₫` | `₫120,000` | `formatMoney(amount, locale)` / `<Money>` |
| Số | `1.234,5` | `1,234.5` | `formatNumber` |
| Ngày | `26/11/2026` | `26 Nov 2026` | `formatDate` / `<DateTime>` |
| Giờ | `14:30` (24 giờ) | `14:30` (24 giờ) | `formatTime` |
| Khoảng thời gian | `12 phút` | `12 min` | `<Duration>` |

- Luôn hiển thị theo múi giờ của chi nhánh.
- Không tự nối `"đ"`, không tự `toLocaleString` trong app; dùng hàm của `packages/i18n`.
- Tiền trong dữ liệu và API luôn là số nguyên VND, không định dạng.

## 9. Kiểm tra

| Kiểm tra | Ở đâu |
|---|---|
| Key `vi` và `en` khớp, không rỗng, tham số khớp | `scripts/check-i18n.mjs` trong `pnpm lint` và CI |
| Không chuỗi viết cứng trong JSX | ESLint |
| Mỗi mã lỗi trong contract có bản dịch | `check-i18n` |
| Màn hình xem được ở cả hai ngôn ngữ | Người làm task tự xem; E2E chạy luồng chính ở `en` một lần |
| Bill tiếng Việt có dấu in đúng trên máy in thật, ở K57 và K80 | Thử thủ công (18: PRINT-01, PRINT-14) |

## 10. Việc cần làm

- [x] M0: `localizedTextSchema` và `localeSchema` trong contract (làm sớm ở M0-05 vì `localize` của M0-11 cần kiểu này); `packages/i18n` (khởi tạo, `common`, kiểu key, `formatMoney`, `formatDate`, `localize`), `check-i18n`, rule ESLint, `LanguageSwitcher` chạy được ở Admin và POS.
- [ ] M1: ngôn ngữ theo tài khoản và thiết bị; namespace `auth`, `errors`; nhóm quyền mặc định có tên hai ngôn ngữ; namespace `permissions` (tên và mô tả từng quyền, 06).
- [ ] M2 trở đi: mỗi mốc thêm namespace của mình, đủ `vi` và `en`.
- [ ] M3: bill và phiếu in theo cấu hình ngôn ngữ; snapshot tên hai ngôn ngữ.
- [ ] M7: E2E chạy luồng chính ở `en`.

## 11. Câu hỏi mở

- Có cần ngôn ngữ thứ ba về sau không (ví dụ tiếng Trung, tiếng Hàn cho khu du lịch)? Cấu trúc hiện tại thêm được mà không đổi schema.
