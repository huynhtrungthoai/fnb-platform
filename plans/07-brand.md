# 07. Thương hiệu và bộ màu

Nguồn phân tích: `brands/banhkepchonong-logo.png` (logo 1297×1068 px), `brands/logo-icon.png` (bản nhỏ 180 px) và `brands/store-3d.jpg` (phối cảnh mặt tiền quán). File này chốt bộ nhận diện dùng trong phần mềm; giá trị ở đây là đầu vào của `packages/design-tokens/tokens.json` (03 mục 5).

Trạng thái: **đã duyệt ngày 2026-11-26** (D-21): màu lấy theo mã đo từ ảnh logo, nút chính màu đỏ, tên thương hiệu "Banhkepchonong Burger&Co".

## 1. Phân tích tài sản hiện có

### 1.1 Logo (`brands/banhkepchonong-logo.png`)

| Yếu tố | Mô tả |
|---|---|
| Tên | "BÁNH KẸP CHÓ NÓNG", chữ hoạt hình viết tay, nghiêng lên, viền đen dày và viền trắng ngoài; dòng trên hổ phách → cam, dòng dưới đỏ hai sắc |
| Linh vật | Chú chó lạp xưởng (dachshund) nằm trong ổ bánh hot dog, có đường mù tạt vàng |
| Nền | Hình ô-van cam có tia sáng, viền đen; ruy băng đỏ ghi "HOTDOGS" |
| Tính cách | Vui, thân thiện, đường phố, ấm nóng; nét viền đậm kiểu sticker |

Màu lấy mẫu trực tiếp từ điểm ảnh của logo 1297 px (màu phẳng, không lẫn răng cưa):

| Màu | Mã | Ở đâu trong logo |
|---|---|---|
| Đỏ | `#CA0404` | Chữ "CHÓ NÓNG" (nửa trên) |
| Đỏ đậm | `#9C0303` | Chữ "CHÓ NÓNG" (nửa dưới) |
| Đỏ ruy băng | `#D33A2E` | Ruy băng |
| Cam | `#ED6F03` | Nền ô-van, nửa dưới chữ "BÁNH KẸP" |
| Cam đậm | `#C94402` | Tia nền |
| Hổ phách | `#F99903` | Nửa trên chữ "BÁNH KẸP" |
| Vàng mù tạt | `#F5BC09` | Mù tạt |
| Vàng bánh | `#DA8A39` | Ổ bánh |
| Xám nâu | `#5D574B` | Lông chó |
| Nâu đậm | `#52341F`, `#31261C` | Bóng, chi tiết |
| Đen, trắng | `#000000`, `#FFFFFF` | Viền |

### 1.2 Mặt tiền quán (`brands/store-3d.jpg`)

| Yếu tố | Mô tả | Mã màu đo được |
|---|---|---|
| Tường | Đỏ gạch trầm, bề mặt nhám | `#8A2A26` (vùng tối `#62211E`) |
| Mái hiên | Hoạ tiết **sóng lượn** đỏ trên nền trắng ngà | `#DCDDDF` |
| Biển tên | "Banhkepchonong", chữ không chân đậm; dòng phụ "BURGER & CO…" (bị cắt trong ảnh) | |
| Chữ trang trí | Cam | `#E48C4E` |
| Nội thất | Gỗ sáng, gạch ca-rô | `#C6A07B` |
| Cửa | Cửa sổ tròn, góc bo lớn | |

Logo "SpaceT Design" trong ảnh là của đơn vị thiết kế nội thất, không thuộc thương hiệu của quán và không dùng trong phần mềm.

### 1.3 Kết luận

- Hai nguồn thống nhất ở **đỏ + cam + trắng ngà**, tông ấm. Logo tươi và rực; mặt tiền trầm và chín hơn.
- Phần mềm lấy **đỏ của logo `#CA0404` làm màu chính** (chữ trắng đạt 5,95:1), **cam `#ED6F03` làm màu nhấn**, **vàng mù tạt `#F5BC09` làm màu cảnh báo**, **đỏ gạch của quán làm nền thương hiệu lớn**.
- Nền trung tính ngả nâu ấm (từ nâu bóng của logo và gỗ trong quán), không dùng xám lạnh.
- Hình khối: bo góc lớn, nét đậm, hoạ tiết sóng lượn làm điểm nhận diện.

