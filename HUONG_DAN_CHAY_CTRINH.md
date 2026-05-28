# Hướng Dẫn Chạy Chương Trình KPI Nội Bộ

## Tổng Quan

Chương trình KPI Nội Bộ gồm:
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Redis + Celery
- **Frontend**: Next.js 14 + TypeScript + Zustand + Vitest

---

## 1. Yêu Cầu Hệ Thống

Trước khi bắt đầu, đảm bảo bạn đã cài đặt:

- **Git** — để clone repository
- **Python 3.12** — cho backend
- **Node.js 18+** và **npm** — cho frontend
- **Docker Desktop** — để chạy PostgreSQL và Redis
- **PowerShell 5.1+** hoặc **Command Prompt** — để chạy lệnh

---

## 2. Clone Và Cấu Trúc Dự Án

```powershell
git clone <repo_url>
cd code
```

Cấu trúc thư mục:
```
code/
├── backend/          # FastAPI + SQLAlchemy
├── frontend/         # Next.js 14
├── venv/             # Python virtual environment (sẽ tạo)
└── SETUP_NEW_MACHINE.md
```

---

## 3. Khởi Động Database Và Redis

### Bước 3.1: Khởi động các dịch vụ với Docker

```powershell
cd backend
docker compose up -d db redis
```

Kiểm tra trạng thái:
```powershell
docker compose ps
```

**Kỳ vọng:** Bạn sẽ thấy `db` và `redis` có trạng thái `Up`.

### Bước 3.2: Xác minh kết nối

Nếu Docker chạy thành công:
- **PostgreSQL** sẽ lắng nghe trên `localhost:5432`
- **Redis** sẽ lắng nghe trên `localhost:6379`

---

## 4. Cấu Hình Và Khởi Động Backend

### Bước 4.1: Tạo Python Virtual Environment

```powershell
cd backend
py -3.12 -m venv ..\venv
# Kích hoạt venv
..\venv\Scripts\Activate.ps1
```

Nếu gặp lỗi permission, chạy:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
..\venv\Scripts\Activate.ps1
```

### Bước 4.2: Cài Đặt Dependencies

```powershell
pip install -r requirements.txt
```

### Bước 4.3: Cấu Hình File `.env`

Tạo hoặc sửa file `backend/.env` với nội dung:

```env
# Database
DATABASE_URL=postgresql://admin:secret123@localhost:5432/kpi_system

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret (tạo string ngẫu nhiên)
SECRET_KEY=your_secret_key_here_change_in_production

# URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
API_BASE_URL=http://localhost:8000/api/v1

# Environment
ENVIRONMENT=development
```

### Bước 4.4: Chạy Database Migration

```powershell
# Trong backend/, venv đã active
alembic upgrade head
```

### Bước 4.5: Seeding Dữ Liệu Mẫu (Tùy Chọn)

```powershell
python seed.py
```

**Tài khoản mẫu sau khi seed:**
- Email: `ceo@company.com`
- Mật khẩu: `Admin@123456`

### Bước 4.6: Chạy Backend Server

```powershell
# Trong backend/, venv đã active
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend sẽ chạy tại:**
- API: http://localhost:8000/api/v1
- Swagger Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

---

## 5. Cấu Hình Và Khởi Động Frontend

### Bước 5.1: Cài Đặt Dependencies

Mở **terminal mới** (không đóng terminal backend):

```powershell
cd frontend
npm install
```

### Bước 5.2: Cấu Hình File `.env.local` (Nếu Cần)

Tạo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### Bước 5.3: Chạy Frontend Dev Server

```powershell
npm run dev
```

**Frontend sẽ chạy tại:** http://localhost:3000

---

## 6. Kiểm Tra Hệ Thống

### 6.1: Backend Health Check

```powershell
Invoke-WebRequest http://localhost:8000/health -UseBasicParsing
```

Kỳ vọng: Trả về status 200.

### 6.2: Login Thử Nghiệm

```powershell
$body = @{
  email = 'ceo@company.com'
  password = 'Admin@123456'
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:8000/api/v1/auth/login' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body `
  -UseBasicParsing
