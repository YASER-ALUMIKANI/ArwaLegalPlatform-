import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from .database import Base

# ponytail: استخدام UUID كمفتاح أساسي لجميع الجداول لتعزيز الأمان وتجنب التخمين
def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(150), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'lawyer' or 'client'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    lawyer_profile = relationship("Lawyer", back_populates="user", uselist=False)
    client_cases = relationship("Case", foreign_keys="[Case.client_id]", back_populates="client")
    uploaded_documents = relationship("Document", back_populates="uploader")
    invoices = relationship("Invoice", foreign_keys="[Invoice.client_id]", back_populates="client")

class Lawyer(Base):
    __tablename__ = "lawyers"

    id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    license_number = Column(String(50), unique=True, nullable=False)
    specialization = Column(String(100), nullable=False)
    bio = Column(Text, nullable=True)
    hourly_rate = Column(Numeric(10, 2), nullable=False, default=100.0)
    is_verified = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="lawyer_profile")
    cases = relationship("Case", foreign_keys="[Case.lawyer_id]", back_populates="lawyer")
    consultations = relationship("Consultation", back_populates="lawyer")

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(50), unique=True, nullable=True)
    title = Column(String(255), nullable=False)
    court_name = Column(String(150), nullable=True)
    client_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    lawyer_id = Column(String(36), ForeignKey("lawyers.id"), nullable=False)
    status = Column(String(50), nullable=False, default="pending")  # pending, active, closed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    client = relationship("User", foreign_keys=[client_id], back_populates="client_cases")
    lawyer = relationship("Lawyer", foreign_keys=[lawyer_id], back_populates="cases")
    hearings = relationship("Hearing", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="case", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="case", cascade="all, delete-orphan")

class Hearing(Base):
    __tablename__ = "hearings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False)
    hearing_date = Column(DateTime, nullable=False)
    room_number = Column(String(50), nullable=True)
    summary = Column(Text, nullable=True)

    # Relationships
    case = relationship("Case", back_populates="hearings")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=False)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_encrypted = Column(Boolean, default=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    ai_analysis = Column(Text, nullable=True)

    # Relationships
    case = relationship("Case", back_populates="documents")
    uploader = relationship("User", back_populates="uploaded_documents")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="messages")

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    lawyer_id = Column(String(36), ForeignKey("lawyers.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    status = Column(String(50), nullable=False, default="pending")  # pending, accepted, rejected, completed
    notes = Column(Text, nullable=True)
    session_notes = Column(Text, nullable=True)

    # Relationships
    lawyer = relationship("Lawyer", back_populates="consultations")
    client = relationship("User", foreign_keys=[client_id])

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=True)
    consultation_id = Column(String(36), ForeignKey("consultations.id"), nullable=True)
    client_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="unpaid")  # unpaid, paid, canceled
    due_date = Column(DateTime, nullable=False)
    payment_method = Column(String(50), nullable=True)  # mada, visa, kuraimi, floosak, jawaly
    transaction_id = Column(String(100), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="invoices")
    client = relationship("User", foreign_keys=[client_id], back_populates="invoices")
    consultation = relationship("Consultation", foreign_keys=[consultation_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # system, sms, email
    channel = Column(String(100), nullable=False)  # SMS, البريد الإلكتروني, تنبيه النظام
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class LawBook(Base):
    __tablename__ = "law_books"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    law_name = Column(String(150), nullable=False)
    chapter = Column(String(150), nullable=True)
    article_number = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    keywords = Column(String(255), nullable=True)
