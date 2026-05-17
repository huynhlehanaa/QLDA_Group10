"""
Settings Service — PB208 đến PB217
"""
import re
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.settings import UserSetting
from app.models.user import User

VALID_DAYS = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
SUPPORTED_LANGS = {"vi", "en"}
TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


# ── Company Branding ──────────────────────────────────────────

def get_company_info(org_id: UUID, db: Session) -> dict:
    """PB208: lấy thông tin công ty"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Không tìm thấy tổ chức")
    return {
        "name": org.name,
        "logo_url": org.logo_url,
        "work_days": org.work_days,
        "work_start": org.work_start,
        "work_end": org.work_end,
    }


def update_company_info(org_id: UUID, name: Optional[str],
                        logo_url: Optional[str], db: Session) -> dict:
    """PB208: CEO cập nhật tên và logo công ty"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Không tìm thấy tổ chức")

    if name is not None:
        if not name.strip():
            raise HTTPException(status_code=422, detail="Tên công ty không được để trống")
        org.name = name.strip()

    if logo_url is not None:
        org.logo_url = logo_url

    db.commit()
    db.refresh(org)
    return {"name": org.name, "logo_url": org.logo_url}


# ── Work Schedule ─────────────────────────────────────────────

def get_work_schedule(org_id: UUID, db: Session) -> dict:
    """PB209, PB210: lấy lịch làm việc"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Không tìm thấy tổ chức")
    return {
        "work_days": org.work_days or ["mon", "tue", "wed", "thu", "fri"],
        "work_start": org.work_start or "08:00",
        "work_end": org.work_end or "17:30",
    }


def update_work_schedule(org_id: UUID,
                         work_days: Optional[list],
                         work_start: Optional[str],
                         work_end: Optional[str],
                         db: Session) -> dict:
    """PB209, PB210: cập nhật lịch làm việc"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Không tìm thấy tổ chức")

    if work_days is not None:
        if not work_days:
            raise HTTPException(status_code=422, detail="Phải có ít nhất 1 ngày làm việc")
        invalid = [d for d in work_days if d not in VALID_DAYS]
        if invalid:
            raise HTTPException(
                status_code=422,
                detail=f"Ngày không hợp lệ: {invalid}. Dùng: mon,tue,wed,thu,fri,sat,sun",
            )
        org.work_days = work_days

    # Lấy giá trị hiện tại để validate
    current_start = work_start or org.work_start or "08:00"
    current_end = work_end or org.work_end or "17:30"

    if work_start is not None:
        if not TIME_RE.match(work_start):
            raise HTTPException(status_code=422,
                                detail="Định dạng giờ phải là HH:MM (VD: 08:00)")
        current_start = work_start

    if work_end is not None:
        if not TIME_RE.match(work_end):
            raise HTTPException(status_code=422,
                                detail="Định dạng giờ phải là HH:MM (VD: 17:30)")
        current_end = work_end

    if current_start >= current_end:
        raise HTTPException(status_code=422,
                            detail="Giờ kết thúc phải sau giờ bắt đầu")

    if work_start is not None:
        org.work_start = work_start
    if work_end is not None:
        org.work_end = work_end

    db.commit()
    db.refresh(org)
    return {
        "work_days": org.work_days,
        "work_start": org.work_start,
        "work_end": org.work_end,
    }


def is_working_time(org_id: UUID, db: Session) -> dict:
    """PB210: kiểm tra thời điểm hiện tại có trong giờ làm việc không"""
    from datetime import datetime, timezone

    schedule = get_work_schedule(org_id, db)
    now = datetime.now(timezone.utc)

    weekday_map = {0: "mon", 1: "tue", 2: "wed", 3: "thu",
                   4: "fri", 5: "sat", 6: "sun"}
    today = weekday_map[now.weekday()]

    if today not in schedule["work_days"]:
        return {"is_working_time": False, "reason": "Ngoài ngày làm việc"}

    current_time = now.strftime("%H:%M")
    if schedule["work_start"] <= current_time <= schedule["work_end"]:
        return {"is_working_time": True}
    return {"is_working_time": False, "reason": "Ngoài giờ làm việc"}


# ── Language Settings ─────────────────────────────────────────

def get_language(user_id: UUID, db: Session) -> dict:
    """PB211: lấy ngôn ngữ của user"""
    setting = db.query(UserSetting).filter(
        UserSetting.user_id == user_id
    ).first()
    return {"language": setting.language if setting else "vi"}


