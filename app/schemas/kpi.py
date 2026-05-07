from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, field_validator


class KpiConfigRequest(BaseModel):
    """PB122, PB123, PB124"""
    target_score: float
    cycle_day: int
    thresholds: dict  # {"excellent": 90, "good": 75, "pass": 60}

    @field_validator("cycle_day")
    @classmethod
    def valid_day(cls, v):
        if not 1 <= v <= 31:
            raise ValueError("Ngày chốt KPI phải từ 1 đến 31")
        return v

    @field_validator("target_score")
    @classmethod
    def valid_score(cls, v):
        if not 0 <= v <= 100:
            raise ValueError("Mục tiêu KPI phải từ 0 đến 100")
        return v


class KpiConfigResponse(BaseModel):
    target_score: float
    cycle_day: int
    thresholds: dict
    model_config = {"from_attributes": True}


class KpiCriteriaCreate(BaseModel):
    """PB120, PB125"""
    name: str
    description: Optional[str] = None
    weight: float
    is_global: bool = False
    formula_type: str = "manual"

    @field_validator("weight")
    @classmethod
    def valid_weight(cls, v):
        if not 0 < v <= 100:
            raise ValueError("Trọng số phải từ 0 đến 100")
        return v

    @field_validator("formula_type")
    @classmethod
    def valid_formula(cls, v):
        allowed = ["on_time_rate", "completion_rate", "quality_rate", "manual"]
        if v not in allowed:
            raise ValueError(f"formula_type phải là một trong: {allowed}")
        return v


class KpiCriteriaUpdate(BaseModel):
    """PB126"""
    weight: Optional[float] = None
    name: Optional[str] = None
    description: Optional[str] = None


class KpiCriteriaResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    weight: float
    default_weight: Optional[float] = None
    is_global: bool
    formula_type: str
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class KpiValidateResponse(BaseModel):
    total_weight: float
    is_valid: bool
    warning: Optional[str] = None


class KpiCriteriaHistoryItem(BaseModel):
    id: UUID
    changed_by: UUID
    changer_name: str
    old_weight: Optional[float]
    new_weight: Optional[float]
    changed_at: datetime
    model_config = {"from_attributes": True}


class KpiScoreBreakdown(BaseModel):
    """PB134, PB135"""
    criteria_id: UUID
    name: str
    weight: float
    score: float
    weighted_score: float
    formula_type: str


class KpiMonthlyResult(BaseModel):
    """PB133-PB139"""
    user_id: UUID
    full_name: str
    year: int
    month: int
    total_score: float
    grade: str              # Xuất sắc | Tốt | Đạt | Chưa đạt | Chưa có dữ liệu
    target_score: float
    breakdown: list[KpiScoreBreakdown] = []


class KpiTargetRequest(BaseModel):
    """PB140"""
    year: int
    month: int
    target_score: float

    @field_validator("target_score")
    @classmethod
    def valid_score(cls, v):
        if not 0 <= v <= 100:
            raise ValueError("Mục tiêu phải từ 0 đến 100")
        return v

    @field_validator("month")
    @classmethod
    def valid_month(cls, v):
        if not 1 <= v <= 12:
            raise ValueError("Tháng phải từ 1 đến 12")
        return v


class KpiTargetResponse(BaseModel):
    user_id: UUID
    year: int
    month: int
    target_score: float
    model_config = {"from_attributes": True}


class KpiStaffScore(BaseModel):
    """PB142, PB143: bảng điểm nhân viên"""
    user_id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    total_score: float
    grade: str
    rank: int
    breakdown: list[KpiScoreBreakdown] = []


class KpiCompareResponse(BaseModel):
    """PB137"""
    my_score: float
    dept_average: float
    company_average: Optional[float] = None


class KpiDistribution(BaseModel):
    """PB145"""
    excellent: int
    good: int
    pass_: int
    fail: int
    total: int

    class Config:
        populate_by_name = True


class KpiFinalizeRequest(BaseModel):
    """PB149"""
    year: int
    month: int

    @field_validator("month")
    @classmethod
    def valid_month(cls, v):
        if not 1 <= v <= 12:
            raise ValueError("Tháng phải từ 1 đến 12")
        return v


class KpiFinalizeResponse(BaseModel):
    year: int
    month: int
    finalized: bool


class KpiUnlockRequest(BaseModel):
    """PB150"""
    year: int
    month: int
    reason: str  # bắt buộc có lý do


class KpiAppealCreate(BaseModel):
    """PB151"""
    year: int
    month: int
    criteria_name: str
    current_score: float
    proposed_score: float
    reason: str


class KpiAppealResponse(BaseModel):
    id: UUID
    year: int
    month: int
    criteria_name: str
    current_score: float
    proposed_score: float
    reason: str
    status: str
    response: Optional[str] = None
    adjusted_score: Optional[float] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class KpiAppealRespond(BaseModel):
    """PB152"""
    approved: bool
    response: str
    adjusted_score: Optional[float] = None


class KpiAdjustmentCreate(BaseModel):
    """PB153"""
    user_id: UUID
    year: int
    month: int
    criteria_name: str
    proposed_score: float
    reason: str


class KpiAdjustmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    year: int
    month: int
    criteria_name: str
    proposed_score: float
    reason: str
    status: str
    comment: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class KpiAdjustmentReview(BaseModel):
    """PB154"""
    approved: bool
    comment: Optional[str] = None


class KpiAdjustmentHistoryItem(BaseModel):
    """PB155"""
    id: UUID
    requester: str
    approver: Optional[str]
    staff_name: str
    criteria_name: str
    original_score: Optional[float]
    proposed_score: float
    status: str
    comment: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class ManualScoreRequest(BaseModel):
    """CEO sửa điểm thủ công (khi đã mở khóa)"""
    year: int
    month: int
    score: float

    @field_validator("score")
    @classmethod
    def valid_score(cls, v):
        if not 0 <= v <= 100:
            raise ValueError("Điểm phải từ 0 đến 100")
        return v
