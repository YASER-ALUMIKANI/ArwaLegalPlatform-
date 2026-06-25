import os
import shutil
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext

from .database import Base, engine, get_db, SessionLocal
from . import models, schemas

# إنشاء الجداول عند التشغيل تلقائياً لتبسيط الإعداد
Base.metadata.create_all(bind=engine)

# ==================== إدارة اتصالات WebSocket ====================
class ConnectionManager:
    def __init__(self):
        # خريطة تربط معرف المستخدم بقائمة من اتصالات الـ WebSocket النشطة
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

class ConsultationRoomManager:
    def __init__(self):
        self.rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, consult_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms.setdefault(consult_id, {})[user_id] = websocket

    def disconnect(self, consult_id: str, user_id: str):
        if consult_id in self.rooms:
            self.rooms[consult_id].pop(user_id, None)
            if not self.rooms[consult_id]:
                del self.rooms[consult_id]

    async def send_to_peers(self, consult_id: str, sender_id: str, payload: dict):
        for user_id, connection in self.rooms.get(consult_id, {}).items():
            if user_id == sender_id:
                continue
            await connection.send_json({**payload, "sender_id": sender_id})

session_manager = ConsultationRoomManager()
loop = None

def send_ws_notification(user_id: str, payload: dict):
    global loop
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(
            manager.send_personal_message(payload, user_id),
            loop
        )

