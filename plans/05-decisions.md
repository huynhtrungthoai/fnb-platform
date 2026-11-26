# 05. Quyết định

Trạng thái: **Đã chốt** · **Đề xuất** (chờ bạn xác nhận) · **Mở** (chưa cần quyết ngay).

## Đã chốt

| # | Quyết định | Ghi chú |
|---|---|---|
| D-01 | Một doanh nghiệp, nhiều chi nhánh | Không multi-tenant |
| D-02 | POS offline mức cơ bản | Outbox + đồng bộ khi có mạng |
| D-03 | POS Android là app Expo riêng, **giao diện native riêng cho mượt**, thiết kế lấy từ POS web (cùng màn hình, cùng tên component, cùng token) | Dùng chung `pos-core` với POS web. Xác nhận lại ngày 2026-11-26 (đóng O-17): không làm vỏ WebView cho POS |
| D-04 | Viết mới, không mang code cũ | Chỉ rút kinh nghiệm từ `hotdog-web-app` |
| D-05 | Dữ liệu mới, hệ thống cũ chạy song song | Có thể import menu bằng script sau |
| D-06 | PostgreSQL + Drizzle ORM | Thay TypeORM |
| D-07 | Zod làm contract dùng chung | Thay cho contract chỉ có type |
| D-08 | Admin và POS là hai app tách biệt | Hệ thống cũ gộp chung |
| D-09 | Tiền là số nguyên VND, id là UUID v7 | |
| D-13 | Hai ngôn ngữ: tiếng Việt (mặc định) và tiếng Anh, cho giao diện và dữ liệu danh mục | Plan 40 |
| D-14 | Màu và metric dùng chung (`packages/design-tokens`). Component chia theo **ba nền tảng giao diện**, mỗi nền tảng một bộ: **Web** (`admin`, `customer-web`) → `packages/ui-web`; **POS** (POS web + KDS) → `packages/ui-pos`; **Mobile** (`customer-app`, `zalo-mini-app`) → `packages/ui-mobile`. App chỉ dùng bộ của nền tảng mình; không import bộ của nền tảng khác | Plan 03 mục 7, `docs/ui-rules.md`. Sửa lần hai ngày 2026-11-26 theo yêu cầu: thay "mỗi app một bộ riêng". Cách dùng chung của `ui-mobile`: D-43; app khách là vỏ WebView nên dùng `ui-web` (D-42); POS Android viết bản native theo thiết kế của `ui-pos` (D-03) |
| D-31 | **Theme theo nền tảng, sáng/tối chọn được.** Token có ba lớp: bảng màu gốc → màu vai trò (sáng và tối) → theme (`admin`, `customer`, `pos`, `kds`, `mobile`). Mọi app có `ThemeSwitcher` (Theo hệ thống / Sáng / Tối), lưu trên thiết bị. **Admin** theme gọn, thương hiệu thấp; **web khách** theme `customer` riêng, thương hiệu cao | Chốt ngày 2026-11-26. Plan 03 mục 5, 07 mục 7. Trả lời câu hỏi "POS có cần tối mặc định": không, mặc định sáng, đổi được |
| D-21 | Thương hiệu **Banhkepchonong Burger&Co**; màu lấy theo mã đo từ logo: `primary` đỏ `#CA0404`, `accent` cam `#ED6F03`, `warning` vàng `#F5BC09`; nút chính màu đỏ ở mọi app | Plan 07 |
| D-20 | Zalo Mini App là app riêng `apps/zalo-mini-app`, không build từ `customer-web` | Plan 32 |
| D-15 | Giá trị có thể thiếu truy cập bằng `?.` và `??`; không dùng `!`; dữ liệu từ ngoài parse bằng Zod | `docs/code-style.md` mục 3 |
| D-16 | Lint (ESLint), format (Prettier) và typecheck bắt buộc: pre-commit hook + CI | Plan 02 mục 3.1 |
| D-17 | Tên file tiếng Anh `kebab-case` ASCII; comment tiếng Anh; tài liệu tiếng Việt | Plan 01 mục 3 |
| D-19 | Mỗi tính năng có quyền riêng; quyền chỉ cấp qua nhóm quyền (mặc định + tuỳ chỉnh), gán theo chi nhánh; API mặc định cấm | Plan 06 |
| D-18 | Plan đánh số trong `plans/`; `AGENTS.md` là nguồn quy tắc duy nhất, `CLAUDE.md` chỉ import | `plans/README.md`, `AGENTS.md` |
| D-26 | Quán **gọi món tại quầy và thanh toán ngay**: đơn trả tiền trước rồi mới gửi bếp; không có phục vụ tại bàn, không trả sau. Toàn bộ phần bàn (sơ đồ, phiên bàn, chuyển/gộp/tách) hoãn sang GĐ 6 (EXT-47); M4 chỉ còn bếp | Trả lời O-16 ngày 2026-11-26. Plan 12, 13 |
| D-27 | Hoá đơn điện tử **làm sau**, ở GĐ 6 (EXT-20); GĐ 1 không phát hành | Trả lời O-09 ngày 2026-11-26. Plan 29 |
| D-28 | Quán là **hộ kinh doanh**, **giá niêm yết đã gồm thuế**: giá bán là giá cuối, bill không có dòng VAT, không cộng thêm thuế. Thuế suất mặc định của chi nhánh là 0% | Trả lời O-05 ngày 2026-11-26. Bộ tính VAT vẫn có trong `pos-core` nhưng tắt, để bật lại bằng cấu hình nếu sau này chuyển thành doanh nghiệp. Plan 12 |
| D-22 | Trên POS **chọn nhân viên rồi nhập PIN**; PIN không cần duy nhất; mã băm PIN trộn khoá bí mật của thiết bị; snapshot offline hết hạn sau 72 giờ | Xác nhận ngày 2026-11-26. Plan 06 mục 7.3, plan 10 |
| D-29 | Tài khoản nhân viên = **tên đăng nhập + mã PIN 6 số**; PIN là mật khẩu duy nhất, dùng cho cả Admin và POS, không có mật khẩu riêng; PIN đặt tuỳ ý, không chặn PIN dễ đoán. **Riêng super admin đăng nhập Admin bằng mật khẩu** (tối thiểu 10 ký tự) và có thêm PIN 6 số để dùng trên POS. Sai 5 lần thì **khoá tài khoản**, admin mở lại; admin đặt lại PIN cho nhân viên. Có **một tài khoản super admin** do chủ quán giữ; cấp dưới là Quản lý → Thu ngân → Nhân viên | Chốt ngày 2026-11-26. Plan 10 mục "Tài khoản nhân viên" |
| D-30 | Tài khoản khách = **số điện thoại + mã PIN 6 số**, kèm **email** lúc đăng ký; quên PIN thì đặt lại qua email. Số điện thoại là khoá chuẩn cho mọi nguồn (web, app, Zalo, POS). Không dùng OTP qua tin nhắn | Chốt ngày 2026-11-26. Plan 21 |
| D-23 | Đơn có **hai trạng thái độc lập**: `status` (chế biến, phục vụ) và `payment_status` (thanh toán) | Xác nhận ngày 2026-11-26. Plan 12 mục "Vòng đời đơn" |
| D-24 | `pos-core` dựng nội dung in (`PrintDocument`, khổ K57 và K80); mỗi app dựng lệnh in (ảnh mặc định, chữ khi máy hỗ trợ) và lo đường truyền | Xác nhận ngày 2026-11-26; chi tiết cập nhật sau khi thử trên máy in thật (spike M3-00). Plan 18 |
| D-25 | **Realtime làm ngay từ đầu.** Gateway Socket.IO và hàng đợi BullMQ dựng ở M1 (M1-25, M1-26); bếp, quầy, thanh toán QR và thay đổi quyền đều cập nhật tức thời qua socket | Xác nhận ngày 2026-11-26. Môi trường triển khai vẫn làm ở M7-10. Plan 04 mục "Realtime" |
| D-33 | Dịch vụ ngoài: **Brevo** gửi email (đặt lại PIN của khách, xác nhận email); **Firebase Cloud Messaging** gửi thông báo đẩy tới app và trình duyệt; **Discord** (webhook vào kênh của quán) nhận thông báo nội bộ: báo cáo cuối ngày, cảnh báo vận hành | Trả lời O-10 ngày 2026-11-26. Khoá của ba dịch vụ nằm trong biến môi trường; test dùng bản giả lập. Plan 04 mục "Thông báo" |
| D-34 | Triển khai lần đầu trên **Vercel** (ba web app, API NestJS chạy bằng Vercel Functions có Fluid compute, worker BullMQ chạy dạng daemon) và **Neon** (PostgreSQL). Khi tải tăng thì chuyển nơi chạy sau | Trả lời O-01 ngày 2026-11-26. Ràng buộc và việc phải giữ để chuyển được: 04 mục "Môi trường" |
| D-35 | POS chạy trên **hai dạng thiết bị**: tablet (quầy thu ngân) và máy cầm tay; cả POS web lẫn POS Android đều có hai bố cục đó | Trả lời O-04. Máy cầm tay có máy in liền hay không: hỏi cùng O-03 |
| D-36 | Quán mở cửa **10:00–22:00**, không bán qua nửa đêm; giờ chốt ngày kinh doanh mặc định **00:00** (cấu hình được theo chi nhánh) | Trả lời O-06. Plan 10: CORE-02 |
| D-37 | Chấm công bằng **GPS trên trang web của nhân viên** sau khi đăng nhập; trang này là nhóm route `/me` trong `apps/admin`. Không chấm bằng QR động hay PIN trên POS | Trả lời O-07, O-19. Plan 20 |
| D-38 | Lương tính **cả theo giờ và theo tháng** (chọn theo từng nhân viên), có phụ cấp, phạt và trừ đi trễ | Trả lời O-08. Con số cụ thể (mức phạt, ân hạn, hệ số) nhập khi cấu hình ở M9. Plan 20 |
| D-39 | Bill in cho khách **chỉ tiếng Việt** | Trả lời O-12. Giao diện vẫn hai ngôn ngữ (D-13). Plan 18 |
| D-40 | **Quyền tách biệt theo chi nhánh**: mỗi người có một nhóm quyền ở mỗi chi nhánh được gán; quyền ở chi nhánh này không có hiệu lực ở chi nhánh khác, dữ liệu vận hành của các chi nhánh không lẫn nhau | Trả lời O-14. Plan 06 mục 3.3 |
| D-41 | Quản lý chi nhánh **không** sửa thực đơn chung; chỉ sửa giá và bật/tắt bán ở chi nhánh mình | Trả lời O-15. Plan 06 mục 4.2, plan 11 |
| D-42 | Kênh khách: làm **web khách responsive trước**; app khách là **vỏ WebView** bọc web khách, không viết giao diện native riêng | Trả lời O-20. Plan 32 |
| D-43 | `ui-mobile` là **một bộ thiết kế chung** (tên component, kiểu props, token, theme `mobile`); mỗi công nghệ tự viết bản component của mình theo đúng thiết kế đó để đồng bộ, không ép một bộ code chạy mọi nơi | Trả lời O-21 (phương án c). Với D-42, app khách chạy web khách nên dùng `ui-web` theme `customer`; bản code `ui-mobile` đầu tiên là cho Zalo Mini App. Plan 03 mục 7 |
| D-44 | Cổng QR đầu tiên là **SePay** | Trả lời O-02 ngày 2026-11-26. Gói miễn phí chỉ khoảng 50 giao dịch tiền vào mỗi tháng, nên tính là dịch vụ trả phí; chọn gói theo số giao dịch thật ở M5-01. Lớp `PaymentProvider` (PAY-18) giữ khả năng đổi cổng. Plan 15 |