### 1.4 Tình trạng file logo

| Mục | Tình trạng |
|---|---|
| Bản đầy đủ màu, đủ lớn | Có: `brands/banhkepchonong-logo.png` (1297×1068). Đủ cho màn hình đăng nhập, đầu trang, icon app |
| Nền trong suốt | **Có** (2026-11-26): `brands/banhkepchonong-logo-transparent.png` và `brands/logo-icon-transparent.png`, tách nền trắng từ bản gốc, giữ một viền trắng đều quanh hình kiểu sticker (12 px ở bản 1297 px, 2 px ở bản 180 px). File gốc nền trắng vẫn giữ |
| Bản một màu đen (in bill nhiệt) | **Chưa có**. Ở M3 tôi sẽ tạo bản đen trắng từ file hiện có và in thử; nếu không rõ nét thì cần bản vẽ riêng |
| Bản vector (SVG/AI) | Chưa có; chỉ cần khi in ấn khổ lớn, phần mềm không bắt buộc |
| Chữ trên ruy băng | Đang hiển thị "HOTDOG S" (có khoảng hở trước chữ S); nên kiểm tra lại với người vẽ |

## 2. Bảng màu gốc

Mỗi màu có thang 50 → 950 (sinh theo OKLCH, giữ sắc độ của màu gốc). Ô **đậm** là màu lấy mẫu từ logo.

| Bậc | `red` | `orange` | `amber` | `brown` (trung tính) |
|---|---|---|---|---|
| 50 | `#FFF4F2` | `#FFF4EF` | `#FFF5EC` | `#F9F6F4` |
| 100 | `#FEE7E3` | `#FEE8DC` | `#FEE9D4` | `#F1ECE8` |
| 200 | `#FFD0C8` | `#FED2BA` | `#FFD3A9` | `#E4DAD4` |
| 300 | `#FEAEA2` | `#FEB187` | `#FAB66F` | `#D1C3B9` |
| 400 | `#FE806F` | `#FA8840` | **`#F99903`** | `#B8A79A` |
| 500 | `#F84839` | **`#ED6F03`** | `#CB7C01` | `#9F8D7F` |
| 600 | **`#CA0404`** | `#BB5603` | `#A86604` | `#7A695C` |
| 700 | `#B70202` | `#984502` | `#895200` | `#6D5D51` |
| 800 | **`#9C0303`** | `#773502` | `#6A3F02` | `#55473D` |
| 900 | `#6A0101` | `#582400` | `#4E2D02` | `#3E332A` |
| 950 | `#470000` | `#3A1600` | `#331B00` | `#282019` |

Màu ngoài thang: `brick` `#8A2A26` (tường quán, dùng cho bề mặt thương hiệu lớn), `cream` `#F6F1EA` (trắng ngà của mái hiên), `ink` `#1A1411` (nền chế độ tối, mực chữ trên nền màu). Ba giá trị mà mục 3 dùng nhưng không nằm trong thang cũng được khai báo trong lớp `palette` của `tokens.json` (M0-06), để lớp `semantic` chỉ trỏ tới `palette`: `white` `#FFFFFF`, `ink-soft` `#211510` (chữ trên nền `accent` và `warning` ở chế độ sáng), `brown.550` `#857366` (`border-strong` ở chế độ tối).

Màu trạng thái. `yellow` lấy từ mù tạt trong logo (bậc 400); ba màu còn lại không có trong logo, chọn cho hợp tông ấm:

| Bậc | `green` | `yellow` | `crimson` | `blue` |
|---|---|---|---|---|
| 100 | `#E0F3E3` | `#F9ECCE` | `#FFE5EA` | `#E1EEFE` |
| 300 | `#A0D5AB` | `#E7C067` | `#FEAABC` | `#9DC9FF` |
| 400 | `#79BD88` | **`#F5BC09`** | `#FE799C` | `#76AEF1` |
| 500 | `#58A46B` | `#B48A03` | `#EF4B7F` | `#5693DC` |
| 600 | `#2F7D46` | `#957104` | `#C2185B` | `#2563A8` |
| 700 | `#24693A` | `#795B03` | `#B00B50` | `#1F5591` |
| 800 | `#17592C` | `#5E4603` | `#8B023D` | `#184B83` |
| 950 | `#002A0E` | `#2C1F00` | `#45001A` | `#012145` |

