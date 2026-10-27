# Hướng dẫn cấu hình & Sử dụng Bộ 5 DFRobot Gravity BLE Beacon (TEL0149) trong InMap-7A

Tài liệu này hướng dẫn chi tiết cách cấu hình phần cứng **Bộ 5 Beacon DFRobot Gravity (BLE Sensor Beacon Pack)** và liên kết với hệ thống bản đồ 3D dẫn đường trong nhà **InMap-7A**.

---

## 1. Thông số kỹ thuật & Cấu hình phần cứng DFRobot BLE Beacon (TEL0149)

Bộ sản phẩm bao gồm 5 module Gravity BLE Beacon sử dụng chip nRF52832 / CC2540 hỗ trợ các chuẩn phát sóng:
- **Chuẩn hỗ trợ:** iBeacon, Eddystone (UID, URL, TLM).
- **Phạm vi phủ sóng:** 10m - 30m trong nhà (phụ thuộc vật cản).
- **Nguồn cấp:** Pin cúc áo CR2032 hoặc cổng cấp nguồn 3.3V - 5V Gravity tiêu chuẩn.

### Cài đặt thông số phát sóng bằng ứng dụng di động:
Tải app **nRF Connect** (Nordic Semiconductor) hoặc **eBeacon** / **LightBlue** trên điện thoại:
1. Bật nguồn module Beacon.
2. Quét thiết bị và kết nối vào module.
3. Cài đặt các thông số cố định đồng bộ với hệ thống:

| Tên thiết bị | UUID | Major | Minor | TxPower | Tọa độ gắn trên bản đồ 3D (X, Z) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Beacon 1** | `FDA50693-A4E2-4FB1-AFCF-C6EB07647825` | 10001 | **1** | -59 dBm | Hành lang Bắc - P. Hành chính: `(20.7, 8.6)` |
| **Beacon 2** | `FDA50693-A4E2-4FB1-AFCF-C6EB07647825` | 10001 | **2** | -59 dBm | Sảnh Cầu thang & Thang máy giữa: `(20.7, 23.5)` |
| **Beacon 3** | `FDA50693-A4E2-4FB1-AFCF-C6EB07647825` | 10001 | **3** | -59 dBm | Ngã ba Khám chuyên khoa cánh Đông: `(31.0, 18.2)` |
| **Beacon 4** | `FDA50693-A4E2-4FB1-AFCF-C6EB07647825` | 10001 | **4** | -59 dBm | Ngã rẽ Khám Nội & Cận Lâm Sàng: `(20.4, 29.0)` |
| **Beacon 5** | `FDA50693-A4E2-4FB1-AFCF-C6EB07647825` | 10001 | **5** | -59 dBm | Cấp cứu ban đầu & Cầu thang 1: `(32.0, 8.6)` |

- **Broadcasting Interval (Chu kỳ phát):** Đặt `200ms` - `500ms` để cân bằng giữa độ mượt khi định vị và thời lượng pin.

---

## 2. Vị trí lắp đặt thực tế trong tòa nhà

- **Độ cao:** Gắn trên trần nhà (khoảng 2.8m - 3.2m) hoặc trên đỉnh tường, hướng mặt ăng-ten chúc xuống sàn.
- **Tránh vật cản:** Không lắp sát cột kim loại lớn hoặc tủ sắt để tránh suy giảm sóng vô tuyến (RSSI).

---

## 3. Cách sử dụng trên giao diện Web InMap-7A

Hệ thống đã được tích hợp đầy đủ công cụ quản lý và mô phỏng trực quan:

1. **Hiển thị trực quan 3D ([BeaconLayer.tsx](file:///d:/inmap-7a/src/components/BeaconLayer.tsx)):**
   - Trên không gian 3D, 5 chiếc beacon hiển thị dưới dạng **cột thu phát sóng có đèn LED xanh và vòng tròn sóng lan tỏa**.
   - Bảng tên nổi `📡 Beacon 1`, `📡 Beacon 2`... hiển thị vị trí chính xác trên trần hành lang.

2. **Mô phỏng định vị tự động (Turn-by-turn simulation):**
   - Trong bảng điều khiển bên trái (`UIPanel`), mục **📡 Định vị BLE Beacon (5)** liệt kê toàn bộ 5 module.
   - Khi bạn click vào bất kỳ Beacon nào (ví dụ: *Beacon 3 — Ngã ba Khám Chuyên Khoa*):
     - Hệ thống tự nhận diện người dùng đang đứng ngay dưới chân Beacon đó.
     - Tự động gán làm **Điểm xuất phát (Origin)**.
     - Nếu đã chọn phòng cần đến, tuyến đường dẫn đường 3D (`NavPath`) phát sáng sẽ **tự động vẽ nối từ vị trí beacon này tới phòng đích**.

3. **Thuật toán tính toán RSSI ([beaconPositioning.ts](file:///d:/inmap-7a/src/utils/beaconPositioning.ts)):**
   - **Mô hình suy hao Log-distance:** $d = 10^{\frac{TxPower - RSSI}{10 \times n}}$
   - Hỗ trợ cả 2 thuật toán:
     - **Proximity (Beacon gần nhất):** Tối ưu nhất cho bộ 5 Beacon trong bệnh viện.
     - **Trilateration (Giao thoa 3 điểm):** Phù hợp khi mở rộng mạng lưới nhiều hơn 5 Beacon.

---

## 4. Tích hợp quét BLE thực tế từ Smartphone (Web Bluetooth API)

Khi chạy trên điện thoại hỗ trợ Web Bluetooth (Chrome trên Android):
```javascript
navigator.bluetooth.requestLEScan({
  filters: [{ manufacturerData: [{ companyIdentifier: 0x004c }] }], // Apple iBeacon prefix
  keepRepeatedDevices: true,
}).then((scanner) => {
  navigator.bluetooth.addEventListener('advertisementreceived', (event) => {
    const rssi = event.rssi;
    // Đọc minor từ mảng manufacturerData
    // Gọi estimatePositionByProximity() để tự động dời người dùng trên bản đồ 3D!
  });
});
```