def set_language(user_id: UUID, language: str, db: Session) -> dict:
    """PB211: cập nhật ngôn ngữ"""
    if language not in SUPPORTED_LANGS:
        raise HTTPException(
            status_code=422,
            detail=f"Ngôn ngữ không hỗ trợ. Chọn: {', '.join(SUPPORTED_LANGS)}",
        )
    setting = db.query(UserSetting).filter(
        UserSetting.user_id == user_id
    ).first()
    if setting:
        setting.language = language
    else:
        setting = UserSetting(user_id=user_id, language=language)
        db.add(setting)
    db.commit()
    return {"language": language}


# ── Help Center ───────────────────────────────────────────────

_HELP_ARTICLES = {
    "staff": [
        {
            "id": "staff-001",
            "title": "Cách đăng nhập lần đầu và đổi mật khẩu",
            "category": "Bắt đầu",
            "content_url": "/help/staff/getting-started",
            "tags": ["đăng nhập", "mật khẩu", "bảo mật"],
        },
        {
            "id": "staff-002",
            "title": "Xem và cập nhật tiến độ task",
            "category": "Quản lý Task",
            "content_url": "/help/staff/tasks",
            "tags": ["task", "tiến độ", "checklist"],
        },
        {
            "id": "staff-003",
            "title": "Xem điểm KPI của mình",
            "category": "KPI",
            "content_url": "/help/staff/kpi",
            "tags": ["kpi", "điểm", "đánh giá"],
        },
        {
            "id": "staff-004",
            "title": "Cài đặt PWA trên điện thoại",
            "category": "Mobile",
            "content_url": "/help/staff/pwa",
            "tags": ["pwa", "mobile", "cài đặt"],
        },
        {
            "id": "staff-005",
            "title": "Gửi khiếu nại KPI",
            "category": "KPI",
            "content_url": "/help/staff/kpi-appeal",
            "tags": ["kpi", "khiếu nại"],
        },
    ],
    "manager": [
        {
            "id": "mgr-001",
            "title": "Tạo và giao task cho nhân viên",
            "category": "Quản lý Task",
            "content_url": "/help/manager/create-task",
            "tags": ["task", "giao việc", "nhân viên"],
        },
        {
            "id": "mgr-002",
            "title": "Xem báo cáo hiệu suất phòng ban",
            "category": "Báo cáo",
            "content_url": "/help/manager/reports",
            "tags": ["báo cáo", "hiệu suất", "dashboard"],
        },
        {
            "id": "mgr-003",
            "title": "Cấu hình tiêu chí KPI phòng ban",
            "category": "KPI",
            "content_url": "/help/manager/kpi-setup",
            "tags": ["kpi", "tiêu chí", "cấu hình"],
        },
        {
            "id": "mgr-004",
            "title": "Quản lý tài khoản nhân viên",
            "category": "Quản lý người dùng",
            "content_url": "/help/manager/users",
            "tags": ["tài khoản", "nhân viên", "reset mật khẩu"],
        },
        {
            "id": "mgr-005",
            "title": "Xem Kanban và Gantt Chart",
            "category": "Dashboard",
            "content_url": "/help/manager/kanban",
            "tags": ["kanban", "gantt", "tiến độ"],
        },
    ],
    "ceo": [
        {
            "id": "ceo-001",
            "title": "Cài đặt KPI toàn công ty",
            "category": "KPI",
            "content_url": "/help/ceo/kpi-config",
            "tags": ["kpi", "cấu hình", "trọng số"],
        },
        {
            "id": "ceo-002",
            "title": "Xem Dashboard CEO",
            "category": "Dashboard",
            "content_url": "/help/ceo/dashboard",
            "tags": ["dashboard", "tổng quan", "thống kê"],
        },
        {
            "id": "ceo-003",
            "title": "Chốt điểm KPI tháng",
            "category": "KPI",
            "content_url": "/help/ceo/kpi-finalize",
            "tags": ["kpi", "chốt điểm", "tháng"],
        },
        {
            "id": "ceo-004",
            "title": "Cài đặt thông tin và lịch làm việc công ty",
            "category": "Cài đặt",
            "content_url": "/help/ceo/company-settings",
            "tags": ["cài đặt", "công ty", "lịch làm việc"],
        },
        {
            "id": "ceo-005",
            "title": "Quản lý Manager và phòng ban",
            "category": "Quản lý tổ chức",
            "content_url": "/help/ceo/org-management",
            "tags": ["manager", "phòng ban", "tổ chức"],
        },
    ],
}


