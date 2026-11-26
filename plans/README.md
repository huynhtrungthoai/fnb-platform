# FNB Platform: bộ plan

Hệ thống quản lý nhà hàng/quán ăn cho **một doanh nghiệp, nhiều chi nhánh**, tự dùng:

- **Web Admin**: thực đơn, kho, nhân sự, báo cáo, cấu hình.
- **POS** web (PWA, có offline) và Android (Expo), kèm **màn hình bếp**.
- **Kênh khách hàng**: web, app Expo, Zalo Mini App (đặt món, đặt bàn, thành viên).
- **Một API** NestJS trên PostgreSQL phục vụ mọi ứng dụng.
- **Hai ngôn ngữ**: tiếng Việt (mặc định) và tiếng Anh.
- **Giao diện**: màu và metric dùng chung (`packages/design-tokens`); component chia ba nền tảng Web / POS / Mobile; mỗi app một theme, sáng/tối chọn được.

## Thứ tự đọc

| File | Nội dung |
|---|---|
| [00-sources.md](00-sources.md) | Sản phẩm tham khảo nghiệp vụ, bài học từ hệ thống cũ, quy tắc không sao chép code |
| [01-license-brand.md](01-license-brand.md) | Giấy phép, tên gọi, quy ước đặt tên và ngôn ngữ |
| [02-repo-setup.md](02-repo-setup.md) | Cây thư mục, công cụ, lint/format/typecheck, nhánh và commit |
| [03-design-system.md](03-design-system.md) | Token và theme, sáng/tối, component theo ba nền tảng Web/POS/Mobile, tên chuẩn, khung màn hình, trạng thái |
| [04-architecture.md](04-architecture.md) | Kiến trúc, module API, nguyên tắc dữ liệu, offline, realtime |
| [05-decisions.md](05-decisions.md) | Quyết định đã chốt, đề xuất chờ duyệt, câu hỏi mở, rủi ro |
| [06-permissions.md](06-permissions.md) | Quyền theo tính năng, nhóm quyền mặc định và tuỳ chỉnh, hạn mức, duyệt tại chỗ, danh mục 85 quyền |
| [07-brand.md](07-brand.md) | Phân tích logo và mặt tiền quán, bảng màu, màu theo vai trò sáng/tối, phông chữ, cách dùng logo |
| [10-foundation.md](10-foundation.md) | Chi nhánh, tài khoản, phân quyền, thiết bị, nhật ký |
| [11-menu.md](11-menu.md) | Nhóm món, món, biến thể, tuỳ chọn, giá theo chi nhánh |
| [12-pos-sales.md](12-pos-sales.md) | POS bán hàng, trạng thái đơn, tính tiền, offline |
| [13-tables-kitchen.md](13-tables-kitchen.md) | Trạm chế biến, màn hình bếp; phần bàn (hoãn sang GĐ 6) |
| [14-cash.md](14-cash.md) | Ca thu ngân (mở ca, đóng ca trên POS), sổ quỹ |
| [15-payments.md](15-payments.md) | Phương thức thanh toán, QR chuyển khoản, đối soát |
| [16-inventory.md](16-inventory.md) | Nguyên liệu, định lượng, phiếu kho, kiểm kê |
| [17-reports.md](17-reports.md) | Dashboard, báo cáo doanh thu, món, kiểm soát |
| [18-printing.md](18-printing.md) | Quản lý máy in trên POS (Bluetooth, LAN), mẫu in, khổ giấy K57 và K80, hàng đợi in |
| [20-hr.md](20-hr.md) | Lịch ca, chấm công, tính lương |
| [21-customers.md](21-customers.md) | Tài khoản khách, đặt món, QR tại bàn, đặt bàn, khuyến mãi, thành viên |
| [29-extensions.md](29-extensions.md) | Danh sách mở rộng về sau |
| [31-pos-android.md](31-pos-android.md) | POS Android (Expo) |
| [32-customer-app-zalo.md](32-customer-app-zalo.md) | App khách hàng (Expo), Zalo Mini App |
| [40-i18n-copy.md](40-i18n-copy.md) | Hai ngôn ngữ vi/en: chuỗi giao diện, dữ liệu danh mục, định dạng, lỗi API |
| [90-roadmap.md](90-roadmap.md) | Giai đoạn, mốc, checklist task, nhật ký |

Quy tắc cho agent nằm ở [`/AGENTS.md`](../AGENTS.md) (`CLAUDE.md` import nó). Checklist khi code: [`/docs/code-style.md`](../docs/code-style.md), [`/docs/ui-rules.md`](../docs/ui-rules.md).

## Đánh số

