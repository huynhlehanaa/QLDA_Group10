import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class KpiConfig(Base):
    """PB122, PB123, PB124: cấu hình KPI toàn công ty"""
    __tablename__ = "KPI_CONFIG"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id       = Column(UUID(as_uuid=True), ForeignKey("ORGANIZATIONS.id"), nullable=False)
    target_score = Column(Float, default=75.0)       # PB122
    cycle_day    = Column(Integer, default=1)         # PB123: ngày chốt KPI
    threshold_excellent = Column(Float, default=90.0) # PB124
    threshold_good      = Column(Float, default=75.0)
    threshold_pass      = Column(Float, default=60.0)
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by   = Column(UUID(as_uuid=True), ForeignKey("USERS.id"))

    organization = relationship("Organization")
    updater      = relationship("User", foreign_keys=[updated_by])


class KpiCriteria(Base):
    """PB120, PB125: tiêu chí KPI toàn công ty và phòng ban"""
    __tablename__ = "KPI_CRITERIA"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id       = Column(UUID(as_uuid=True), ForeignKey("ORGANIZATIONS.id"), nullable=False)
    dept_id      = Column(UUID(as_uuid=True), ForeignKey("DEPARTMENTS.id"), nullable=True)
    name         = Column(String(255), nullable=False)
    description  = Column(Text, nullable=True)
    weight       = Column(Float, nullable=False)
    default_weight = Column(Float, nullable=True)    # PB126: lưu trọng số gốc CEO đặt
    is_global    = Column(Boolean, default=False)
    formula_type = Column(String(50), default="manual")
    # formula_type: on_time_rate | completion_rate | quality_rate | manual
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    created_by   = Column(UUID(as_uuid=True), ForeignKey("USERS.id"))

    organization = relationship("Organization")
    department   = relationship("Department")
    creator      = relationship("User", foreign_keys=[created_by])
    history      = relationship("KpiCriteriaHistory", back_populates="criteria", cascade="all, delete-orphan")
    scores       = relationship("KpiScore", back_populates="criteria")


class KpiCriteriaHistory(Base):
    """PB128: lịch sử thay đổi công thức KPI"""
    __tablename__ = "KPI_CRITERIA_HISTORY"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    criteria_id  = Column(UUID(as_uuid=True), ForeignKey("KPI_CRITERIA.id", ondelete="CASCADE"), nullable=False)
    changed_by   = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    old_weight   = Column(Float)
    new_weight   = Column(Float)
    old_name     = Column(String(255))
    new_name     = Column(String(255))
    note         = Column(Text)
    changed_at   = Column(DateTime(timezone=True), server_default=func.now())

    criteria     = relationship("KpiCriteria", back_populates="history")
    changer      = relationship("User", foreign_keys=[changed_by])


class KpiScore(Base):
    """PB129-PB132: điểm KPI tính tự động từ task"""
    __tablename__ = "KPI_SCORES"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    criteria_id    = Column(UUID(as_uuid=True), ForeignKey("KPI_CRITERIA.id"), nullable=False)
    year           = Column(Integer, nullable=False)
    month          = Column(Integer, nullable=False)
    score          = Column(Float, default=0.0)
    weighted_score = Column(Float, default=0.0)
    is_finalized   = Column(Boolean, default=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "criteria_id", "year", "month", name="uq_kpi_score"),
    )

    user     = relationship("User")
    criteria = relationship("KpiCriteria", back_populates="scores")


class KpiTarget(Base):
    """PB140: mục tiêu KPI cá nhân"""
    __tablename__ = "KPI_TARGETS"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    year         = Column(Integer, nullable=False)
    month        = Column(Integer, nullable=False)
    target_score = Column(Float, nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_kpi_target"),
    )

    user = relationship("User")


class KpiFinalize(Base):
    """PB149, PB150: chốt và mở khóa KPI"""
    __tablename__ = "KPI_FINALIZE"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id      = Column(UUID(as_uuid=True), ForeignKey("ORGANIZATIONS.id"), nullable=False)
    year        = Column(Integer, nullable=False)
    month       = Column(Integer, nullable=False)
    is_finalized = Column(Boolean, default=False)
    finalized_by = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    unlock_reason = Column(Text, nullable=True)
    unlocked_by  = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=True)
    unlocked_at  = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("org_id", "year", "month", name="uq_kpi_finalize"),
    )


class KpiAppeal(Base):
    """PB151, PB152: khiếu nại điểm KPI"""
    __tablename__ = "KPI_APPEALS"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    year           = Column(Integer, nullable=False)
    month          = Column(Integer, nullable=False)
    criteria_name  = Column(String(255), nullable=False)
    current_score  = Column(Float, nullable=False)
    proposed_score = Column(Float, nullable=False)
    reason         = Column(Text, nullable=False)
    status         = Column(String(20), default="pending")  # pending|approved|rejected
    response       = Column(Text, nullable=True)
    adjusted_score = Column(Float, nullable=True)
    responded_by   = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=True)
    responded_at   = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    requester   = relationship("User", foreign_keys=[user_id])
    responder   = relationship("User", foreign_keys=[responded_by])


class KpiAdjustment(Base):
    """PB153-PB155: yêu cầu điều chỉnh KPI ngoại lệ"""
    __tablename__ = "KPI_ADJUSTMENTS"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    requested_by   = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=False)
    year           = Column(Integer, nullable=False)
    month          = Column(Integer, nullable=False)
    criteria_name  = Column(String(255), nullable=False)
    original_score = Column(Float, nullable=True)
    proposed_score = Column(Float, nullable=False)
    reason         = Column(Text, nullable=False)
    status         = Column(String(20), default="pending")  # pending|approved|rejected
    comment        = Column(Text, nullable=True)
    reviewed_by    = Column(UUID(as_uuid=True), ForeignKey("USERS.id"), nullable=True)
    reviewed_at    = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    staff      = relationship("User", foreign_keys=[user_id])
    requester  = relationship("User", foreign_keys=[requested_by])
    reviewer   = relationship("User", foreign_keys=[reviewed_by])