def trigger_notifications(db: Session, user_id: str, title: str, content: str):
    """
    إرسال إشعارات ثلاثية القنوات وتخزينها في قاعدة البيانات:
    1. تنبيه نظام داخلي (system)
    2. رسالة نصية SMS محاكاة (sms)
    3. بريد إلكتروني محاكى (email)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return
        
    # 1. إشعار النظام
    sys_notif = models.Notification(
        user_id=user_id,
        title=title,
        content=content,
        type="system",
        channel="تنبيه النظام",
        is_read=False
    )
    db.add(sys_notif)
    
    # 2. محاكاة SMS
    sms_content = f"[SMS] تم الإرسال لجوال ({user.phone_number}): {content}"
    sms_notif = models.Notification(
        user_id=user_id,
        title=f"رسالة SMS: {title}",
        content=sms_content,
        type="sms",
        channel="رسالة نصية SMS",
        is_read=False
    )
    db.add(sms_notif)
    
    # 3. محاكاة البريد الإلكتروني
    email_content = f"[Email] تم الإرسال لبريد ({user.email}): {content}"
    email_notif = models.Notification(
        user_id=user_id,
        title=f"بريد إلكتروني: {title}",
        content=email_content,
        type="email",
        channel="البريد الإلكتروني",
        is_read=False
    )
    db.add(email_notif)
    db.flush()

    # إرسال إشعار لحظي عبر WebSocket
    send_ws_notification(user_id, {"type": "new_notification"})

app = FastAPI(title="منصة أروى القانونية API")

@app.on_event("startup")
async def startup_event():
    global loop
    loop = asyncio.get_running_loop()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            # استقبال رسائل فارغة أو الحفاظ على الاتصال نشطاً
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

@app.websocket("/ws/consultations/{consult_id}")
async def consultation_signaling_endpoint(websocket: WebSocket, consult_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    db = SessionLocal()
    current_user = None
    try:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="تعذر التحقق من الهوية.",
        )
        current_user = get_user_from_token(token, db, credentials_exception)
        consult = db.query(models.Consultation).filter(models.Consultation.id == consult_id).first()
        if not consult or current_user.id not in (consult.client_id, consult.lawyer_id):
            await websocket.close(code=1008)
            return

        await session_manager.connect(consult_id, current_user.id, websocket)
        await session_manager.send_to_peers(consult_id, current_user.id, {"type": "peer-joined"})

        while True:
            payload = await websocket.receive_json()
            await session_manager.send_to_peers(consult_id, current_user.id, payload)
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        if current_user:
            session_manager.disconnect(consult_id, current_user.id)
            await session_manager.send_to_peers(consult_id, current_user.id, {"type": "peer-left"})
        db.close()

# إعداد مجلد المرفقات المرفوعة
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# إتاحة الملفات المرفوعة للوصول العام الثابت
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# إعداد الـ CORS لتكامل الواجهة الأمامية والواجهة الخلفية
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # في الإنتاج يتم تحديد النطاقات المسموحة فقط
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# إعدادات الأمان والتشفير (JWT)
SECRET_KEY = "arwa_legal_platform_super_secret_key_for_yemeni_lawyer"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # يوم واحد

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# التبعية (Dependency) للحصول على المستخدم الحالي المصادق عليه
def get_current_user(token: str = Depends(Form(None)), db: Session = Depends(get_db)):
    # ponytail: توفير وسيلة سهلة لقراءة التوكن من الهيدر أو فورم البيانات لتسهيل رفع الملفات
    # سنحاول أولاً قراءة التوكن من الهيدر (الطريقة القياسية)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="تعذر التحقق من الهوية، يرجى تسجيل الدخول مجدداً.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    return get_user_from_token(token, db, credentials_exception)

# دالة مساعدة للمصادقة من الهيدر (Bearer Token)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer(auto_error=False)

def get_user_by_auth_header(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), db: Session = Depends(get_db)):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز التوثيق مفقود، يرجى تسجيل الدخول.",
        )
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="رمز التوثيق غير صالح أو منتهي الصلاحية.",
    )
    return get_user_from_token(token, db, credentials_exception)

def get_user_from_token(token: str, db: Session, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

# ==================== مسارات المصادقة (Auth Endpoints) ====================

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # التحقق من وجود البريد الإلكتروني أو الهاتف مسبقاً
    existing_user = db.query(models.User).filter(
        (models.User.email == user_in.email) | (models.User.phone_number == user_in.phone_number)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="البريد الإلكتروني أو رقم الهاتف مسجل بالفعل."
        )
    
    # إنشاء المستخدم
    hashed_password = get_password_hash(user_in.password)
    user = models.User(
        full_name=user_in.full_name,
        email=user_in.email,
        phone_number=user_in.phone_number,
        password_hash=hashed_password,
        role=user_in.role
    )
    db.add(user)
    db.flush()  # للحصول على المعرف id
    
    # إذا كان محامي، نقوم بإنشاء ملف تعريفي إضافي
    if user_in.role == "lawyer":
        if not user_in.license_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رقم الرخصة مطلوب للمحامين."
            )
        # التحقق من رخصة مكررة
        existing_license = db.query(models.Lawyer).filter(models.Lawyer.license_number == user_in.license_number).first()
        if existing_license:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رقم الرخصة هذا مسجل مسبقاً لمكتب آخر."
            )
        
        lawyer_profile = models.Lawyer(
            id=user.id,
            license_number=user_in.license_number,
            specialization=user_in.specialization or "عام",
            bio=user_in.bio,
            hourly_rate=user_in.hourly_rate or 100.0,
            is_verified=False  # يتم التوثيق لاحقاً من قبل النقابة/المنصة
        )
        db.add(lawyer_profile)
    
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="البريد الإلكتروني أو كلمة المرور غير صحيحة."
        )
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_user_by_auth_header)):
    return current_user

# ==================== مسارات المحامين (Lawyers Directory) ====================

@app.get("/api/lawyers", response_model=List[schemas.LawyerResponse])
def list_lawyers(db: Session = Depends(get_db)):
    # ponytail: دمج الاستعلام للحصول على معلومات المستخدم والمحامي في استعلام واحد
    results = db.query(models.Lawyer).join(models.User).filter(models.User.role == "lawyer").all()
    lawyers_list = []
    for l in results:
        lawyers_list.append({
            "id": l.id,
            "full_name": l.user.full_name,
            "email": l.user.email,
            "phone_number": l.user.phone_number,
            "specialization": l.specialization,
            "bio": l.bio,
            "hourly_rate": float(l.hourly_rate),
            "is_verified": l.is_verified
        })
    return lawyers_list

# ==================== مسارات إدارة القضايا (Cases) ====================

@app.post("/api/cases", response_model=schemas.CaseResponse)
def create_case(case_in: schemas.CaseCreate, current_user: models.User = Depends(get_user_by_auth_header), db: Session = Depends(get_db)):
    if current_user.role != "lawyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="صلاحية إنشاء القضايا حصرية للمحامين."
        )
    
    # البحث عن الموكل بالبريد الإلكتروني
    client = db.query(models.User).filter(models.User.email == case_in.client_email, models.User.role == "client").first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="العميل (الموكل) غير مسجل في المنصة. يرجى تسجيل حسابه أولاً."
        )
    
    # التحقق من عدم تكرار رقم القضية
    if case_in.case_number:
        existing_case = db.query(models.Case).filter(models.Case.case_number == case_in.case_number).first()
        if existing_case:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رقم القضية هذا مسجل بالفعل بقضية أخرى."
            )
            
    case = models.Case(
        case_number=case_in.case_number,
        title=case_in.title,
        court_name=case_in.court_name,
        client_id=client.id,
        lawyer_id=current_user.id,
        status="active"
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    
    return {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "court_name": case.court_name,
        "client_id": case.client_id,
        "client_name": client.full_name,
        "lawyer_id": case.lawyer_id,
        "status": case.status,
        "created_at": case.created_at
    }

@app.get("/api/cases", response_model=List[schemas.CaseResponse])
def get_cases(current_user: models.User = Depends(get_user_by_auth_header), db: Session = Depends(get_db)):
    if current_user.role == "lawyer":
        cases = db.query(models.Case).filter(models.Case.lawyer_id == current_user.id).all()
    else:
        cases = db.query(models.Case).filter(models.Case.client_id == current_user.id).all()
        
    return [
        {
            "id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "court_name": c.court_name,
            "client_id": c.client_id,
            "client_name": c.client.full_name,
            "lawyer_id": c.lawyer_id,
            "status": c.status,
            "created_at": c.created_at
        } for c in cases
    ]

@app.get("/api/cases/{case_id}")
def get_case_detail(case_id: str, current_user: models.User = Depends(get_user_by_auth_header), db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="القضية غير موجودة.")
    
    # تأمين صلاحية الوصول للقضية
    if current_user.id != case.lawyer_id and current_user.id != case.client_id:
        raise HTTPException(status_code=403, detail="لا تملك صلاحية الاطلاع على هذه القضية.")
        
    # جلب الجلسات والمستندات والرسائل المرتبطة
    hearings = db.query(models.Hearing).filter(models.Hearing.case_id == case_id).order_by(models.Hearing.hearing_date.asc()).all()
    documents = db.query(models.Document).filter(models.Document.case_id == case_id).all()
    messages = db.query(models.Message).filter(models.Message.case_id == case_id).order_by(models.Message.sent_at.asc()).all()
    
    return {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "court_name": case.court_name,
        "client_name": case.client.full_name,
        "client_phone": case.client.phone_number,
        "client_email": case.client.email,
        "lawyer_name": case.lawyer.user.full_name,
        "status": case.status,
        "created_at": case.created_at,
        "hearings": [
            {
                "id": h.id,
                "hearing_date": h.hearing_date,
                "room_number": h.room_number,
                "summary": h.summary
            } for h in hearings
        ],
        "documents": [
            {
                "id": d.id,
                "file_name": d.file_name,
                "file_url": d.file_url,
                "uploaded_by_name": d.uploader.full_name,
                "uploaded_at": d.uploaded_at,
                "ai_analysis": d.ai_analysis
            } for d in documents
        ],
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "sender_name": db.query(models.User).filter(models.User.id == m.sender_id).first().full_name,
                "content": m.content,
                "sent_at": m.sent_at
            } for m in messages
        ]
    }

# ==================== الجلسات والجدولة (Hearings) ====================

@app.post("/api/hearings", response_model=schemas.HearingResponse)
def add_hearing(hearing_in: schemas.HearingCreate, current_user: models.User = Depends(get_user_by_auth_header), db: Session = Depends(get_db)):
    if current_user.role != "lawyer":
        raise HTTPException(status_code=403, detail="الصلاحية حصرية للمحامي لإضافة جلسة.")
        
    case = db.query(models.Case).filter(models.Case.id == hearing_in.case_id).first()
    if not case or case.lawyer_id != current_user.id:
        raise HTTPException(status_code=404, detail="القضية غير موجودة أو غير مسجلة باسمك.")
        
    hearing = models.Hearing(
        case_id=hearing_in.case_id,
        hearing_date=hearing_in.hearing_date,
        room_number=hearing_in.room_number,
        summary=hearing_in.summary
    )
    db.add(hearing)
    
    # تنبيه الموكل بجدولة جلسة جديدة لقضيته
    h_date_str = hearing.hearing_date.strftime("%Y-%m-%d %H:%M")
    trigger_notifications(
        db,
        user_id=case.client_id,
        title="جدولة جلسة مرافعة جديدة",
        content=f"تمت جدولة جلسة مرافعة جديدة في قضيتكم '{case.title}' بتاريخ {h_date_str} في {hearing.room_number or 'قاعة المحكمة'}."
    )
    
    db.commit()
    db.refresh(hearing)
    return hearing

# ==================== رفع المستندات وإدارتها (Documents) ====================

@app.post("/api/documents/upload", response_model=schemas.DocumentResponse)
def upload_document(
    case_id: str = Form(...),
    token: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # استخدام الدالة المساعدة لقراءة المستخدم من التوكن الممرر بالفورم (لسهولة دعم رفع الملفات)
    current_user = get_current_user(token, db)
    
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="القضية غير موجودة.")
        
    if current_user.id != case.lawyer_id and current_user.id != case.client_id:
        raise HTTPException(status_code=403, detail="لا تملك صلاحية لرفع ملفات لهذه القضية.")
        
    # حفظ الملف محلياً في مجلد uploads
    # ponytail: حفظ الملف باسم فريد يعتمد على التوقيت الحالي والاسم الأصلي لمنع التداخل
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db_document = models.Document(
        case_id=case_id,
        file_name=file.filename,
        file_url=f"/uploads/{unique_filename}",
        uploaded_by=current_user.id,
        is_encrypted=True
    )
    db.add(db_document)
    
    # تنبيه الطرف الآخر برفع مستند جديد
    target_user_id = case.lawyer_id if current_user.role == "client" else case.client_id
    uploader_role = "الموكل" if current_user.role == "client" else "المحامي الوكيل"
    trigger_notifications(
        db,
        user_id=target_user_id,
        title="مستند جديد مرفوع",
        content=f"قام {uploader_role} ({current_user.full_name}) برفع مستند جديد في ملف القضية '{case.title}': {file.filename}"
    )
    
    db.commit()
    db.refresh(db_document)
    
    return db_document

# ==================== المراسلات الفورية (Chat / Messaging) ====================

@app.post("/api/messages", response_model=schemas.MessageResponse)
def send_message(case_id: str, message_in: schemas.MessageCreate, current_user: models.User = Depends(get_user_by_auth_header), db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case or (current_user.id != case.lawyer_id and current_user.id != case.client_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة أو لا تملك صلاحية الوصول.")
        
    message = models.Message(
        case_id=case_id,
        sender_id=current_user.id,
        content=message_in.content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # إرسال تحديثات فورية عبر WebSocket لكلا الطرفين (المحامي والموكل)
    send_ws_notification(case.client_id, {"type": "case_updated", "case_id": case_id})
    send_ws_notification(case.lawyer_id, {"type": "case_updated", "case_id": case_id})
    
    return {
        "id": message.id,
        "case_id": message.case_id,
        "sender_id": message.sender_id,
        "sender_name": current_user.full_name,
        "content": message.content,
        "sent_at": message.sent_at
    }

# ==================== الاستشارات وحجز المواعيد (Consultations) ====================

@app.post("/api/consultations", response_model=schemas.ConsultationResponse)
def create_consultation(consult_in: schemas.ConsultationCreate, current_user: models.User = Depends(get_user_by_auth_header), db: Session = Depends(get_db)):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="الصلاحية حصرية للعميل لطلب استشارة جديدة.")
        
    lawyer = db.query(models.Lawyer).filter(models.Lawyer.id == consult_in.lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail="المحامي المطلوب غير موجود.")
        
    consultation = models.Consultation(
        client_id=current_user.id,
        lawyer_id=consult_in.lawyer_id,
        date=consult_in.date,
        notes=consult_in.notes,
        status="pending"
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    
    return {
        "id": consultation.id,
        "client_id": consultation.client_id,
        "client_name": current_user.full_name,
        "lawyer_id": consultation.lawyer_id,
        "lawyer_name": lawyer.user.full_name,
        "date": consultation.date,
        "status": consultation.status,
        "notes": consultation.notes
    }

@app.get("/api/consultations", response_model=List[schemas.ConsultationResponse])
def list_consultations(current_user: models.User = Depends(get_user_by_auth_header), db: Session = Depends(get_db)):
    if current_user.role == "lawyer":
        consults = db.query(models.Consultation).filter(models.Consultation.lawyer_id == current_user.id).all()
    else:
        consults = db.query(models.Consultation).filter(models.Consultation.client_id == current_user.id).all()
        
    return [
        {
            "id": c.id,
            "client_id": c.client_id,
            "client_name": c.client.full_name,
            "lawyer_id": c.lawyer_id,
            "lawyer_name": c.lawyer.user.full_name,
            "date": c.date,
            "status": c.status,
            "notes": c.notes
        } for c in consults
    ]

@app.patch("/api/consultations/{consult_id}")
def update_consultation_status(
    consult_id: str,
    status_update: str,  # "accepted" or "rejected" or "completed"
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    consult = db.query(models.Consultation).filter(models.Consultation.id == consult_id).first()
    if not consult:
        raise HTTPException(status_code=404, detail="الاستشارة غير موجودة.")
        
    if current_user.role != "lawyer" or consult.lawyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="لا تملك الصلاحية لتحديث حالة هذه الاستشارة.")
        
    if status_update not in ["accepted", "rejected", "completed"]:
        raise HTTPException(status_code=400, detail="الحالة الجديدة غير صالحة.")
        
    consult.status = status_update
    
    # إذا تم قبول الاستشارة، نقوم بإنشاء فاتورة لها تلقائياً
    if status_update == "accepted":
        # جلب معدل الساعة للمحامي لتحديد قيمة الاستشارة
        lawyer_profile = db.query(models.Lawyer).filter(models.Lawyer.id == current_user.id).first()
        hourly_rate = float(lawyer_profile.hourly_rate) if lawyer_profile else 15000.0
        
        # إنشاء الفاتورة بالريال اليمني
        # ponytail: استخدام معدل الساعة للمحامي كمبلغ الاستشارة الافتراضي
        invoice = models.Invoice(
            consultation_id=consult.id,
            client_id=consult.client_id,
            amount=hourly_rate,
            description=f"فاتورة استشارة قانونية مقبولة - موعد: {consult.date.strftime('%Y-%m-%d %H:%M')}",
            due_date=consult.date + timedelta(days=2),  # تاريخ الاستحقاق بعد يومين من القبول
            status="unpaid"
        )
        db.add(invoice)
        
        # إشعار الموكل بقبول الاستشارة وإصدار الفاتورة
        c_date_str = consult.date.strftime("%Y-%m-%d %H:%M")
        trigger_notifications(
            db,
            user_id=consult.client_id,
            title="قبول طلب الاستشارة وصدرت الفاتورة",
            content=f"تم قبول موعد استشارتكم القانونية المجدول في {c_date_str}. وصدرت فاتورة أتعاب الاستشارة بقيمة {hourly_rate:,.2f} ريال يمني."
        )
    elif status_update == "rejected":
        # إشعار بالرفض
        trigger_notifications(
            db,
            user_id=consult.client_id,
            title="اعتذار عن طلب الاستشارة",
            content=f"نأسف، اعتذر أ. {current_user.full_name} عن قبول طلب الاستشارة المجدول بتاريخ {consult.date.strftime('%Y-%m-%d %H:%M')}."
        )
    elif status_update == "completed":
        # إشعار بالإتمام
        trigger_notifications(
            db,
            user_id=consult.client_id,
            title="إتمام الاستشارة القانونية",
            content=f"تم إكمال الاستشارة القانونية مع أ. {current_user.full_name} بنجاح. شكراً لتعاملكم معنا."
        )
        
    db.commit()
    return {"message": "تم تحديث حالة الاستشارة بنجاح.", "status": consult.status}

# ==================== نظام الفواتير والمدفوعات (Invoicing & Payments) ====================

@app.post("/api/invoices", response_model=schemas.InvoiceResponse)
def create_invoice(
    invoice_in: schemas.InvoiceCreate,
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    if current_user.role != "lawyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="صلاحية إنشاء الفواتير حصرية للمحامين."
        )
    
    client_id = None
    case_title = "استشارة قانونية"
    client_name = ""

    if invoice_in.case_id:
        case = db.query(models.Case).filter(
            models.Case.id == invoice_in.case_id,
            models.Case.lawyer_id == current_user.id
        ).first()
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="القضية غير موجودة أو لا تملك صلاحية الوصول إليها."
            )
        client_id = case.client_id
        case_title = case.title
        client_name = case.client.full_name if case.client else ""
    elif invoice_in.consultation_id:
        consultation = db.query(models.Consultation).filter(
            models.Consultation.id == invoice_in.consultation_id,
            models.Consultation.lawyer_id == current_user.id
        ).first()
        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="الاستشارة غير موجودة أو لا تملك صلاحية الوصول إليها."
            )
        client_id = consultation.client_id
        case_title = "استشارة قانونية"
        client_name = consultation.client.full_name if consultation.client else ""
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="يجب ربط الفاتورة بقضية أو استشارة قانونية."
        )

    invoice = models.Invoice(
        case_id=invoice_in.case_id,
        consultation_id=invoice_in.consultation_id,
        client_id=client_id,
        amount=invoice_in.amount,
        description=invoice_in.description,
        due_date=invoice_in.due_date,
        status="unpaid"
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    # تنبيه الموكل بصدور فاتورة أتعاب جديدة
    trigger_notifications(
        db,
        user_id=client_id,
        title="صدور فاتورة أتعاب جديدة",
        content=f"تم إصدار فاتورة أتعاب جديدة مستحقة السداد بقيمة {float(invoice.amount):,.2f} ريال يمني لقضيتكم/استشارتكم '{case_title}'. التفاصيل: {invoice.description or 'أتعاب مهنية'}."
    )
    
    db.commit()
    
    return {
        "id": invoice.id,
        "case_id": invoice.case_id,
        "consultation_id": invoice.consultation_id,
        "client_id": invoice.client_id,
        "amount": float(invoice.amount),
        "description": invoice.description,
        "status": invoice.status,
        "due_date": invoice.due_date,
        "payment_method": invoice.payment_method,
        "transaction_id": invoice.transaction_id,
        "paid_at": invoice.paid_at,
        "created_at": invoice.created_at,
        "client_name": client_name,
        "case_title": case_title
    }

@app.get("/api/invoices", response_model=List[schemas.InvoiceResponse])
def list_invoices(
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    if current_user.role == "lawyer":
        # جلب الفواتير المرتبطة بقضايا المحامي
        case_invoices = db.query(models.Invoice).join(models.Case).filter(
            models.Case.lawyer_id == current_user.id
        ).all()
        # جلب الفواتير المرتبطة باستشارات المحامي
        consult_invoices = db.query(models.Invoice).join(models.Consultation).filter(
            models.Consultation.lawyer_id == current_user.id
        ).all()
        # دمج وترتيب حسب تاريخ الإنشاء
        invoices = list(set(case_invoices + consult_invoices))
        invoices.sort(key=lambda x: x.created_at, reverse=True)
    else:
        invoices = db.query(models.Invoice).filter(
            models.Invoice.client_id == current_user.id
        ).order_by(models.Invoice.created_at.desc()).all()
        
    return [
        {
            "id": inv.id,
            "case_id": inv.case_id,
            "consultation_id": inv.consultation_id,
            "client_id": inv.client_id,
            "amount": float(inv.amount),
            "description": inv.description,
            "status": inv.status,
            "due_date": inv.due_date,
            "payment_method": inv.payment_method,
            "transaction_id": inv.transaction_id,
            "paid_at": inv.paid_at,
            "created_at": inv.created_at,
            "client_name": inv.client.full_name if inv.client else "",
            "case_title": inv.case.title if inv.case else "استشارة قانونية"
        } for inv in invoices
    ]

@app.post("/api/invoices/{invoice_id}/pay", response_model=schemas.InvoiceResponse)
def pay_invoice(
    invoice_id: str,
    payment_in: schemas.InvoicePay,
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الفاتورة غير موجودة."
        )
        
    # التحقق من أن الموكل هو صاحب الفاتورة
    if invoice.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="لا تملك صلاحية دفع هذه الفاتورة."
        )
        
    if invoice.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="هذه الفاتورة مدفوعة بالفعل."
        )
        
    # محاكاة الدفع الإلكتروني وتوليد معرف العملية
    import uuid
    txn_suffix = str(uuid.uuid4()).split("-")[0].upper()
    simulated_txn = f"TXN-ARWA-{payment_in.payment_method.upper()}-{txn_suffix}"
    
    invoice.status = "paid"
    invoice.payment_method = payment_in.payment_method
    invoice.transaction_id = simulated_txn
    invoice.paid_at = datetime.utcnow()
    
    db.commit()
    db.refresh(invoice)
    
    # 1. إشعار للموكل (سند القبض)
    trigger_notifications(
        db,
        user_id=invoice.client_id,
        title="تأكيد سداد أتعاب مالية",
        content=f"شكراً لكم. تم سداد الفاتورة بقيمة {float(invoice.amount):,.2f} ريال يمني بنجاح عبر {invoice.payment_method}، وتوليد سند قبض موثق."
    )
    
    # 2. إشعار للمحامي (تلقي دفعة مالية)
    lawyer_id = None
    case_title = "استشارة قانونية"
    if invoice.case_id:
        case = db.query(models.Case).filter(models.Case.id == invoice.case_id).first()
        if case:
            lawyer_id = case.lawyer_id
            case_title = case.title
    elif invoice.consultation_id:
        consult = db.query(models.Consultation).filter(models.Consultation.id == invoice.consultation_id).first()
        if consult:
            lawyer_id = consult.lawyer_id
            case_title = "استشارة قانونية"
            
    if lawyer_id:
        trigger_notifications(
            db,
            user_id=lawyer_id,
            title="تلقي دفعة مالية جديدة",
            content=f"قام الموكل ({current_user.full_name}) بسداد الفاتورة المستحقة بقيمة {float(invoice.amount):,.2f} ريال يمني عبر {invoice.payment_method} لقضية/استشارة '{case_title}'."
        )
        db.commit()
    
    return {
        "id": invoice.id,
        "case_id": invoice.case_id,
        "consultation_id": invoice.consultation_id,
        "client_id": invoice.client_id,
        "amount": float(invoice.amount),
        "description": invoice.description,
        "status": invoice.status,
        "due_date": invoice.due_date,
        "payment_method": invoice.payment_method,
        "transaction_id": invoice.transaction_id,
        "paid_at": invoice.paid_at,
        "created_at": invoice.created_at,
        "client_name": invoice.client.full_name if invoice.client else "",
        "case_title": invoice.case.title if invoice.case else "استشارة قانونية"
    }

# ==================== إدارة الملف الشخصي للمحامي (Lawyer Profile Management) ====================

@app.get("/api/lawyers/profile", response_model=schemas.LawyerResponse)
def get_lawyer_profile(
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    if current_user.role != "lawyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="صلاحية الوصول للملف التعريفي مخصصة للمحامين."
        )
    
    lawyer = db.query(models.Lawyer).filter(models.Lawyer.id == current_user.id).first()
    if not lawyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الملف المهني للمحامي غير موجود."
        )
        
    return {
        "id": lawyer.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone_number": current_user.phone_number,
        "specialization": lawyer.specialization,
        "bio": lawyer.bio,
        "hourly_rate": float(lawyer.hourly_rate),
        "is_verified": lawyer.is_verified
    }

@app.put("/api/lawyers/profile", response_model=schemas.LawyerResponse)
def update_lawyer_profile(
    profile_in: schemas.LawyerProfileUpdate,
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    if current_user.role != "lawyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="صلاحية تحديث الملف التعريفي مخصصة للمحامين."
        )
        
    lawyer = db.query(models.Lawyer).filter(models.Lawyer.id == current_user.id).first()
    if not lawyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الملف المهني للمحامي غير موجود."
        )
        
    # تحديث البيانات الأساسية للمستخدم
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
    if profile_in.phone_number is not None:
        # التحقق من عدم تكرار رقم الهاتف لمستقبل آخر
        existing_phone = db.query(models.User).filter(
            models.User.phone_number == profile_in.phone_number,
            models.User.id != current_user.id
        ).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رقم الهاتف هذا مسجل بالفعل لمستخدم آخر."
            )
        current_user.phone_number = profile_in.phone_number
        
    # تحديث بيانات المحامي المهنية
    if profile_in.specialization is not None:
        lawyer.specialization = profile_in.specialization
    if profile_in.hourly_rate is not None:
        lawyer.hourly_rate = profile_in.hourly_rate
    if profile_in.bio is not None:
        lawyer.bio = profile_in.bio
        
    db.commit()
    db.refresh(lawyer)
    db.refresh(current_user)
    
    return {
        "id": lawyer.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone_number": current_user.phone_number,
        "specialization": lawyer.specialization,
        "bio": lawyer.bio,
        "hourly_rate": float(lawyer.hourly_rate),
        "is_verified": lawyer.is_verified
    }


# ==================== الإشعارات والمساعد الذكي وتحليل المستندات (Phase 3 Endpoints) ====================

@app.get("/api/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(current_user: models.User = Depends(get_user_by_auth_header), db: Session = Depends(get_db)):
    notifs = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()
    return notifs


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="التنبيه غير موجود.")
    notif.is_read = True
    db.commit()
    return {"message": "تم تحديد التنبيه كمقروء."}


YEMENI_LAW_ANSWERS = {
    "شيك": "وفقاً للمادة (367) من قانون العقوبات اليمني رقم (12) لسنة 1994، يعاقب بالحبس مدة لا تزيد على سنتين أو بغرامة مالية كل من أصدر بسوء نية شيكاً لا يقابله رصيد قائم وقابل للسحب. وتعتبر هذه الجريمة من الجرائم التجارية التي تختص بها النيابة العامة والمحاكم الجنائية.",
    "إيجار": "ينظم قانون المعاملات المدنية اليمني (المواد 540-590) أحكام عقد الإيجار. المبدأ العام هو 'العقد شريعة المتعاقدين'. لا يحق للمؤجر طرد المستأجر إلا في حالات محددة قانوناً مثل: الامتناع عن دفع الأجرة، أو إحداث ضرر جسيم بالعين المؤجرة، أو حاجة المؤجر للسكن الشخصي بشروط محددة.",
    "تضامن": "شركة التضامن في القانون التجاري اليمني (المادة 12 وما يليها): هي شركة تؤسس بين شخصين أو أكثر يكونون مسؤولين بالتضامن وفي جميع أموالهم عن ديون الشركة. يجب أن يشتمل عنوان الشركة على اسم واحد أو أكثر من الشركاء، ويتم قيدها في السجل التجاري بوزارة الصناعة والتجارة.",
    "حضانة": "طبقاً لقانون الأحوال الشخصية اليمني (المادة 138): الحضانة هي حفظ الولد وتربيته ورعايته. وتثبت الحضانة للأم ثم لأمها ثم للأب، وتستمر حضانة النساء للولد حتى سن التاسعة وللبنت حتى سن الحادية عشرة، ما لم يقرر القاضي خلاف ذلك لمصلحة المحضون.",
    "المحكمة التجارية": "تختص المحاكم التجارية في اليمن بالنظر في المنازعات الناشئة بين التجار والأنشطة التجارية (مثل العقود التجارية، الإفلاس، الشيكات والكمبيالات، والشركات) وفقاً لقانون المرافعات والتنفيذ المدني وقانون التجارة اليمني."
}


@app.post("/api/ai/chat", response_model=schemas.AIChatMessageResponse)
def send_ai_message(
    chat_in: schemas.AIChatMessageCreate,
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    user_msg = models.AIChatMessage(
        user_id=current_user.id,
        role="user",
        content=chat_in.content
    )
    db.add(user_msg)
    db.flush()
    
    matched_answer = None
    query_text = chat_in.content.lower()
    for key, answer in YEMENI_LAW_ANSWERS.items():
        if key in query_text:
            matched_answer = answer
            break
            
    if not matched_answer:
        matched_answer = "أهلاً بك في المساعد القانوني الذكي لمنصة أروى. بصفتي مستشاراً افتراضياً في القوانين اليمنية، يرجى تزويدي بالكلمات المفتاحية لمشكلتكم (مثل: شيك بدون رصيد، شروط تأسيس شركة، عقود الإيجار، حضانة الأطفال) لأتمكن من إرشادكم للمواد القانونية المناسبة في التشريع الجمهوري اليمني."
        
    assistant_msg = models.AIChatMessage(
        user_id=current_user.id,
        role="assistant",
        content=matched_answer
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    
    return assistant_msg


@app.get("/api/ai/chat", response_model=List[schemas.AIChatMessageResponse])
def get_ai_chat_history(
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    history = db.query(models.AIChatMessage).filter(
        models.AIChatMessage.user_id == current_user.id
    ).order_by(models.AIChatMessage.created_at.asc()).all()
    return history


def simulate_document_analysis(file_name: str, doc_type: str) -> str:
    if doc_type == "lease":
        return f"""### 📄 تقرير التحليل الذكي لعقد الإيجار ({file_name})