## Đề xuất (kết quả kiểm tra phiên bản ngày 2026-11-26)

### D-10: NestJS 12 thay vì 11

- Kế hoạch ban đầu ghi NestJS 11. Bản mới nhất là 12.6, đã chuyển sang ESM (import phải có đuôi `.js`, `module: nodenext`).
- `nestjs-zod` 5.6 chưa khai báo hỗ trợ NestJS 12 (chỉ `^10 || ^11`).
- **Đề xuất:** dùng NestJS 12, tự viết pipe validate Zod (vài chục dòng) và sinh OpenAPI từ `z.toJSONSchema` của Zod 4. Tránh phải nâng major và chuyển ESM ngay sau khi làm xong.
- Phương án còn lại: NestJS 11 + `nestjs-zod`, ít việc hơn lúc đầu nhưng sẽ phải nâng cấp sớm.

### D-11: TypeScript 6.0, chưa dùng 7

- TypeScript 7.0.2 là bản mới nhất, nhưng `@nestjs/swagger` (`^5.5 || ^6`), `typescript-eslint` (`<6.1`) và `@nestjs/cli` (`~6.0`) chưa hỗ trợ.
- **Đề xuất:** ghim TypeScript 6.0.x, nâng lên 7 khi hệ sinh thái theo kịp.