## 3. Màu theo vai trò (token dùng trong app)

App chỉ dùng tên ở cột "Token"; không dùng trực tiếp bảng màu gốc. Mọi cặp chữ/nền dưới đây đã đo đạt WCAG AA (≥ 4,5:1 cho chữ, ≥ 3:1 cho viền điều khiển). Phép đo này được giữ bằng test tự động trong `packages/design-tokens` (`contrast.test.ts`, M0-06): mỗi cặp `-fg`/nền chính, `-text`/`-subtle`, `text*`/`bg*` ở cả sáng và tối phải đạt ngưỡng, đổi màu làm hỏng thì `pnpm verify` đỏ.

**Hai cặp chưa đạt ở chế độ sáng** (đo bằng `contrast.test.ts` ở M0-06; bảng dưới giữ nguyên giá trị đã duyệt, test ghim hai ngoại lệ này để không tệ hơn):

| Cặp | Đo được | Ngưỡng | Cách dùng cho tới khi đổi màu | Đề xuất đổi (chờ duyệt, mục 10) |
|---|---|---|---|---|
| `text-subtle` `#7A695C` trên `bg-muted` `#F1ECE8` | 4,47:1 | 4,5:1 | Không đặt gợi ý/placeholder trên `bg-muted`; dùng `text-muted` | `text-subtle` sáng → `#786759` (4,61:1) |
| `border-strong` `#9F8D7F` trên `bg-subtle` `#F9F6F4` | 2,96:1 | 3:1 | Điều khiển có viền đặt trên thẻ phải có nền `bg` của riêng nó (viền so với nền trong đạt 3,19:1) | `border-strong` sáng → `#9C8A7C` (3,08:1) |

Các cặp khác đều đạt ở cả hai theme `admin`, `pos` và hai chế độ.

`warning` (vàng `#F5BC09`) chỉ dùng làm **nền** với chữ `warning-fg`; không dùng làm viền hay chữ trên nền sáng vì không đạt 3:1. Viền và chữ cảnh báo dùng `warning-text`.

### 3.1 Trung tính

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#1A1411` | Nền trang |
| `bg-subtle` | `#F9F6F4` | `#282019` | Nền thẻ, sidebar |
| `bg-muted` | `#F1ECE8` | `#3E332A` | Vùng phụ, hàng đang chọn |
| `border` | `#E4DAD4` | `#55473D` | Đường chia |
| `border-strong` | `#9F8D7F` | `#857366` | Viền ô nhập, nút viền |
| `text` | `#282019` | `#F9F6F4` | Chữ chính |
| `text-muted` | `#6D5D51` | `#D1C3B9` | Chữ phụ |
| `text-subtle` | `#7A695C` | `#B8A79A` | Gợi ý, placeholder |
| `text-inverse` | `#FFFFFF` | `#1A1411` | Chữ trên nền màu đậm |

### 3.2 Màu có nghĩa

Mỗi màu có bốn token: nền chính, chữ trên nền chính (`-fg`), nền nhạt (`-subtle`), chữ trên nền nhạt (`-text`).