def get_help_articles(role: str, search: Optional[str] = None) -> dict:
    """PB212: hướng dẫn theo vai trò"""
    articles = _HELP_ARTICLES.get(role, _HELP_ARTICLES["staff"])

    if search:
        search_lower = search.lower()
        articles = [
            a for a in articles
            if search_lower in a["title"].lower()
            or search_lower in a["category"].lower()
            or any(search_lower in tag for tag in a.get("tags", []))
        ]

    return {"role": role, "articles": articles, "total": len(articles)}


# ── Dangerous Actions ─────────────────────────────────────────

_DANGEROUS_ACTIONS = [
    {
        "action_type": "deactivate_user",
        "label": "Vô hiệu hóa tài khoản",
        "confirmation_message": "Bạn có chắc muốn vô hiệu hóa tài khoản này không? Người dùng sẽ bị đăng xuất ngay lập tức và không thể đăng nhập.",
        "cannot_undo": True,
    },
    {
        "action_type": "delete_department",
        "label": "Xóa phòng ban",
        "confirmation_message": "Bạn có chắc muốn xóa phòng ban này không? Hành động này không thể hoàn tác.",
        "cannot_undo": True,
    },
    {
        "action_type": "cancel_task",
        "label": "Hủy task",
        "confirmation_message": "Bạn có chắc muốn hủy task này không? Task đã hủy không thể khôi phục.",
        "cannot_undo": True,
    },
    {
        "action_type": "finalize_kpi",
        "label": "Chốt điểm KPI",
        "confirmation_message": "Bạn có chắc muốn chốt điểm KPI tháng này không? Sau khi chốt, điểm sẽ không thể chỉnh sửa trừ khi mở khóa.",
        "cannot_undo": False,
    },
    {
        "action_type": "reset_password",
        "label": "Reset mật khẩu",
        "confirmation_message": "Bạn có chắc muốn reset mật khẩu cho người dùng này không? Mật khẩu mới sẽ được gửi qua email.",
        "cannot_undo": True,
    },
]


def get_dangerous_actions() -> dict:
    """PB213: danh sách hành động cần xác nhận"""
    return {"actions": _DANGEROUS_ACTIONS}


# ── Breadcrumb ────────────────────────────────────────────────

_BREADCRUMB_MAP = {
    "/dashboard": [
        {"label": "Dashboard", "url": "/dashboard"},
    ],
    "/tasks": [
        {"label": "Dashboard", "url": "/dashboard"},
        {"label": "Quản lý Task", "url": "/tasks"},
    ],
    "/kpi/me": [
        {"label": "Dashboard", "url": "/dashboard"},
        {"label": "KPI của tôi", "url": "/kpi/me"},
    ],
    "/kpi": [
        {"label": "Dashboard", "url": "/dashboard"},
        {"label": "KPI", "url": "/kpi"},
    ],
    "/users": [
        {"label": "Dashboard", "url": "/dashboard"},
        {"label": "Quản lý người dùng", "url": "/users"},
    ],
    "/settings": [
        {"label": "Dashboard", "url": "/dashboard"},
        {"label": "Cài đặt", "url": "/settings"},
    ],
    "/reports": [
        {"label": "Dashboard", "url": "/dashboard"},
        {"label": "Báo cáo", "url": "/reports"},
    ],
    "/notifications": [
        {"label": "Dashboard", "url": "/dashboard"},
        {"label": "Thông báo", "url": "/notifications"},
    ],
}


def get_breadcrumb(path: str) -> dict:
    """PB214: tạo breadcrumb từ path"""
    # Tìm prefix dài nhất khớp
    path_clean = path.rstrip("/")

    # Tìm match chính xác
    if path_clean in _BREADCRUMB_MAP:
        return {"path": path, "breadcrumbs": _BREADCRUMB_MAP[path_clean]}

    # Tìm match theo prefix: /tasks/123 → /tasks
    for prefix in sorted(_BREADCRUMB_MAP.keys(), key=len, reverse=True):
        if path_clean.startswith(prefix + "/") or path_clean == prefix:
            crumbs = list(_BREADCRUMB_MAP[prefix])
            # Thêm item cuối với path đầy đủ
            parts = path_clean.replace(prefix, "").strip("/").split("/")
            for part in parts:
                if part:
                    crumbs.append({"label": f"#{part}", "url": f"{prefix}/{part}"})
            return {"path": path, "breadcrumbs": crumbs}

    # Fallback: Dashboard
    return {
        "path": path,
        "breadcrumbs": [{"label": "Dashboard", "url": "/dashboard"}],
    }