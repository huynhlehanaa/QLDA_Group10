import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class UserSetting(Base):
    """PB211: cài đặt cá nhân mỗi user (ngôn ngữ...)"""
    __tablename__ = "USER_SETTINGS"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("USERS.id"),
                        nullable=False, unique=True)
    language   = Column(String(10), default="vi")   # vi | en
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())

    user = relationship("User")