**المستند:** عقد إيجار عقار سكني/تجاري
**التشريع المطبق:** قانون المعاملات المدنية اليمني (المواد 540 - 580)

#### 1. ملخص البنود الأساسية:
* **الأطراف:** المؤجر والمستأجر المذكورين بالوثيقة.
* **الأجرة:** محددة وواجبة الدفع بالريال اليمني (YER).
* **المدة:** سنة واحدة قابلة للتجديد باتفاق الطرفين.

#### 2. تقييم المخاطر القانونية:
* ⚠️ **خطر الإخلاء المفاجئ:** لا توجد إشارة واضحة لمهلة الإخطار قبل الإخلاء. تنص المادة (556) من القانون المدني اليمني على وجوب إخطار المستأجر قبل فترة كافية (عادة 30 يوماً).
* ⚠️ **المسؤولية عن الصيانة:** العقد يحمّل المستأجر كافة تكاليف الصيانة التشغيلية والأساسية مما يخالف العرف القانوني اليمني الذي يلزم المؤجر بالصيانة الأساسية (الهيكل والسطح والسباكة الرئيسية).

#### 3. التوصيات القانونية المقترحة:
1. تعديل بند الصيانة ليتوافق مع المادة (562) معاملات مدنية يمنية.
2. إضافة بند يمنع زيادة الأجرة بأكثر من 10% عند التجديد تلافياً للنزاعات العشوائية.
"""
    elif doc_type == "commercial":
        return f"""### 📄 تقرير التحليل الذكي للاتفاقية التجارية ({file_name})
