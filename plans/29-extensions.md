# 29. Mở rộng

Giai đoạn: **GĐ 6**. Danh sách ứng viên, chưa cam kết thứ tự. Mỗi mục sẽ được viết đặc tả riêng khi được chọn làm.

## Thực đơn và giá

| Mã | Chức năng | Tham khảo |
|---|---|---|
| EXT-01 | Combo/set: nhóm món với giá gói, cho chọn món trong từng phần | GrabFood, iPOS |
| EXT-02 | Bảng giá theo kênh: tại quán, mang đi, giao hàng, từng app giao đồ ăn | Odoo |
| EXT-03 | Giá theo khung giờ, thực đơn theo buổi | iPOS |
| EXT-04 | Ra món theo lượt (khai vị, món chính, tráng miệng) | Odoo POS Restaurant |

## Kho và mua hàng (chi tiết INV-50 → INV-56 ở tài liệu 16)

| Mã | Chức năng | Tham khảo |
|---|---|---|
| EXT-10 | Chuyển kho giữa chi nhánh | KiotViet, Sapo |
| EXT-11 | Bán thành phẩm, lệnh sản xuất, bếp trung tâm | Odoo Manufacturing |
| EXT-12 | Đơn đặt hàng nhà cung cấp, công nợ | Odoo Purchase |
| EXT-13 | Lô và hạn sử dụng | Odoo Inventory |

## Tích hợp

| Mã | Chức năng |
|---|---|
| EXT-20 | Hoá đơn điện tử: phát hành từ đơn, tra cứu, huỷ/điều chỉnh, chọn nhà cung cấp (D-27: làm sau; dữ liệu thuế và số hoá đơn đã có sẵn trên đơn) |
| EXT-21 | Nhận đơn GrabFood, ShopeeFood vào POS; đồng bộ thực đơn và tạm hết (phụ thuộc việc được cấp API đối tác) |
| EXT-22 | Gọi đối tác giao hàng (Ahamove, Grab Express), theo dõi tài xế |
| EXT-23 | Cổng thẻ/ví: VNPay, MoMo, ZaloPay |
| EXT-24 | Máy chấm công vân tay/khuôn mặt |

## Tài chính

| Mã | Chức năng |
|---|---|
| EXT-30 | Báo cáo lãi lỗ theo chi nhánh: doanh thu − giá vốn − lương − chi phí |
| EXT-31 | Ngân sách và chi phí cố định theo tháng (thuê nhà, điện nước) |
| EXT-32 | Xuất dữ liệu cho phần mềm kế toán |

## Vận hành

| Mã | Chức năng |
|---|---|
| EXT-40 | Màn hình gọi số cho khách mang đi |
| EXT-41 | Màn hình phụ hướng về khách tại quầy |
| EXT-42 | Kiosk tự gọi món |
| EXT-43 | Checklist mở/đóng cửa, nhiệm vụ theo ca |
| EXT-44 | Khảo sát và xử lý phản hồi khách |
| EXT-45 | Dự báo doanh thu, gợi ý xếp ca và đặt hàng |
| EXT-46 | POS offline đầy đủ: các máy trong quán đồng bộ qua LAN khi mất internet |
| EXT-47 | Phục vụ tại bàn và trả sau: khu vực, sơ đồ bàn, phiên bàn, chuyển/gộp/tách (13: TABLE-01 → TABLE-19), sơ đồ bàn trên POS Android (MPOS-03). Hoãn theo D-26. Gọi món bằng QR tại bàn và đặt bàn (21) cần mục này trước |

## Nền tảng

| Mã | Chức năng |
|---|---|
| EXT-50 | Nhiều thương hiệu trong một doanh nghiệp (thực đơn riêng theo thương hiệu) |
| EXT-51 | Ngôn ngữ thứ ba (tiếng Trung, tiếng Hàn…); vi và en đã có sẵn từ M0 (D-13) |
| EXT-52 | API và webhook cho hệ thống ngoài |

## Cách chọn việc ở giai đoạn này

Ưu tiên theo: (1) quán đang mất tiền hoặc mất thời gian vì thiếu nó, (2) phụ thuộc bên ngoài đã sẵn sàng (API đối tác, tài khoản, hợp đồng), (3) công sức.
