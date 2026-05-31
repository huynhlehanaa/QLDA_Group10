# Front-end KPI Nội Bộ

## 1. Yêu cầu

- Node.js 18+ (khuyến nghị dùng bản LTS mới)
- npm 9+
- Backend đang chạy tại `http://localhost:8000`

## 2. Cài đặt

Di chuyển vào thư mục front-end và cài dependencies:

```bash
cd frontend
npm ci
```

## 3. Cấu hình biến môi trường

Ứng dụng dùng biến `NEXT_PUBLIC_API_BASE_URL` để gọi API backend.

Tạo file `.env.local` trong thư mục `frontend/` nếu muốn đổi địa chỉ backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Nếu không tạo file này, ứng dụng vẫn mặc định dùng `http://localhost:8000`.

## 4. Chạy ở môi trường phát triển

```bash
cd frontend
npm run dev
```

Sau khi chạy thành công, mở trình duyệt tại:

- `http://localhost:3000`

## 5. Build và chạy bản production

### Build

```bash
cd frontend
npm run build
```

### Chạy production

```bash
cd frontend
npm run start
```

## 6. Các lệnh thường dùng

- `npm run dev`: chạy môi trường development
- `npm run build`: build ứng dụng
- `npm run start`: chạy ứng dụng sau khi build

## 7. Lưu ý

- Front-end mặc định chạy ở cổng `3000`
- Backend cần chạy trước để chức năng đăng nhập, dashboard, KPI, task và thông báo hoạt động đúng