| Token | Sáng: chính / `-fg` / `-subtle` / `-text` | Tối: chính / `-fg` / `-subtle` / `-text` | Ý nghĩa |
|---|---|---|---|
| `primary` | `#CA0404` / `#FFFFFF` / `#FEE7E3` / `#9C0303` | `#F84839` / `#1A1411` / `#470000` / `#FEAEA2` | Hành động chính, thương hiệu |
| `accent` | `#ED6F03` / `#211510` / `#FEE8DC` / `#984502` | `#FA8840` / `#1A1411` / `#3A1600` / `#FEB187` | Nhấn: khuyến mãi, món mới, đang phục vụ |
| `success` | `#2F7D46` / `#FFFFFF` / `#E0F3E3` / `#17592C` | `#58A46B` / `#1A1411` / `#002A0E` / `#A0D5AB` | Thành công, sẵn sàng |
| `warning` | `#F5BC09` / `#211510` / `#F9ECCE` / `#795B03` | `#F5BC09` / `#1A1411` / `#2C1F00` / `#E7C067` | Cần chú ý |
| `danger` | `#C2185B` / `#FFFFFF` / `#FFE5EA` / `#8B023D` | `#EF4B7F` / `#1A1411` / `#45001A` / `#FEAABC` | Nguy hiểm, lỗi |
| `info` | `#2563A8` / `#FFFFFF` / `#E1EEFE` / `#184B83` | `#5693DC` / `#1A1411` / `#012145` / `#9DC9FF` | Thông tin |

Trạng thái tương tác của `primary` (sáng): hover `#B70202`, nhấn `#9C0303`, vòng focus `#F84839`. Ở chế độ tối (chọn ở M0-06, chữ `primary-fg` trên các nền này đều đạt AA): hover `#FE806F`, nhấn `#FEAEA2`, vòng focus `#FE806F`. Token: `primary-hover`, `primary-active`, `ring`. Lớp phủ sau hộp thoại là token `overlay`: nâu đậm 50% (sáng), đen 65% (tối).

### 3.3 Vì màu chính là đỏ: phân biệt với `danger`

Thương hiệu là đỏ, nên nút chính và hành động nguy hiểm dễ lẫn nhau. Cách xử lý:

| Quy tắc | Chi tiết |
|---|---|
| `danger` lệch sắc | Dùng đỏ hồng (`crimson`), không dùng đỏ cam của thương hiệu |
| `DangerButton` mặc định là viền | Nền trắng, viền và chữ `danger`, luôn kèm icon. Chỉ tô đặc ở nút xác nhận cuối cùng trong `ConfirmDialog` |
| Nút chính luôn tô đặc | `Button` kiểu `primary`: nền đỏ thương hiệu, chữ trắng, mỗi màn hình một nút |
| Vị trí cố định | Nút chính ở bên phải / dưới cùng (`ActionBar`); hành động nguy hiểm không đặt cạnh nút chính |
| Không chỉ dựa vào màu | Lỗi và cảnh báo luôn có icon và chữ |

Đã chốt: nút chính màu đỏ thương hiệu ở mọi app (D-21). Phương án dự phòng nếu chạy thử ở quán (M7-13) thấy thu ngân bấm nhầm: Admin và POS đổi nút chính sang cam; việc này chỉ là đổi giá trị token `primary` của hai app.

### 3.4 Trạng thái nghiệp vụ

| Trạng thái | Token |
|---|---|
| Bàn trống · Đơn hoàn tất · Món xong · Máy in sẵn sàng | `success` |
| Bàn có khách · Bàn đã ra đủ món · Đơn đang phục vụ · Đang làm | `accent` |
| Chờ món · Chờ xác nhận · Chờ đồng bộ · Máy in còn lệnh chờ | `warning` |
| Quá giờ · Đã huỷ · Lỗi đồng bộ · Máy in mất kết nối | `danger` |
| Đã đặt trước · Bàn yêu cầu thanh toán | `info` |
| Nháp · Ngừng dùng · Bàn tạm khoá | trung tính (`bg-muted` + `text-muted`) |

Không dùng `primary` cho trạng thái: màu đỏ thương hiệu trên sơ đồ bàn sẽ bị đọc thành "có vấn đề".

### 3.5 Biểu đồ

Dùng theo thứ tự: `#CA0404`, `#F99903`, `#2563A8`, `#2F7D46`, `#6D5D51`, `#C2185B`, `#76AEF1`, `#B8A79A`. Kiểm tra lại khả năng phân biệt cho người mù màu khi làm báo cáo (M7). Điểm đã biết: `#CA0404` (vị trí 1) và `#C2185B` (vị trí 6) là hai màu đỏ gần nhau; biểu đồ có từ sáu chuỗi trở lên phải thay vị trí 6 hoặc thêm kiểu nét/hoạ tiết.

