from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, users, organizations, logs
from app.api import tasks   # Sprint 2
from app.api import kpi     # Sprint 3 - KPI Management
from app.api import dashboard
from app.api import pwa

app = FastAPI(
    title="KPI Nội Bộ API",
    description="Hệ thống quản lý KPI nội bộ doanh nghiệp",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sprint 1
app.include_router(auth.router,          prefix="/api/v1")
app.include_router(users.router,         prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(logs.router,          prefix="/api/v1")

# Sprint 2
app.include_router(tasks.router,         prefix="/api/v1")

# Sprint 3
app.include_router(kpi.router,           prefix="/api/v1")
app.include_router(dashboard.router,     prefix="/api/v1")
app.include_router(pwa.router,           prefix="/api/v1")

@app.get("/")
def root():
    return {"status": "ok", "message": "KPI API v2.0 đang chạy"}


@app.get("/health")
def health():
    return {"status": "healthy"}