### D-12: pnpm 11.29

- Trên máy hiện tại corepack không chạy được pnpm 12.23 (lỗi thiếu file sau khi tải). pnpm 11.29.0 chạy tốt.
- **Đề xuất:** ghim `packageManager: pnpm@11.29.0`.

### Phiên bản dự kiến khác

Node 24 · Turborepo 2.11 · Vite 8 · React 19.3 · TanStack Router 1.170 · TanStack Query 5 · Tailwind 4.3 · Zod 4.6 · Drizzle ORM 0.45 · Vitest 5 · ESLint 10.

## Mở

| # | Câu hỏi | Cần quyết trước |
|---|---|---|
| O-03 | Máy in đang dùng (hãng, khổ K57/K80, kết nối LAN/Bluetooth/USB, Bluetooth cổ điển hay BLE) | Spike M3-00 |
| O-05 | Quán có thu phí dịch vụ không (phần thuế đã chốt ở D-28; mặc định đề xuất: không thu) | Mốc M3 |
| O-13 | Bảng quyền của bảy nhóm mặc định và các hạn mức (06 mục 4, 5) đã khớp cách quán vận hành chưa | Mốc M1 |
| O-18 | POS web gửi lệnh tới máy in LAN bằng cách nào: cầu nối trên `localhost` của máy POS, hay cầu nối có chứng chỉ TLS; quầy cần in LAN cũng có thể dùng POS Android (in native) | Spike M3-00 |

