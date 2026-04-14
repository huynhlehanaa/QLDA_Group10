# Huong dan chay du an tren may moi

Tai lieu nay bao phu cac lenh can chay sau khi pull code ve may khac.

## 1) Yeu cau truoc khi setup

- Git
- Python 3.12
- Node.js 18+ va npm
- Docker Desktop (de chay PostgreSQL va Redis)

## 2) Clone source

```powershell
git clone <repo_url>
cd code
```

## 3) Khoi dong database va redis

```powershell
cd backend
docker compose up -d db redis
docker compose ps
```

Muc tieu: thay `db` va `redis` o trang thai `Up`.

## 4) Cau hinh backend

### 4.1 Tao virtual environment va cai package

```powershell
cd backend
py -3.12 -m venv ..\venv
..\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4.2 Kiem tra file `.env`

Dam bao `backend/.env` co cac gia tri local sau (toi thieu):

```env
DATABASE_URL=postgresql://admin:secret123@localhost:5432/kpi_system
REDIS_URL=redis://localhost:6379
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
```

## 5) Khoi tao du lieu mau

```powershell
cd backend
..\venv\Scripts\Activate.ps1
py -3.12 seed.py
```

Tai khoan mau sau khi seed:

- Email: `ceo@company.com`
- Password: `Admin@123456`

## 6) Chay backend

```powershell
cd backend
..\venv\Scripts\Activate.ps1
py -3.12 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API:

- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 7) Chay frontend

Mo terminal moi:

```powershell
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

## 8) Lenh kiem tra nhanh

### 8.1 Kiem tra login API

```powershell
$body = @{ email = 'ceo@company.com'; password = 'Admin@123456' } | ConvertTo-Json
Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $body -UseBasicParsing
```

### 8.2 Chay test frontend

```powershell
cd frontend
npm test
```

### 8.3 Build frontend

```powershell
cd frontend
npm run build
```

## 9) Loi thuong gap

### 9.1 `Error 10061 connecting to localhost:6379`

Redis chua chay:

```powershell
cd backend
docker compose up -d redis
```

### 9.2 `password authentication failed for user "admin"`

Sai mat khau DB trong `backend/.env`.
Can dung:

```env
DATABASE_URL=postgresql://admin:secret123@localhost:5432/kpi_system
```

### 9.3 `relation "USERS" does not exist`

DB moi chua co bang. Chay lai:

```powershell
cd backend
py -3.12 seed.py
```

## 10) Quy trinh tat he thong

- Dung backend/frontend bang `Ctrl + C` o moi terminal.
- Neu can tat DB/Redis:

```powershell
cd backend
docker compose stop
```
