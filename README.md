<div align="center">

# 🏥 InMap-7A (Indoor Map 3D Navigation)

**Hệ thống Bản đồ & Điều hướng Tòa nhà 3D Tương tác thời gian thực**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black.svg?logo=threedotjs)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Active_Development-success.svg)]()

<p align="center">
  Giải pháp số hóa bản đồ bệnh viện / tòa nhà đa tầng trong không gian 3D, hỗ trợ tìm đường tự động (A* Pathfinding), quản lý phòng ban và giám sát toạ độ trực quan trên nền tảng Web.
</p>

[Tính năng](#-tính-năng-chính) • [Công nghệ](#-công-nghệ-sử-dụng) • [Cài đặt](#-cài-đặt--chạy-thử) • [Cấu trúc dự án](#-cấu-trúc-thư-mục) • [Đóng góp](#-đóng-góp)

</div>

---

## 🌟 Tính năng chính

- 🗺️ **Mô hình hóa 3D Không gian đa tầng:** Hiển thị trực quan mặt bằng bệnh viện / tòa nhà (kết cấu tường, phòng, hành lang, nội thất y tế) bằng Three.js & React Three Fiber.
- 🧭 **Tìm đường & Điều hướng thông minh (A\* Pathfinding):**
  - Tự động tính toán đường đi ngắn nhất giữa các phòng, khoa khám bệnh.
  - Vẽ tuyến đường 3D phát sáng và hoạt họa chỉ đường sinh động (`NavPath`).
- 🏬 **Quản lý phòng ốc & Mặt bằng (Room Builder):**
  - Công cụ tạo/sửa phòng trực quan ngay trên giao diện web (`RoomBuilderOverlay`).
  - Danh sách khoa/phòng lọc nhanh theo danh mục (`RoomListManager`, `RoomManager`).
- 🎯 **Hiển thị tọa độ & Đo lường thời gian thực (Coord HUD):**
  - Giám sát vị trí con trỏ chuột, tọa độ thế giới 3D phục vụ việc cân chỉnh thiết kế chính xác.
- ⚡ **Hiệu năng cao & Mượt mà:** Tối ưu hóa render mesh 3D với `@react-three/drei`, quản lý trạng thái tập trung gọn nhẹ với `Zustand`.

---

## 🛠️ Công nghệ sử dụng

| Công nghệ | Vai trò |
| :--- | :--- |
| **[React 19](https://react.dev/)** | Framework nền tảng xây dựng UI Component |
| **[TypeScript](https://www.typescriptlang.org/)** | Định kiểu tĩnh an toàn và hạn chế lỗi runtime |
| **[Three.js](https://threejs.org/)** & **[@react-three/fiber](https://r3f.docs.pmnd.rs/)** | Xử lý đồ họa 3D WebGL với tư duy Declarative React |
| **[@react-three/drei](https://github.com/pmndrs/drei)** | Bộ công cụ mở rộng tiện ích (camera controls, text, shaders) cho R3F |
| **[Zustand](https://github.com/pmndrs/zustand)** | Quản lý global state nhanh, nhẹ và không boilerplate |
| **[Vite](https://vitejs.dev/)** | Build tool và dev server siêu tốc |

---

## 🚀 Cài đặt & Chạy thử

### Yêu cầu tiên quyết
- **Node.js** >= 18.x
- Trình duyệt hỗ trợ **WebGL**

### Các bước thực hiện

1. **Clone repository:**
   ```bash
   git clone https://github.com/xuancanh04/inmap-7a.git
   cd inmap-7a
   ```

2. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   ```

3. **Chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại [http://localhost:5173](http://localhost:5173) để xem ứng dụng.

4. **Build đóng gói sản phẩm:**
   ```bash
   npm run build
   ```

---

## 📂 Cấu trúc thư mục

```plaintext
inmap-7a/
├── public/                     # Tài nguyên tĩnh, ảnh bản đồ 2D mẫu & icon
├── src/
│   ├── assets/                 # Vector icons & hình ảnh dự án
│   ├── components/             # Các components React & 3D Objects
│   │   ├── CoordHUD.tsx        # HUD hiển thị tọa độ thời gian thực
│   │   ├── FloorPlan.tsx       # Mặt bằng sàn & bản đồ nền
│   │   ├── HospitalWallMesh.tsx# Kết cấu tường 3D
│   │   ├── HospitalFurniture.tsx# Nội thất & trang thiết bị
│   │   ├── MapCanvas.tsx       # Khung Canvas 3D trung tâm
│   │   ├── NavPath.tsx         # Đường dẫn điều hướng hoạt họa
│   │   ├── RoomBuilderOverlay.tsx # Giao diện thiết kế/vẽ phòng
│   │   ├── RoomManager.tsx     # Quản lý danh sách phòng & tìm kiếm
│   │   └── UIPanel.tsx         # Bảng điều khiển người dùng
│   ├── data/
│   │   └── sampleData.ts       # Dữ liệu phòng & node mẫu
│   ├── store/
│   │   └── useMapStore.ts      # Zustand Store quản lý state toàn cục
│   ├── types/
│   │   └── index.ts            # Định nghĩa Interface & Types
│   ├── utils/
│   │   ├── geometry.ts         # Hàm tính toán hình học 2D/3D
│   │   └── pathfinding.ts      # Thuật toán tìm đường A*
│   ├── App.tsx                 # Root Component
│   ├── main.tsx                # Entry point
│   └── index.css               # Phong cách giao diện & CSS Tokens
├── .github/                    # GitHub Workflows & Issue Templates
├── LICENSE                     # Giấy phép mã nguồn mở MIT
└── README.md                   # Tài liệu hướng dẫn dự án
```

---

## 🤝 Đóng góp (Contributing)

Mọi đóng góp, báo lỗi hoặc đề xuất tính năng mới đều rất được hoan nghênh!

1. Fork dự án
2. Tạo nhánh tính năng (`git checkout -b feat/tinh-nang-moi`)
3. Commit thay đổi (`git commit -m 'feat: thêm tính năng mới'`)
4. Đẩy lên nhánh (`git push origin feat/tinh-nang-moi`)
5. Mở một **Pull Request**

Chi tiết xem tại [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📄 Bản quyền (License)

Dự án được phân phối dưới giấy phép **MIT**. Xem [LICENSE](./LICENSE) để biết thêm thông tin.

---

<div align="center">
  Được phát triển với đam mê bởi <a href="https://github.com/xuancanh04">xuancanh04</a> ❤️
</div>