## Rủi ro đã biết

| Rủi ro | Cách xử lý |
|---|---|
| Docker daemon trên máy dev đang tắt | Bật Docker Desktop trước khi chạy M0 |
| Cổng 3000 đang bị tiến trình khác dùng | API dùng cổng khác (ví dụ 4000) |
| In Bluetooth trên web bị giới hạn theo trình duyệt (Web Bluetooth chỉ hỗ trợ máy in BLE) | Spike M3-00; Android in native |
| Trang HTTPS không gọi thẳng được máy in hay cầu nối trong mạng LAN | Spike M3-00 trước khi làm in ấn; phương án ở O-18 |
| Máy in không có bảng mã tiếng Việt | In dạng ảnh là mặc định (D-24) |
| Offline gây lệch tồn kho | Cho phép tồn âm, cảnh báo, kiểm kê định kỳ |
| Hai máy sửa cùng một đơn khi một máy offline | Offline chỉ sửa đơn do chính thiết bị tạo; quy tắc ở 04 mục "Quy tắc khi đồng bộ" |
| PIN 6 số là mật khẩu duy nhất của nhân viên (D-29), kể cả khi đăng nhập Admin qua internet | Khoá tài khoản sau 5 lần sai, giới hạn tần suất theo IP, mã băm trộn khoá thiết bị (D-22), audit log mọi lần đăng nhập sai và mở khoá |
| Số điện thoại của khách không được xác minh khi tự đăng ký (D-30 bỏ OTP) | Tài khoản tự đăng ký chỉ được gộp với lịch sử mua và điểm có sẵn của số đó sau khi xác minh (qua Zalo hoặc nhân viên xác nhận tại quầy); plan 21 |
| Hai bộ giao diện POS (web và Android) phải giữ đồng bộ tính năng (D-03) | Logic nằm hết trong `pos-core`; cùng tên màn hình và component; tính năng mới làm ở POS web trước |
| Vercel Functions khởi động nguội và giới hạn thời lượng kết nối (D-34); hệ thống cũ từng gặp vấn đề này | Bật Fluid compute; socket client tự kết nối lại và tải lại dữ liệu (04); đo độ trễ ở M7-10, không đạt thì chuyển API sang máy chạy liên tục |
| Chấm công GPS trên web dễ giả vị trí và phụ thuộc quyền định vị của trình duyệt (D-37) | Lưu toạ độ và độ chính xác mỗi lần chấm; quản lý xem được trên bảng công; tuỳ chọn chụp ảnh (HR-22) |
| Gần 150 task của GĐ 0 và GĐ 1 trước lần chạy thật đầu tiên | Chấp nhận; giữ từng mốc chạy được trên máy dev và có E2E |
| Mất kết nối socket làm màn hình bếp hay quầy đứng hình mà không ai biết | Client tự kết nối lại và tải lại dữ liệu; hiện rõ trạng thái mất kết nối (04 mục "Realtime") |
| Hoá đơn điện tử làm sau (D-27) nhưng quy định có thể buộc làm sớm | Đơn lưu sẵn thuế theo từng thuế suất và `invoice_number`, nên thêm EXT-20 sau không phải đổi dữ liệu đơn |
| Chưa có kế hoạch chuyển từ hệ thống cũ | 00 mục 2.1, task M7-14 |
