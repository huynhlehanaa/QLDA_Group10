# Backend KPI Nội Bộ - Hướng Dẫn

## Giới thiệu

Backend của ứng dụng KPI Nội Bộ được xây dựng với:
- **FastAPI**: Framework async Python cho API
- **SQLAlchemy**: ORM cho database
- **PostgreSQL**: Database chính
- **SQLite**: Database test
- **Redis**: Cache & session management
- **Celery**: Task queue (async jobs)
- **JWT**: Authentication


## Setup & Installation

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 14+ (production)
- Redis 6+ (cache & session)
- Git

### 2. Clone & Navigate
```bash
git clone <repo_url>
cd backend
```

### 3. Create Virtual Environment
```bash
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Setup Environment Variables

Tạo file `.env` trong thư mục `backend/`:
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/kpi_db

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT Secret
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email Service
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
APP_URL=http://localhost:3000

# API Config
DEBUG=True
```

### 6. Initialize Database
```bash
# Apply migrations
alembic upgrade head

# Seed test data (optional)
python seed.py
```

## Running the Application

### Development Mode
```bash
# Start FastAPI development server with hot-reload
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server sẽ chạy ở: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Using Python -m
```bash
python -m uvicorn app.main:app --reload
```

## Running Tests

### Run All Tests
```bash
# Using python -m pytest (recommended)
python -m pytest tests/tests -q

# Or directly
pytest tests/tests -q
```

### Run Specific Test File
```bash
python -m pytest tests/tests/test_auth.py -q
```

### Run Specific Test Case
```bash
python -m pytest tests/tests/test_auth.py::TestAccountLockout -q
```

### Run With Coverage
```bash
python -m pytest tests/tests --cov=app --cov-report=html
```

### Test Output Indicators
- `.` = Test passed
- `F` = Test failed (assertion error)
- `E` = Test error (exception during setup/execution)

### Example: All Tests Pass
```
...................................................................................................... [ 75%]
.................................                                                                      [100%]
135 passed, 1 warning in 81.87s
```

## Key Features & Implementation

### 1. Authentication (PB001-PB015)

**Files:**
- [app/services/auth_service.py](app/services/auth_service.py)
- [app/api/auth.py](app/api/auth.py)
- [app/core/security.py](app/core/security.py)

**Features:**
- Login với email/password
- Khóa tài khoản sau 5 lần sai (15 phút)
- JWT access token (30 phút) + refresh token (7 ngày)
- Logout - single device & all devices
- Reset mật khẩu qua email
- Change password khi đang đăng nhập
- 2FA OTP (6 số, gửi email)
- Login log (track thành công & thất bại)
- Password strength validation (8 ký tự, chữ hoa, số, ký tự đặc biệt)

**Fix Applied:**
- Timezone-aware datetime comparison (SQLite naive → UTC conversion)
- JWT tokens have unique `jti` claim (no duplicate if generated within same second)
- Invalid token returns 401 (not 403) per HTTP standard

### 2. User Management (PB022-PB048)
- CEO tạo manager
- Manager tạo staff
- Update/deactivate users
- Import staff from Excel
- Profile management (avatar, phone)

### 3. Organization & Department
- CEO quản lý organization
- Department management & staff assignment
- Manager hierarchy tracking

### 4. KPI Management
- Create/update KPI targets
- Track KPI performance
- Real-time notifications (WebSocket)

### 5. Task Management
- Assign tasks
- Track progress
- Deadline reminders (Celery background jobs)

## Database Models

### Key Tables
- **USERS**: User accounts with roles (ceo, manager, staff)
- **ORGANIZATIONS**: Company/organization
- **DEPARTMENTS**: Departments with manager assignment
- **LOGIN_LOGS**: Audit trail of login attempts
- **KPIS**: KPI definitions & targets
- **TASKS**: Task assignments
- **NOTIFICATIONS**: User notifications

### Schema Notes
- Circular foreign keys: `USERS.dept_id ↔ DEPARTMENTS.manager_id`
  - Fixed with `use_alter=True` on `Department.manager_id`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout current device
- `POST /api/v1/auth/logout-all` - Logout all devices
- `POST /api/v1/auth/forgot-password` - Reset password email
- `POST /api/v1/auth/reset-password` - Complete password reset
- `POST /api/v1/auth/change-password` - Change password while logged in
- `POST /api/v1/auth/otp/send` - Send OTP for 2FA
- `POST /api/v1/auth/otp/verify` - Verify OTP

### Users
- `GET /api/v1/users/me` - Get current user profile
- `POST /api/v1/users/managers` - Create manager (CEO only)
- `GET /api/v1/users/managers` - List managers
- `POST /api/v1/users/staff` - Create staff (Manager only)
- `GET /api/v1/users/staff` - List staff in department

### Organizations
- `GET /api/v1/organizations/me` - Get org chart
- `POST /api/v1/departments` - Create department
- `GET /api/v1/departments` - List departments

### KPI
- `POST /api/v1/kpi` - Create KPI
- `GET /api/v1/kpi` - List KPIs
- `PUT /api/v1/kpi/{id}` - Update KPI

### Logs
- `GET /api/v1/logs/login` - View login logs (CEO only)

## Common Issues & Solutions

### 1. `ModuleNotFoundError: No module named 'app'`
**Cause:** Running pytest with wrong Python interpreter (e.g., Anaconda instead of venv)

**Solution:**
```bash
# Use python -m pytest with venv Python
python -m pytest tests/tests -q
```

### 2. `ModuleNotFoundError: No module named 'fastapi'`
**Cause:** Using system pytest instead of venv pytest

**Solution:**
```bash
# Activate venv first
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Then run tests
python -m pytest tests/tests -q
```

### 3. `SAWarning: Can't sort tables for DROP`
**Cause:** Circular foreign key between USERS and DEPARTMENTS

