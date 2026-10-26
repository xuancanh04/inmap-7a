# Hướng dẫn đóng góp (Contributing Guidelines)

Cảm ơn bạn đã quan tâm đóng góp cho **InMap-7A**! Chúng tôi trân trọng mọi đóng góp giúp dự án ngày càng hoàn thiện.

---

## 🛠️ Quy trình làm việc (Workflow)

1. **Fork** repository về tài khoản cá nhân của bạn.
2. Clone fork về máy:
   ```bash
   git clone https://github.com/<your-username>/inmap-7a.git
   cd inmap-7a
   ```
3. Tạo một branch mới cho tính năng hoặc sửa lỗi:
   ```bash
   git checkout -b feat/ten-tinh-nang
   # hoặc
   git checkout -b fix/ten-loi
   ```
4. Thực hiện các thay đổi mã nguồn.
5. Kiểm tra mã nguồn trước khi commit:
   ```bash
   npm run lint
   npm run build
   ```
6. Commit thay đổi tuân theo quy ước [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: ...` : Thêm tính năng mới
   - `fix: ...` : Sửa lỗi
   - `docs: ...` : Cập nhật tài liệu
   - `style: ...` : Căn chỉnh format code, không thay đổi logic
   - `refactor: ...` : Tái cấu trúc mã nguồn
   - `perf: ...` : Tối ưu hóa hiệu năng
7. Push branch lên repository của bạn:
   ```bash
   git push origin feat/ten-tinh-nang
   ```
8. Mở một **Pull Request (PR)** vào branch `dev` hoặc `main` của repository gốc kèm mô tả chi tiết các thay đổi.

---

## 🐞 Báo cáo lỗi (Bug Reports)

Nếu bạn gặp lỗi trong quá trình sử dụng:
- Hãy kiểm tra xem lỗi đó đã được báo cáo trong mục **Issues** hay chưa.
- Nếu chưa, vui lòng mở một issue mới và cung cấp chi tiết:
  - Các bước tái hiện lỗi (Steps to reproduce).
  - Kết quả mong muốn và kết quả thực tế.
  - Ảnh chụp màn hình hoặc log console trình duyệt (nếu có).

---

## 💡 Đề xuất tính năng (Feature Requests)

Chúng tôi luôn chào đón các ý tưởng sáng tạo để nâng cấp trải nghiệm bản đồ 3D! Vui lòng mở issue với nhãn `enhancement` để thảo luận cùng cộng đồng trước khi triển khai code.
