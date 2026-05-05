from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, users, organizations, logs

app = FastAPI(
    title="KPI Nội Bộ API",
    description="Hệ thống quản lý KPI nội bộ doanh nghiệp",
    version="1.0.0",
)

# CORS cho Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký tất cả routers
# Sprint 1
app.include_router(auth.router,          prefix="/api/v1")
app.include_router(users.router,         prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(logs.router,          prefix="/api/v1")


@app.get("/")
def root():
    return {"status": "ok", "message": "KPI API v1.0 đang chạy"}


@app.get("/health")
def health():
    return {"status": "healthy"}