**المستند:** عقد شراكة / اتفاقية تجارية
**التشريع المطبق:** القانون التجاري اليمني رقم (22) لسنة 1991

#### 1. ملخص البنود الأساسية:
* **طبيعة العمل:** ممارسة نشاط تجاري مشترك وتأسيس شركة واقعية.
* **رأس المال:** مساهمات نقدية وعينية مقدرة بالريال اليمني.
* **الأرباح والخسائر:** توزع بنسبة حصة كل شريك في رأس المال.

#### 2. تقييم المخاطر القانونية:
* ⚠️ **المسؤولية التضامنية:** الشراكة غير المقيدة في السجل التجاري تعتبر شركة واقع وتخضع للمسؤولية التضامنية المطلقة لجميع الشركاء في أموالهم الخاصة وفقاً للمادة (25) قانون التجارة.
* ⚠️ **غياب شرط التحكيم:** النزاعات ستحال تلقائياً للمحاكم التجارية المكتظة، مما قد يطيل فترة التقاضي لسنوات.

#### 3. التوصيات القانونية المقترحة:
1. إدراج شرط التحكيم التجاري وفقاً لقانون التحكيم اليمني رقم (22) لسنة 1992 لتسريع فض النزاعات.
2. سرعة شهر الشركة وقيدها بالسجل التجاري بصنعاء للحد من المسؤولية الشخصية للشركاء.
"""
    else: # complaint / general
        return f"""### 📄 تقرير التحليل الذكي للائحة الدعوى ({file_name})