```

Kỳ vọng: Trả về JWT token trong response.

### 6.3: Truy Cập Frontend

Mở trình duyệt và vào: http://localhost:3000

Đăng nhập bằng:
- Email: `ceo@company.com`
- Mật khẩu: `Admin@123456`

---

## 7. Chạy Tests

### 7.1: Frontend Tests

```powershell
cd frontend
npm run test
```

Kỳ vọng: Tất cả tests pass (79 tests).

### 7.2: Frontend Type Check

```powershell
npm run typecheck
```

### 7.3: Backend Tests (Nếu Có)

```powershell
cd backend
..\venv\Scripts\Activate.ps1
python -m pytest tests/tests -q
```

---

## 8. Các Lệnh Hữu Ích

### Frontend

| Lệnh | Mô Tả |
|------|-------|
| `npm run dev` | Chạy dev server (hot reload) |
| `npm run build` | Build cho production |
| `npm run test` | Chạy Vitest suite |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run lint` | Chạy ESLint |

### Backend

| Lệnh | Mô Tả |
|------|-------|
| `python -m uvicorn app.main:app --reload` | Chạy dev server |
| `alembic upgrade head` | Chạy database migrations |
| `python seed.py` | Seed dữ liệu mẫu |
| `python -m pytest tests/tests -q` | Chạy test suite |

### Docker

| Lệnh | Mô Tả |
|------|-------|
| `docker compose up -d` | Khởi động tất cả dịch vụ |
| `docker compose down` | Tắt tất cả dịch vụ |
| `docker compose ps` | Kiểm tra trạng thái dịch vụ |
| `docker compose logs db` | Xem logs của PostgreSQL |

---

## 9. Tính Năng Sprint 2

Frontend hiện đã hỗ trợ:

### Công Việc (Tasks)
- **Danh sách công việc** — xem tất cả công việc dạng bảng
- **Kanban board** — xem công việc theo trạng thái (To Do, In Progress, Done)
- **Bộ lọc & tìm kiếm** — lọc theo trạng thái, ưu tiên, deadline
- **Chi tiết công việc** — xem chi tiết, bình luận, đính kèm tệp
- **Cập nhật trạng thái** — kéo thả hoặc dùng nút để chuyển trạng thái

### KPI
- **Dashboard KPI** — xem tổng quan KPI (tính năng cơ bản, chưa hoàn thiện UI)

### PWA
- **Offline caching** — dữ liệu tĩnh được cache khi offline
- **Service Worker** — đăng ký và quản lý offline mode

---

## 10. Xử Lý Sự Cố

### Lỗi: "Port 8000 hoặc 3000 đã được sử dụng"

Tìm process và kill:
```powershell
# Backend (port 8000)
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force

# Frontend (port 3000)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Lỗi: "PostgreSQL connection refused"

Kiểm tra Docker:
```powershell
docker compose ps
docker compose logs db
```

Nếu cần reset:
```powershell
docker compose down -v
docker compose up -d db redis
```

### Lỗi: "ModuleNotFoundError" ở Backend

```powershell
cd backend
..\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Lỗi: "npm install failed"

```powershell
cd frontend
del node_modules package-lock.json
npm install
```

---

## 11. Kết Nối API Từ Frontend

Frontend sử dụng Axios client tại `src/lib/api.ts`:

```typescript
// Ví dụ sử dụng trong component
import { apiClient } from '@/lib/api';

const response = await apiClient.get('/tasks');
```

**Interceptors:**
- Tự động thêm JWT token vào request header
- Tự động refresh token nếu hết hạn (401)
- Retry request sau khi refresh token

---

## 12. Quy Trình Phát Triển (Development Workflow)

1. **Backend:** Chạy `python -m uvicorn app.main:app --reload` — hot reload khi sửa file
2. **Frontend:** Chạy `npm run dev` — hot reload khi sửa file React/Next.js
3. **Tests:** Chạy `npm run test` ở frontend trước khi commit
4. **Commit:** Đảm bảo tất cả tests pass

---

## 13. Liên Hệ & Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra lại các bước setup
2. Xem logs của backend/frontend
3. Kiểm tra Docker containers có chạy không
4. Xóa cache và cài lại dependencies

---

**Chúc bạn chạy thành công! 🚀**
