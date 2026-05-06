from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.dependencies import get_current_user, require_manager
from app.db import get_db
from app.models.user import User
from app.schemas.task import (
    ChecklistCreate, ChecklistUpdate,
    CommentCreate,
    ExtensionRequestCreate, ExtensionReview,
    EpicCreate,
    TaskCreate, TaskUpdate, TaskStatusUpdate, TaskProgressUpdate,
    TaskCancelRequest, TaskFilterParams,
)
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ── Epic ──────────────────────────────────────────────────────

@router.post("/epics", status_code=status.HTTP_201_CREATED)
def create_epic(
    body: EpicCreate,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB077: tạo Epic/Dự án"""
    return task_service.create_epic(body.name, current_user.dept_id, current_user, db)


@router.get("/epics")
def list_epics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB077, PB078: danh sách Epic kèm tiến độ"""
    dept_id = current_user.dept_id
    return task_service.list_epics(dept_id, db)


# ── Task CRUD ─────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """PB062-PB070, PB073-PB077"""
    task = task_service.create_task(body, current_user, db)

    # PB103: trả warning header nếu có assignee quá tải
    overloaded = []
    for uid in body.assignee_ids:
        from app.models.task import TaskAssignee, Task as TaskModel
        count = db.query(TaskAssignee).join(TaskModel).filter(
            TaskAssignee.user_id == uid,
            TaskModel.status == "in_progress",
        ).count()
        if count >= 10:
            u = db.query(User).filter(User.id == uid).first()
            if u:
                overloaded.append(u.full_name)

    response_data = {"id": str(task.id), "title": task.title, "status": task.status}
    if overloaded:
        response_data["warning"] = f"Nhân viên đang quá tải: {', '.join(overloaded)}"

    return response_data


@router.get("")
def list_tasks(
    search: Optional[str]      = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str]    = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    deadline_from: Optional[datetime] = Query(None),
    deadline_to: Optional[datetime]   = Query(None),
    overdue_only: bool          = Query(False),
    sort_by: str                = Query("deadline"),
    sort_dir: str               = Query("asc"),
    current_user: User          = Depends(get_current_user),
    db: Session                 = Depends(get_db),
):
    """PB079, PB080, PB105, PB108-PB115"""
    filters = TaskFilterParams(
        search=search, status=status_filter, priority=priority,
        assignee_id=assignee_id, deadline_from=deadline_from, deadline_to=deadline_to,
        overdue_only=overdue_only, sort_by=sort_by, sort_dir=sort_dir,
    )
    return task_service.list_tasks(current_user, db, filters)


@router.get("/kanban")
def get_kanban(
    search: Optional[str]       = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    priority: Optional[str]     = Query(None),
    current_user: User          = Depends(get_current_user),
    db: Session                 = Depends(get_db),
):
    """PB081, PB082: Kanban 3 cột với số đếm"""
    filters = TaskFilterParams(search=search, assignee_id=assignee_id, priority=priority)
    return task_service.get_kanban(current_user, db, filters)


@router.get("/workload")
def get_workload(
    current_user: User = Depends(require_manager),
    db: Session        = Depends(get_db),
):
    """PB101, PB102: tổng workload theo nhân viên"""
    return task_service.get_workload(current_user.dept_id, current_user, db)


@router.get("/stats")
def get_stats(
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime]   = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB117, PB118"""
    return task_service.get_task_stats(current_user, db, from_date, to_date)


@router.get("/export")
def export_excel(
    status_filter: Optional[str] = Query(None, alias="status"),
    assignee_id: Optional[UUID]  = Query(None),
    current_user: User = Depends(require_manager),
    db: Session        = Depends(get_db),
):
    """PB119: xuất Excel"""
    filters = TaskFilterParams(status=status_filter, assignee_id=assignee_id)
    content = task_service.export_tasks_excel(current_user, db, filters)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=tasks.xlsx"},
    )


@router.get("/me")
def get_my_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str]     = Query(None),
    overdue_only: bool          = Query(False),
    sort_by: str                = Query("deadline"),
    sort_dir: str               = Query("asc"),
    current_user: User          = Depends(get_current_user),
    db: Session                 = Depends(get_db),
):
    """
    Trả về task của nhân viên đang đăng nhập kèm thống kê tổng hợp.
    Staff dùng màn hình cá nhân, Manager/CEO dùng để xem task do mình tạo.
    """
    from app.services.task_service import list_tasks, get_task_stats
    filters = TaskFilterParams(
        status=status_filter,
        priority=priority,
        overdue_only=overdue_only,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    tasks = list_tasks(current_user, db, filters)
    stats = get_task_stats(current_user, db)
    return {
        "user_id": str(current_user.id),
        "full_name": current_user.full_name,
        "avatar_url": current_user.avatar_url,
        "stats": stats,
        "tasks": tasks,
    }


@router.get("/staff/{staff_id}")
def get_staff_tasks(
    staff_id: UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str]     = Query(None),
    overdue_only: bool          = Query(False),
    current_user: User          = Depends(get_current_user),
    db: Session                 = Depends(get_db),
):
    """Manager xem task của một nhân viên cụ thể trong phòng ban."""
    filters = TaskFilterParams(
        status=status_filter,
        priority=priority,
        overdue_only=overdue_only,
    )
    return task_service.get_staff_tasks(staff_id, current_user, db, filters)


@router.get("/{task_id}")
def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB083: xem chi tiết task"""
    return task_service.get_task(task_id, current_user, db)


