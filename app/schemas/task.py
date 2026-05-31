from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, field_validator


# ── Epic ──────────────────────────────────────────────────────

class EpicCreate(BaseModel):
    name: str

class EpicResponse(BaseModel):
    id: UUID
    name: str
    dept_id: UUID
    task_count: int = 0
    done_count: int = 0
    progress_pct: float = 0.0
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Task create / update ───────────────────────────────────────

class TaskCreate(BaseModel):
    """PB062-PB070"""
    title: str
    description: Optional[str] = None
    assignee_ids: list[UUID] = []          # PB065
    deadline: Optional[datetime] = None    # PB066
    priority: str = "medium"               # PB067 low|medium|high
    epic_id: Optional[UUID] = None         # PB077
    blocked_by_id: Optional[UUID] = None   # PB070
    is_recurring: bool = False
    recur_pattern: Optional[str] = None    # daily|weekly|monthly
    recur_day: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):            # PB063
        if not v or not v.strip():
            raise ValueError("Tiêu đề task không được để trống")
        return v.strip()

    @field_validator("priority")
    @classmethod
    def valid_priority(cls, v):
        if v not in ("low", "medium", "high"):
            raise ValueError("Độ ưu tiên phải là low / medium / high")
        return v

    @field_validator("deadline")
    @classmethod
    def deadline_not_past(cls, v):          # PB066
        if v and v < datetime.now(v.tzinfo):
            raise ValueError("Deadline không được trong quá khứ")
        return v


class TaskUpdate(BaseModel):
    """PB094, PB095, PB096"""
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    assignee_ids: Optional[list[UUID]] = None
    deadline_change_reason: Optional[str] = None  # PB095


class TaskStatusUpdate(BaseModel):
    """PB084, PB085, PB086"""
    status: str
    progress_pct: Optional[int] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        if v not in ("todo", "in_progress", "done", "cancelled"):
            raise ValueError("Trạng thái không hợp lệ")
        return v


class TaskProgressUpdate(BaseModel):
    """PB085: cập nhật % hoàn thành"""
    progress_pct: int

    @field_validator("progress_pct")
    @classmethod
    def valid_pct(cls, v):
        if not 0 <= v <= 100:
            raise ValueError("Phần trăm phải từ 0 đến 100")
        return v


class TaskCancelRequest(BaseModel):
    """PB097"""
    reason: str


# ── Assignee info ─────────────────────────────────────────────

class AssigneeInfo(BaseModel):
    user_id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Checklist ─────────────────────────────────────────────────

class ChecklistCreate(BaseModel):
    content: str
    position: int = 0

class ChecklistUpdate(BaseModel):
    is_done: Optional[bool] = None
    content: Optional[str] = None

class ChecklistResponse(BaseModel):
    id: UUID
    content: str
    is_done: bool
    position: int
    model_config = {"from_attributes": True}


# ── Comment ───────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[UUID] = None   # PB091: reply

class CommentResponse(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    parent_id: Optional[UUID] = None
    content: str
    created_at: datetime
    replies: list["CommentResponse"] = []
    model_config = {"from_attributes": True}

CommentResponse.model_rebuild()


# ── Attachment ────────────────────────────────────────────────

class AttachmentResponse(BaseModel):
    id: UUID
    file_url: str
    file_name: Optional[str]
    file_size: Optional[int]
    uploaded_by: UUID
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Task response ─────────────────────────────────────────────

class TaskResponse(BaseModel):
    id: UUID
    dept_id: UUID
    created_by: UUID
    epic_id: Optional[UUID] = None
    blocked_by_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    progress_pct: int
    deadline: Optional[datetime] = None
    is_recurring: bool
    recur_pattern: Optional[str] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    last_updated_at: Optional[datetime] = None
    created_at: datetime

    assignees: list[AssigneeInfo] = []
    checklists: list[ChecklistResponse] = []
    checklist_total: int = 0
    checklist_done: int = 0
    is_overdue: bool = False

    model_config = {"from_attributes": True}


class TaskListItem(BaseModel):
    """Dùng trong list view và Kanban — gọn hơn TaskResponse"""
    id: UUID
    title: str
    status: str
    priority: str
    progress_pct: int
    deadline: Optional[datetime] = None
    is_overdue: bool = False
    assignees: list[AssigneeInfo] = []
    checklist_total: int = 0
    checklist_done: int = 0
    epic_id: Optional[UUID] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Kanban ────────────────────────────────────────────────────

class KanbanColumn(BaseModel):
    """PB081, PB082"""
    status: str
    count: int
    tasks: list[TaskListItem]


class KanbanResponse(BaseModel):
    todo: KanbanColumn
    in_progress: KanbanColumn
    done: KanbanColumn


# ── Filter / sort params ──────────────────────────────────────

class TaskFilterParams(BaseModel):
    """PB105, PB108-PB115"""
    search: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[UUID] = None
    deadline_from: Optional[datetime] = None
    deadline_to: Optional[datetime] = None
    overdue_only: bool = False
    sort_by: str = "deadline"          # deadline|priority|created_at
    sort_dir: str = "asc"


# ── Workload ──────────────────────────────────────────────────

class WorkloadItem(BaseModel):
    """PB101"""
    user_id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    todo_count: int
    in_progress_count: int
    done_count: int
    overdue_count: int
    total: int


# ── Deadline extension ────────────────────────────────────────

class ExtensionRequestCreate(BaseModel):
    """PB099"""
    proposed_deadline: datetime
    reason: str

class ExtensionReview(BaseModel):
    """PB100"""
    approved: bool
    note: Optional[str] = None

class ExtensionResponse(BaseModel):
    id: UUID
    task_id: UUID
    proposed_deadline: datetime
    reason: str
    status: str
    review_note: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── History ───────────────────────────────────────────────────

class HistoryResponse(BaseModel):
    id: UUID
    changed_by: UUID
    changer_name: str
    field: str
    old_value: Optional[str]
    new_value: Optional[str]
    note: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Stats ─────────────────────────────────────────────────────

class TaskStatsResponse(BaseModel):
    """PB117, PB118"""
    total: int
    done_on_time: int
    done_late: int
    in_progress: int
    overdue: int
    cancelled: int