**Status:** ⚠️ Warning only (doesn't affect test results)

**Solution:** Already fixed with `use_alter=True` on `Department.manager_id`

### 4. `ConnectionError: Redis connection failed`
**Cause:** Redis not running

**Solution:**
```bash
# Start Redis
redis-server

# Or via Docker
docker run -d -p 6379:6379 redis:latest
```

### 5. Port already in use (8000)
**Solution:**
```bash
python -m uvicorn app.main:app --port 8001
```

## Docker Development

### Start All Services
```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- API server (port 8000)

### View Logs
```bash
docker-compose logs -f api
```

### Stop Services
```bash
docker-compose down
```

## Testing Strategy

### Test Organization
- **Unit Tests**: Service layer logic
- **Integration Tests**: API endpoints with real DB
- **Fixtures**: Shared test users, orgs, departments in [tests/tests/conftest.py](tests/tests/conftest.py)

### Running Example
```bash
# All auth tests
python -m pytest tests/tests/test_auth.py -v

# Single test class
python -m pytest tests/tests/test_auth.py::TestAccountLockout -v

# Single test method
python -m pytest tests/tests/test_auth.py::TestAccountLockout::test_pb003_lock_after_5_failures -v
```

## Code Standards

### Naming Conventions
- **Services**: `*_service.py` (e.g., `auth_service.py`)
- **Models**: Singular + no underscore (e.g., `User`, `LoginLog`)
- **Schemas**: Same as models (e.g., `UserSchema`, `UserCreate`)
- **API Routes**: `/api/v1/<resource>`
- **Database Tables**: UPPERCASE (e.g., `USERS`, `LOGIN_LOGS`)

### File Organization
- Business logic → `services/`
- Database queries → Models with relationships
- Request/response validation → `schemas/`
- API route definitions → `api/`
- Security functions → `core/security.py`

## Debugging

### Enable Debug Mode
```bash
# In .env
DEBUG=True

# View more detailed error responses
```

### Database Debugging
```python
# In any service file
import logging
logging.basicConfig(level=logging.DEBUG)

# SQLAlchemy queries will be logged
```

### Test Debugging
```bash
# Run with verbose output
python -m pytest tests/tests -vv

# Stop at first failure
python -m pytest tests/tests -x

# Show print statements
python -m pytest tests/tests -s
```

## Performance Tips

### Query Optimization
- Use relationships with `lazy="select"` or `lazy="joined"`
- Avoid N+1 queries
- Add database indexes for frequently filtered columns

### Caching
- Use Redis for session data, OTP, refresh tokens
- Set appropriate TTL for cached data

### Background Jobs
- Use Celery for long-running tasks
- Email sending, report generation, etc.

## Security Notes

- Passwords hashed with bcrypt
- JWT tokens with expiration
- CORS properly configured
- SQL injection prevention (SQLAlchemy ORM)
- Rate limiting on OTP resend (60s cooldown)
- Account lockout after 5 failed logins
- Login audit trail

## Deployment

### Build Docker Image
```bash
docker build -t kpi-backend .
```

### Run Container
```bash
docker run -p 8000:8000 \
  -e DATABASE_URL=... \
  -e REDIS_URL=... \
  -e SECRET_KEY=... \
  kpi-backend
```

## Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make changes & add tests
3. Run tests: `python -m pytest tests/tests -q`
4. Commit: `git commit -m "Add your feature"`
5. Push: `git push origin feature/your-feature`