## 4. Chữ

| Vai trò | Phông đề xuất | Dùng ở | Lý do |
|---|---|---|---|
| Giao diện | **Be Vietnam Pro** | Mọi app | Thiết kế cho tiếng Việt, dấu rõ, nhiều độ đậm, giấy phép OFL |
| Tiêu đề thương hiệu | **Baloo 2** (đậm) | Web/app khách, Zalo, màn hình chờ, banner | Tròn, vui, hợp nét logo; không dùng trong Admin và bảng số liệu |
| Số và mã | `font-mono` hệ thống, `tabular-nums` | Tiền, mã đơn | Canh cột |

- Admin và POS chỉ dùng phông giao diện, để đọc nhanh.
- Kiểm tra giấy phép và độ phủ dấu tiếng Việt của hai phông khi cài ở M0; phông được đóng gói kèm app (POS phải chạy offline), không tải từ mạng ngoài.
- Không dựng lại chữ trong logo bằng phông; tên thương hiệu dạng hình luôn là file logo.

## 5. Hình khối và hoạ tiết

| Yếu tố | Quy định |
|---|---|
| Bo góc | `radius-sm` 6 px, `radius-md` 10 px, `radius-lg` 16 px, `radius-full`. Thẻ và nút dùng `md`; hộp thoại và thẻ món dùng `lg` |
| Viền | Mảnh, màu `border`. Không dùng viền đen dày kiểu logo cho giao diện |
| Bóng | Nhẹ, ngả nâu (không dùng bóng đen thuần) |
| Hoạ tiết sóng | Sóng lượn `brick` trên `cream` như mái hiên. Chỉ dùng ở: màn hình đăng nhập, đầu trang web/app khách, màn hình chờ, trạng thái rỗng. Không đặt dưới chữ hay bảng số liệu |
| Ca-rô | Dự phòng cho ấn phẩm; không dùng trong phần mềm |
| Ảnh món | Nền sáng ấm, bo `lg`, tỉ lệ 1:1 (lưới POS) và 4:3 (web khách) |

## 6. Logo

| Bản | Dùng cho | Trạng thái |
|---|---|---|
| Đầy đủ màu (ô-van) | Đăng nhập, đầu trang web/app khách, màn hình chờ, icon app | Có: `brands/banhkepchonong-logo-transparent.png` (nền trong suốt, dùng mặc định); bản nền trắng `brands/banhkepchonong-logo.png` |
| Một màu đen | Bill nhiệt, phiếu bếp | Chưa có; tạo từ bản màu ở M3 |
| Một màu trắng | Trên nền `primary` | Chưa có. Trên nền `brick` dùng bản màu nền trong suốt (viền trắng sticker tách hình khỏi nền) |
| Bản nhỏ | Favicon, icon 16–32 px, logo ở thanh trên các app | Có: `brands/logo-icon-transparent.png` (180 px, nền trong suốt); bản nền trắng `brands/logo-icon.png` |

- Khoảng trống quanh logo tối thiểu bằng 1/4 chiều rộng logo.
- Kích thước tối thiểu bản đầy đủ: 48 px; nhỏ hơn thì dùng bản nhỏ.
- Nền đặt logo: trắng, `cream`, `brick`, nền tối của chế độ tối, dùng bản nền trong suốt; không cần khung. Không đặt trực tiếp trên nền `primary` hay `accent` (trùng màu ô-van).
- Không kéo méo, không đổi màu, không thêm bóng hay viền.
- File logo đặt ở `brands/` (nguồn) và được đưa vào từng app qua cấu hình doanh nghiệp (CORE-02), không viết cứng đường dẫn.

## 7. Áp dụng theo từng app

Mỗi dòng ứng với một theme trong `packages/design-tokens` (03 mục 5.2). Mọi theme có cả sáng và tối; người dùng chọn qua `ThemeSwitcher` (D-31).