**المستند:** لائحة دعوى / دفوع قانونية
**التشريع المطبق:** قانون المرافعات والتنفيذ المدني اليمني رقم (40) لسنة 2002

#### 1. ملخص البنود الأساسية:
* **المدعي:** الطرف المطالب بالحق.
* **المدعى عليه:** الطرف المطلوب ضده الحكم.
* **الموضوع:** المطالبة بتعويض مالي وإخلال بالتزامات تعاقدية.

#### 2. تقييم المخاطر القانونية:
* ⚠️ **الاختصاص القضائي:** يجب التأكد من تقديم الدعوى أمام المحكمة المختصة محلياً ونوعياً (تجارية أو مدنية) لتفادي الدفع بعدم الاختصاص المادة (85) مرافعات.
* ⚠️ **عبء الإثبات:** تفتقر اللائحة لمرفقات كافية تثبت واقعة الضرر المباشر، مما يضعف موقف المدعي أمام القضاء اليمني.

#### 3. التوصيات القانونية المقترحة:
1. صياغة مذكرة جوابية تفصيلية تفند ادعاءات الخصم نقطة بنقطة.
2. تقديم الدفوع الشكلية (مثل الدفع بعدم قبول الدعوى لعدم الاختصاص) في أول جلسة قبل الدخول في الموضوع.
"""


@app.post("/api/documents/{doc_id}/analyze", response_model=schemas.DocumentResponse)
def analyze_document(
    doc_id: str,
    doc_type: str,  # lease, commercial, complaint
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="المستند غير موجود.")
        
    case = db.query(models.Case).filter(models.Case.id == doc.case_id).first()
    if not case or (current_user.id != case.lawyer_id and current_user.id != case.client_id):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية تحليل هذا المستند.")
        
    analysis_text = simulate_document_analysis(doc.file_name, doc_type)
    doc.ai_analysis = analysis_text
    db.commit()
    db.refresh(doc)
    
    # تنبيه بأن التحليل قد اكتمل
    trigger_notifications(
        db,
        user_id=current_user.id,
        title="اكتمل فحص وتحليل المستند",
        content=f"اكتمل التحليل القانوني الذكي للمستند '{doc.file_name}' بنجاح وفق تصنيف '{doc_type}'."
    )
    db.commit()
    db.refresh(doc)
    
    return doc


@app.get("/api/lawyer/analytics", response_model=schemas.LawyerAnalyticsResponse)
def get_lawyer_analytics(
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    if current_user.role != "lawyer":
        raise HTTPException(status_code=403, detail="صلاحية الوصول للتحليلات مخصصة للمحامين فقط.")
        
    # Cases stats
    cases = db.query(models.Case).filter(models.Case.lawyer_id == current_user.id).all()
    total_cases = len(cases)
    active_cases = len([c for c in cases if c.status == "active"])
    closed_cases = len([c for c in cases if c.status == "closed"])
    pending_cases = len([c for c in cases if c.status == "pending"])
    
    # Consultations stats
    consultations = db.query(models.Consultation).filter(models.Consultation.lawyer_id == current_user.id).all()
    total_consultations = len(consultations)
    pending_consultations = len([c for c in consultations if c.status == "pending"])
    accepted_consultations = len([c for c in consultations if c.status == "accepted" or c.status == "completed"])
    
    # Invoices revenue stats
    case_invoices = db.query(models.Invoice).join(models.Case).filter(models.Case.lawyer_id == current_user.id).all()
    consult_invoices = db.query(models.Invoice).join(models.Consultation).filter(models.Consultation.lawyer_id == current_user.id).all()
    all_invoices = list(set(case_invoices + consult_invoices))
    
    collected_revenue = sum(float(inv.amount) for inv in all_invoices if inv.status == "paid")
    pending_revenue = sum(float(inv.amount) for inv in all_invoices if inv.status == "unpaid")
    
    # Compute monthly revenues for the last 6 months
    arabic_months = {
        1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل", 5: "مايو", 6: "يونيو",
        7: "يوليو", 8: "أغسطس", 9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"
    }
    
    monthly_data = {}
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        target_date = now - timedelta(days=30 * i)
        month_num = target_date.month
        month_name = arabic_months[month_num]
        monthly_data[month_name] = 0.0
        
    for inv in all_invoices:
        if inv.status == "paid" and inv.paid_at:
            month_name = arabic_months[inv.paid_at.month]
            if month_name in monthly_data:
                monthly_data[month_name] += float(inv.amount)
                
    monthly_revenues = [{"month": m, "amount": amt} for m, amt in monthly_data.items()]
    
    case_status_distribution = [
        {"status": "نشطة", "count": active_cases},
        {"status": "مغلقة", "count": closed_cases},
        {"status": "معلقة", "count": pending_cases}
    ]
    
    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "closed_cases": closed_cases,
        "pending_cases": pending_cases,
        "total_consultations": total_consultations,
        "pending_consultations": pending_consultations,
        "accepted_consultations": accepted_consultations,
        "collected_revenue": collected_revenue,
        "pending_revenue": pending_revenue,
        "monthly_revenues": monthly_revenues,
        "case_status_distribution": case_status_distribution
    }


@app.get("/api/laws", response_model=List[schemas.LawBookResponse])
def search_laws(
    q: Optional[str] = None,
    law_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_user_by_auth_header)
):
    query = db.query(models.LawBook)
    if law_name:
        query = query.filter(models.LawBook.law_name == law_name)
        
    if q:
        search_filter = f"%{q}%"
        query = query.filter(
            (models.LawBook.content.like(search_filter)) | 
            (models.LawBook.keywords.like(search_filter)) |
            (models.LawBook.article_number.like(search_filter))
        )
        
    return query.limit(50).all()


@app.post("/api/consultations/{consult_id}/session-notes", response_model=schemas.ConsultationResponse)
def update_consultation_session_notes(
    consult_id: str,
    notes_in: schemas.ConsultationSessionNotesUpdate,
    current_user: models.User = Depends(get_user_by_auth_header),
    db: Session = Depends(get_db)
):
    consult = db.query(models.Consultation).filter(models.Consultation.id == consult_id).first()
    if not consult:
        raise HTTPException(status_code=404, detail="الاستشارة غير موجودة.")
        
    if current_user.id != consult.lawyer_id and current_user.id != consult.client_id:
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحية لتعديل ملاحظات هذه الاستشارة.")
        
    consult.session_notes = notes_in.session_notes
    db.commit()
    db.refresh(consult)
    
    return {
        "id": consult.id,
        "client_id": consult.client_id,
        "client_name": consult.client.full_name if consult.client else "",
        "lawyer_id": consult.lawyer_id,
        "lawyer_name": consult.lawyer.user.full_name if consult.lawyer and consult.lawyer.user else "",
        "date": consult.date,
        "status": consult.status,
        "notes": consult.notes,
        "session_notes": consult.session_notes
    }

# تركيب مجلد الواجهة الأمامية المبنية (React Dist) تلقائياً عند توفره (بيئة الإنتاج / Render)
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
frontend_dist_path = os.path.join(base_dir, "frontend", "dist")
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