@router.patch("/{task_id}")
def update_task(
    task_id: UUID,
    body: TaskUpdate,
    current_user: User = Depends(require_manager),
    db: Session        = Depends(get_db),
):
    """PB094, PB095, PB096"""
    return task_service.update_task(task_id, body, current_user, db)


@router.patch("/{task_id}/status")
def update_status(
    task_id: UUID,
    body: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB084, PB086"""
    return task_service.update_status(task_id, body.status, body.progress_pct, current_user, db)


@router.patch("/{task_id}/progress")
def update_progress(
    task_id: UUID,
    body: TaskProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB085: cập nhật % hoàn thành"""
    return task_service.update_status(task_id, None, body.progress_pct, current_user, db)


@router.post("/{task_id}/cancel")
def cancel_task(
    task_id: UUID,
    body: TaskCancelRequest,
    current_user: User = Depends(require_manager),
    db: Session        = Depends(get_db),
):
    """PB097"""
    return task_service.cancel_task(task_id, body.reason, current_user, db)


@router.patch("/{task_id}/stop-recurring")
def stop_recurring(
    task_id: UUID,
    current_user: User = Depends(require_manager),
    db: Session        = Depends(get_db),
):
    """PB076"""
    return task_service.stop_recurring(task_id, current_user, db)


# ── Comments ──────────────────────────────────────────────────

@router.post("/{task_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(
    task_id: UUID,
    body: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB087, PB088, PB091"""
    comment = task_service.add_comment(task_id, body, current_user, db)
    u = current_user
    return {
        "id": comment.id, "task_id": comment.task_id, "user_id": comment.user_id,
        "full_name": u.full_name, "avatar_url": u.avatar_url,
        "parent_id": comment.parent_id, "content": comment.content,
        "created_at": comment.created_at, "replies": [],
    }


@router.get("/{task_id}/comments")
def list_comments(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB090: Manager xem ghi chú"""
    return task_service.list_comments(task_id, db)


# ── Attachments ───────────────────────────────────────────────

@router.post("/{task_id}/attachments", status_code=status.HTTP_201_CREATED)
def add_attachment(
    task_id: UUID,
    file_url: str,
    file_name: str,
    file_size: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB069, PB089"""
    return task_service.add_attachment(task_id, file_url, file_name, file_size, current_user, db)


@router.delete("/attachments/{att_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    att_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    task_service.delete_attachment(att_id, current_user, db)


# ── Checklist ─────────────────────────────────────────────────

@router.post("/{task_id}/checklists", status_code=status.HTTP_201_CREATED)
def add_checklist(
    task_id: UUID,
    body: ChecklistCreate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB071"""
    return task_service.add_checklist(task_id, body, current_user, db)


@router.patch("/checklists/{item_id}")
def update_checklist(
    item_id: UUID,
    body: ChecklistUpdate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB071, PB072"""
    return task_service.update_checklist(item_id, body, current_user, db)


@router.delete("/checklists/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    task_service.delete_checklist(item_id, current_user, db)


# ── Deadline extension ────────────────────────────────────────

@router.post("/{task_id}/extension-requests", status_code=status.HTTP_201_CREATED)
def request_extension(
    task_id: UUID,
    body: ExtensionRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    """PB099"""
    return task_service.request_extension(task_id, body, current_user, db)


@router.patch("/extension-requests/{req_id}/review")
def review_extension(
    req_id: UUID,
    body: ExtensionReview,
    current_user: User = Depends(require_manager),
    db: Session        = Depends(get_db),
):
    """PB100"""
    return task_service.review_extension(req_id, body, current_user, db)