| Dải | Loại |
|---|---|
| `0x` | Nền tảng: nguồn, quy ước, repo, design system, kiến trúc, quyết định, phân quyền, thương hiệu |
| `1x`, `2x` | Tính năng nghiệp vụ |
| `3x` | Ứng dụng theo nền tảng |
| `4x` | Chất lượng: i18n (40); kiểm thử (41) và phát hành, vận hành (42) chưa viết, làm ở M7-10, M7-11 |
| `90` | Roadmap |

Mỗi plan tính năng có cùng bố cục: mục tiêu, chức năng (có mã như `MENU-20`), quy tắc nghiệp vụ, dữ liệu chính, mã quyền, màn hình, câu hỏi mở. Mã quyền của mọi plan được gom ở [06-permissions.md](06-permissions.md) mục 4 kèm nhóm mặc định; hai nơi phải khớp nhau.

## Quyết định đã chốt

1. Một doanh nghiệp, nhiều chi nhánh; không multi-tenant.
2. Viết mới hoàn toàn; không mang code từ hệ thống cũ hay sản phẩm khác (00).
3. POS offline mức cơ bản: outbox + đồng bộ khi có mạng.
4. POS Android là app Expo riêng, dùng chung `pos-core` với POS web.
5. PostgreSQL + Drizzle ORM; Zod làm contract dùng chung.
6. Admin và POS là hai app tách biệt.
7. Tiền là số nguyên VND; khoá chính UUID v7.
8. **Hai ngôn ngữ vi và en** cho giao diện và dữ liệu danh mục (40).
9. **Màu và metric dùng chung; component chia ba nền tảng Web / POS / Mobile; theme theo app, sáng/tối chọn được** (03, D-14, D-31).
10. **Tên file tiếng Anh, comment tiếng Anh; tài liệu tiếng Việt** (01).
11. **Lint, Prettier, typecheck bắt buộc**; giá trị có thể thiếu truy cập bằng `?.` và `??` (02, `docs/code-style.md`).
12. Plan đánh số trong `plans/`; `AGENTS.md` là nguồn quy tắc duy nhất, `CLAUDE.md` chỉ import.
13. **Mỗi tính năng có quyền riêng, cấp qua nhóm quyền** (mặc định và tuỳ chỉnh), gán theo chi nhánh (06).
14. **Thương hiệu Banhkepchonong Burger&Co**; màu chính đỏ `#CA0404`, màu nhấn cam `#ED6F03`, lấy từ logo (07).
15. **Gọi món tại quầy, thanh toán ngay**; phần bàn hoãn sang GĐ 6 (D-26).
16. **Hoá đơn điện tử làm sau**, GĐ 6 (D-27).
17. **Hộ kinh doanh, giá đã gồm thuế**; bill không có dòng VAT (D-28).
18. **Nhân viên đăng nhập bằng tên đăng nhập + PIN 6 số**; sai 5 lần khoá tài khoản, admin mở và đặt lại; một tài khoản super admin do chủ giữ (D-22, D-29).
19. **Khách đăng nhập bằng số điện thoại + PIN 6 số**, đặt lại qua email; số điện thoại là khoá chuẩn cho mọi kênh (D-30).
20. **Realtime làm ngay**: Socket.IO và hàng đợi BullMQ dựng ở M1 (D-25). Đơn có hai trạng thái (D-23); `pos-core` dựng nội dung in, app dựng lệnh in (D-24).
21. **Brevo** gửi email, **Firebase** gửi thông báo đẩy, **Discord** nhận thông báo nội bộ (D-33). Super admin đăng nhập Admin bằng mật khẩu (D-29).
22. **Triển khai lần đầu trên Vercel + Neon** (D-34). POS chạy trên tablet và máy cầm tay (D-35); POS Android giao diện native riêng (D-03).
23. Mở cửa 10:00–22:00, chốt ngày 00:00 (D-36). Bill tiếng Việt (D-39). Quyền tách biệt theo chi nhánh (D-40); quản lý không sửa thực đơn chung (D-41).
24. Chấm công GPS trên trang web nhân viên `/me` trong Admin (D-37); lương theo giờ và theo tháng, có phụ cấp, phạt (D-38).
25. Kênh khách: web responsive trước, app là vỏ WebView (D-42); `ui-mobile` là thiết kế chung, mỗi công nghệ một bản code (D-43).

Danh sách đầy đủ kèm lý do: [05-decisions.md](05-decisions.md).

## Còn mở

- Xác nhận NestJS 12, TypeScript 6.0, pnpm 11.29 (05: D-10, D-11, D-12).
- Cách POS web in ra máy in LAN (O-18): sau spike M3-00.
- Máy in và mẫu máy cầm tay (O-03).
- Phí dịch vụ (O-05).
- Bảng quyền của nhóm mặc định và hạn mức (O-13).
- Hoá đơn in cho khách: một ngôn ngữ theo chi nhánh hay song ngữ (40 mục 6).
