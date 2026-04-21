import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text, Float, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class Epic(Base):
    """PB077: nhóm task theo Epic/Dự án"""
    __tablename__ = "EPICS"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dept_id     = Column(UUID(as_uuid=True), ForeignKey("DEPARTMENTS.id"), nullable=False)
    created_by  = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    name        = Column(String(255), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    tasks       = relationship("Task", back_populates="epic")
    department  = relationship("Department", foreign_keys=[dept_id])
    creator     = relationship("User", foreign_keys=[created_by])


class Task(Base):
    __tablename__ = "TASKS"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dept_id       = Column(UUID(as_uuid=True), ForeignKey("DEPARTMENTS.id"), nullable=False)
    created_by    = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    epic_id       = Column(UUID(as_uuid=True), ForeignKey("EPICS.id"), nullable=True)
    blocked_by_id = Column(UUID(as_uuid=True), ForeignKey("TASKS.id"), nullable=True)  # PB070

    title         = Column(String(500), nullable=False)
    description   = Column(Text, nullable=True)
    status        = Column(String(20), default="todo")    # todo|in_progress|done|cancelled
    priority      = Column(String(20), default="medium")  # low|medium|high
    progress_pct  = Column(Integer, default=0)

    deadline      = Column(DateTime(timezone=True), nullable=True)
    is_recurring  = Column(Boolean, default=False)
    recur_pattern = Column(String(50), nullable=True)     # daily|weekly|monthly
    recur_day     = Column(String(10), nullable=True)     # day-of-week / day-of-month

    completed_at  = Column(DateTime(timezone=True), nullable=True)
    cancelled_at  = Column(DateTime(timezone=True), nullable=True)
    cancel_reason = Column(Text, nullable=True)
    last_updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assignees     = relationship("TaskAssignee", back_populates="task", cascade="all, delete-orphan")
    comments      = relationship("TaskComment",  back_populates="task", cascade="all, delete-orphan")
    attachments   = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")
    checklists    = relationship("TaskChecklist", back_populates="task", cascade="all, delete-orphan", order_by="TaskChecklist.position")
    history       = relationship("TaskHistory",  back_populates="task", cascade="all, delete-orphan")
    epic          = relationship("Epic", back_populates="tasks")
    creator       = relationship("User", foreign_keys=[created_by])
    blocked_by    = relationship("Task", remote_side="Task.id", foreign_keys=[blocked_by_id])
    extension_requests = relationship("DeadlineExtensionRequest", back_populates="task", cascade="all, delete-orphan")


class TaskAssignee(Base):
    """PB065: giao task cho nhiều nhân viên"""
    __tablename__ = "TASK_ASSIGNEES"

    task_id   = Column(UUID(as_uuid=True), ForeignKey("TASKS.id", ondelete="CASCADE"), primary_key=True)
    user_id   = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), primary_key=True)

    task      = relationship("Task", back_populates="assignees")
    user      = relationship("User")


class TaskComment(Base):
    """PB088, PB090, PB091"""
    __tablename__ = "TASK_COMMENTS"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id     = Column(UUID(as_uuid=True), ForeignKey("TASKS.id", ondelete="CASCADE"), nullable=False)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    parent_id   = Column(UUID(as_uuid=True), ForeignKey("TASK_COMMENTS.id"), nullable=True)  # PB091: reply
    content     = Column(Text, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    task        = relationship("Task", back_populates="comments")
    user        = relationship("User")
    replies     = relationship("TaskComment", foreign_keys=[parent_id])


class TaskAttachment(Base):
    """PB069, PB089"""
    __tablename__ = "TASK_ATTACHMENTS"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id     = Column(UUID(as_uuid=True), ForeignKey("TASKS.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    file_url    = Column(Text, nullable=False)
    file_name   = Column(String(255))
    file_size   = Column(Integer)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    task        = relationship("Task", back_populates="attachments")
    uploader    = relationship("User")


class TaskChecklist(Base):
    """PB071, PB072"""
    __tablename__ = "TASK_CHECKLISTS"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id     = Column(UUID(as_uuid=True), ForeignKey("TASKS.id", ondelete="CASCADE"), nullable=False)
    content     = Column(String(500), nullable=False)
    is_done     = Column(Boolean, default=False)
    position    = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    task        = relationship("Task", back_populates="checklists")


class TaskHistory(Base):
    """PB092: lịch sử thay đổi task"""
    __tablename__ = "TASK_HISTORY"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id     = Column(UUID(as_uuid=True), ForeignKey("TASKS.id", ondelete="CASCADE"), nullable=False)
    changed_by  = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    field       = Column(String(50))   # status|priority|deadline|assignee|title|progress
    old_value   = Column(Text)
    new_value   = Column(Text)
    note        = Column(Text)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    task        = relationship("Task", back_populates="history")
    changer     = relationship("User")


class DeadlineExtensionRequest(Base):
    """PB099, PB100: nhân viên yêu cầu gia hạn deadline"""
    __tablename__ = "DEADLINE_EXTENSION_REQUESTS"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id         = Column(UUID(as_uuid=True), ForeignKey("TASKS.id", ondelete="CASCADE"), nullable=False)
    requested_by    = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    proposed_deadline = Column(DateTime(timezone=True), nullable=False)
    reason          = Column(Text, nullable=False)
    status          = Column(String(20), default="pending")  # pending|approved|rejected
    reviewed_by     = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=True)
    review_note     = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at     = Column(DateTime(timezone=True), nullable=True)

    task            = relationship("Task", back_populates="extension_requests")
    requester       = relationship("User", foreign_keys=[requested_by])
    reviewer        = relationship("User", foreign_keys=[reviewed_by])
