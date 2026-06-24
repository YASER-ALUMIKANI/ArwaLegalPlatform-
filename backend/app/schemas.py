from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# JWT and Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    full_name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# User schemas
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: str
    role: str

class UserCreate(UserBase):
    password: str
    # Lawyer registration fields if role == 'lawyer'
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    hourly_rate: Optional[float] = 100.0

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Lawyer schemas
class LawyerResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone_number: str
    specialization: str
    bio: Optional[str] = None
    hourly_rate: float
    is_verified: bool

    class Config:
        from_attributes = True

# Case schemas
class CaseBase(BaseModel):
    title: str
    court_name: Optional[str] = None
    case_number: Optional[str] = None

class CaseCreate(CaseBase):
    client_email: EmailStr  # We can link the client by their registered email

class CaseResponse(CaseBase):
    id: str
    client_id: str
    client_name: str
    lawyer_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Hearing schemas
class HearingBase(BaseModel):
    hearing_date: datetime
    room_number: Optional[str] = None
    summary: Optional[str] = None

class HearingCreate(HearingBase):
    case_id: str

class HearingResponse(HearingBase):
    id: str
    case_id: str

    class Config:
        from_attributes = True

# Document schemas
class DocumentResponse(BaseModel):
    id: str
    case_id: str
    file_name: str
    file_url: str
    uploaded_by: str
    uploaded_at: datetime
    ai_analysis: Optional[str] = None

    class Config:
        from_attributes = True

# Message schemas
class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: str
    case_id: str
    sender_id: str
    sender_name: str
    content: str
    sent_at: datetime

    class Config:
        from_attributes = True

# Consultation schemas
class ConsultationCreate(BaseModel):
    lawyer_id: str
    date: datetime
    notes: Optional[str] = None

class ConsultationResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    lawyer_id: str
    lawyer_name: str
    date: datetime
    status: str
    notes: Optional[str] = None
    session_notes: Optional[str] = None

    class Config:
        from_attributes = True

# Invoice schemas
class InvoiceCreate(BaseModel):
    case_id: Optional[str] = None
    consultation_id: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    description: Optional[str] = None
    due_date: datetime

class InvoicePay(BaseModel):
    payment_method: str  # mada, visa, kuraimi, floosak, jawaly

class InvoiceResponse(BaseModel):
    id: str
    case_id: Optional[str] = None
    consultation_id: Optional[str] = None
    client_id: str
    amount: float
    description: Optional[str] = None
    status: str
    due_date: datetime
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    client_name: Optional[str] = None
    case_title: Optional[str] = None

    class Config:
        from_attributes = True

class LawyerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    specialization: Optional[str] = None
    hourly_rate: Optional[float] = None
    bio: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    type: str
    channel: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AIChatMessageCreate(BaseModel):
    content: str


class AIChatMessageResponse(BaseModel):
    id: str
    user_id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConsultationSessionNotesUpdate(BaseModel):
    session_notes: str


class LawBookResponse(BaseModel):
    id: str
    law_name: str
    chapter: Optional[str] = None
    article_number: str
    content: str
    keywords: Optional[str] = None

    class Config:
        from_attributes = True


class MonthRevenueItem(BaseModel):
    month: str
    amount: float


class CaseStatusItem(BaseModel):
    status: str
    count: int


class LawyerAnalyticsResponse(BaseModel):
    total_cases: int
    active_cases: int
    closed_cases: int
    pending_cases: int
    total_consultations: int
    pending_consultations: int
    accepted_consultations: int
    collected_revenue: float
    pending_revenue: float
    monthly_revenues: List[MonthRevenueItem]
    case_status_distribution: List[CaseStatusItem]
