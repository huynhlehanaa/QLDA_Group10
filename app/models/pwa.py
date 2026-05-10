import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class PushSubscription(Base):
    """PB205, PB206: Web Push subscription"""
    __tablename__ = "PUSH_SUBSCRIPTIONS"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    endpoint   = Column(String, nullable=False, unique=True)
    p256dh_key = Column(String, nullable=False)
    auth_key   = Column(String, nullable=False)
    platform   = Column(String(20), default="android")  # android | ios
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class NotificationPreference(Base):
    """PB207: cài đặt thông báo cho từng user"""
    __tablename__ = "NOTIFICATION_PREFERENCES"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False, unique=True)
    push_enabled = Column(Boolean, default=True)
    types        = Column(JSON, default=lambda: {
        "new_task": True,
        "deadline": True,
        "kpi": True,
        "system": True,
    })
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
