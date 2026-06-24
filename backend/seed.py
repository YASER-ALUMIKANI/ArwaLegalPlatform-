import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app import models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_data():
    print("إعادة تهيئة قاعدة البيانات وإسقاط الجداول القديمة...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("بدء إدخال البيانات التجريبية...")

        # 1. إنشاء حساب المحامي
        lawyer_pwd = get_password_hash("password123")
        lawyer_user = models.User(
            full_name="أ. معاذ اليماني",
            email="lawyer@test.com",
            phone_number="+967777111222",
            password_hash=lawyer_pwd,
            role="lawyer"
        )
        db.add(lawyer_user)
        db.flush()  # توليد المعرف id

        lawyer_profile = models.Lawyer(
            id=lawyer_user.id,
            license_number="نقابة/صنعاء/2026",
            specialization="تجاري",
            bio="مكتب المحاماة التجاري الرائد بصنعاء. خبرة 15 عاماً في العقود والشركات.",
            hourly_rate=150.0,
            is_verified=True
        )
        db.add(lawyer_profile)

        # 2. إنشاء حساب الموكل
        client_pwd = get_password_hash("password123")
        client_user = models.User(
            full_name="أحمد بن علي",
            email="client@test.com",
            phone_number="+967771234567",
            password_hash=client_pwd,
            role="client"
        )
        db.add(client_user)
        db.flush()

        # 3. إنشاء قضية تجريبية مشتركة بينهما
        case = models.Case(
            case_number="55/تجاري لسنة 2026",
            title="دعوى تصفية شركة تجارية وحساب الأرباح",
            court_name="المحكمة التجارية بصنعاء - الدائرة الثانية",
            client_id=client_user.id,
            lawyer_id=lawyer_user.id,
            status="active"
        )
        db.add(case)
        db.flush()

        # 4. جدولة جلسة مرافعة تجريبية
        hearing = models.Hearing(
            case_id=case.id,
            hearing_date=datetime.datetime(2026, 7, 15, 10, 0),
            room_number="القاعة الكبرى - الطابق الثاني",
            summary="تقديم مستندات التأسيس والرد على الدفع بالتقادم المقدم من المدعى عليه."
        )
        db.add(hearing)

        # 5. إرسال رسائل ترحيب متبادلة بالدردشة
        msg1 = models.Message(
            case_id=case.id,
            sender_id=lawyer_user.id,
            content="أهلاً بك يا أحمد في منصة أروى. لقد تم قيد القضية بنجاح وجدولة أولى الجلسات في المحكمة التجارية.",
            sent_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
        )
        db.add(msg1)

        msg2 = models.Message(
            case_id=case.id,
            sender_id=client_user.id,
            content="أهلاً بك أ. معاذ، أشكرك على سرعة الإجراء. سأقوم برفع العقد الأصلي للمراجعة اليوم.",
            sent_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        )
        db.add(msg2)

        # 6. طلب استشارة جديدة قيد الانتظار (من عميل آخر تجريبي)
        another_client_pwd = get_password_hash("password123")
        another_client = models.User(
            full_name="فاطمة صالح",
            email="fatima@test.com",
            phone_number="+96777222333",
            password_hash=another_client_pwd,
            role="client"
        )
        db.add(another_client)
        db.flush()

        consultation = models.Consultation(
            client_id=another_client.id,
            lawyer_id=lawyer_profile.id,
            date=datetime.datetime(2026, 6, 28, 16, 30),
            notes="بحاجة لاستشارة حول صياغة عقد توريد لشركة أدوية وتجنب الثغرات .",
            status="pending"
        )
        db.add(consultation)

        db.commit()
        print("تم إدخال البيانات التجريبية بنجاح!")
        print("\nبيانات الدخول للاختبار:")
        print("-----------------------")
        print("1. حساب المحامي:")
        print("   البريد الإلكتروني: lawyer@test.com")
        print("   كلمة المرور: password123")
        print("-----------------------")
        print("2. حساب الموكل:")
        print("   البريد الإلكتروني: client@test.com")
        print("   كلمة المرور: password123")
        print("-----------------------")
        print("3. حساب موكل آخر (طلب استشارة معلق):")
        print("   البريد الإلكتروني: fatima@test.com")
        print("   كلمة المرور: password123")

    except Exception as e:
        db.rollback()
        print(f"حدث خطأ أثناء إدخال البيانات: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