| App | Theme | Mức thương hiệu | Cách dùng |
|---|---|---|---|
| Admin | `admin` | Thấp, đơn giản | Nền trắng/trung tính, gọn; đỏ chỉ ở nút chính, mục menu đang chọn, logo ở sidebar. Không hoạ tiết, không Baloo 2 |
| POS | `pos` | Thấp–vừa | Như Admin, vùng chạm lớn; màu trạng thái là thứ nổi nhất màn hình. Mặc định sáng |
| KDS | `kds` | Thấp | Chữ lớn, đầu phiếu tô màu trạng thái. Mặc định tối |
| Web khách | `customer` | Cao, kiểu riêng | Đầu trang `brick` + hoạ tiết sóng, tiêu đề Baloo 2, nút đặt món `primary` bo `radius-lg`, nhãn khuyến mãi `accent`, ảnh món lớn, nhiều khoảng trắng. Bố cục rộng trên máy tính |
| App khách, Zalo | `mobile` | Cao | Như web khách, chỉnh cho điện thoại (nút rộng hết màn, thanh điều hướng dưới) |
| Bill, phiếu bếp | Một màu | Logo đen, không màu, không hoạ tiết |
| Icon app, màn hình chờ | Cao | Logo trên nền `cream`; thanh trạng thái `brick` |

## 8. Tên gọi và giọng văn

| Mục | Giá trị |
|---|---|
| Tên thương hiệu | **Banhkepchonong Burger&Co** (theo biển hiệu). Dùng cho tiêu đề app, đầu trang, bill, tên hiển thị trên cửa hàng ứng dụng |
| Tên trong logo | "Bánh Kẹp Chó Nóng" là phần chữ của hình logo; không gõ lại bằng phông |
| Tên ngắn | `Banhkepchonong` khi chỗ hẹp (tab trình duyệt, dưới icon app) |
| Tên trong code | Vẫn là `fnb-platform`, `@fnb/*`; tên quán là dữ liệu cấu hình, không viết cứng (01 mục 2) |
| Giọng văn kênh khách | Thân thiện, ngắn, vui nhẹ; xưng "quán" – "bạn" |
| Giọng văn Admin/POS | Trung tính, rõ việc, không đùa |

## 9. Việc cần làm

- [x] P-10: duyệt bộ màu (lấy theo mã đo từ logo), nút chính đỏ, tên thương hiệu.
- [x] M0-06: đưa các giá trị mục 2, 3, 5 vào `packages/design-tokens/tokens.json`; `contrast.test.ts` kiểm các cặp màu mục 3. Phông được đóng gói ở M0-07 cùng hai app (token chỉ giữ tên phông).
- [x] M0-07: trang mẫu `/dev/components` hiển thị bảng màu sáng/tối để soát bằng mắt; favicon là bản sao của `brands/logo-icon-transparent.png` trong `apps/<app>/public/favicon.png`. Phông Be Vietnam Pro (400, 500, 600, 700; giấy phép OFL, có bộ chữ `vietnamese`) đóng gói qua `@fontsource/be-vietnam-pro`, không tải từ mạng ngoài.
- [ ] M3: tạo logo đen trắng cho bill và in thử.
- [ ] M7-13: khi chạy thử, theo dõi việc bấm nhầm nút chính và nút nguy hiểm (mục 3.3).
- [ ] M10: hoạ tiết sóng và tiêu đề thương hiệu cho web khách.

## 10. Câu hỏi mở

- **Hai cặp màu trung tính chưa đạt AA ở chế độ sáng** (mục 3): có đổi `text-subtle` sang `#786759` và `border-strong` sang `#9C8A7C` không? Đổi thì sửa `tokens.json`, bảng 3.1, mockup (`.fnb { --text-subtle, --border-strong }`) và xoá ngoại lệ trong `contrast.test.ts`.
- Phông chữ Be Vietnam Pro và Baloo 2 (mục 4) là đề xuất của tôi, chưa được bạn xác nhận riêng; sẽ dùng nếu bạn không có ý kiến khác trước M0-06.
- Chữ "HOTDOG S" trên ruy băng (mục 1.4). Bản nền trong suốt hiện tách từ ảnh PNG; khi có file vector gốc nên xuất lại cho nét hơn.
