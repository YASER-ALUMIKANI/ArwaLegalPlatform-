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

        # استشارة مقبولة للموكل الرئيسي للتجربة الفورية لغرفة الاستشارة
        consultation_accepted = models.Consultation(
            client_id=client_user.id,
            lawyer_id=lawyer_profile.id,
            date=datetime.datetime(2026, 6, 25, 10, 0),
            notes="استشارة عاجلة بخصوص عقد الإيجار وصيانة العين المؤجرة.",
            status="accepted",
            session_notes="الاتفاق المبدئي: صياغة ملحق للعقد يوضح بالتفصيل مسؤوليات الصيانة الهيكلية والتشغيلية."
        )
        db.add(consultation_accepted)

        # 7. إدخال مواد التشريعات والقوانين اليمنية
        print("إدخال نصوص ومواد القوانين اليمنية المرجعية...")
        laws = [
            models.LawBook(
                law_name="القانون المدني اليمني",
                chapter="عقد الإيجار",
                article_number="المادة (541)",
                content="الإيجار تمليك منفعة مقصودة للمستأجر في مقابل عوض معلوم لمدة معينة.",
                keywords="إيجار منفعة عقد عوض مدة تعريف"
            ),
            models.LawBook(
                law_name="القانون المدني اليمني",
                chapter="عقد الإيجار",
                article_number="المادة (556)",
                content="يجب على المؤجر أن يخطر المستأجر بإخلاء العين المؤجرة قبل انتهاء المدة المتفق عليها بثلاثين يوماً على الأقل في العقارات السكنية، وستين يوماً في العقارات التجارية، وإلا اعتبر العقد مجدداً بنفس الشروط تلقائياً.",
                keywords="إخلاء إنهاء إيجار إخطار تجديد مهلة"
            ),
            models.LawBook(
                law_name="القانون المدني اليمني",
                chapter="عقد الإيجار",
                article_number="المادة (562)",
                content="يتحمل المؤجر الصيانة الأساسية للعين المؤجرة مثل الهياكل والأسطح والتمديدات الرئيسية للسباكة والكهرباء، بينما يتحمل المستأجر الصيانة التشغيلية الناتجة عن الاستخدام اليومي.",
                keywords="صيانة ترميم إصلاح سباكة كهرباء هيكل"
            ),
            models.LawBook(
                law_name="القانون التجاري اليمني",
                chapter="شركة التضامن",
                article_number="المادة (12)",
                content="تتألف شركة التضامن من شخصين أو أكثر مسؤولين مسؤولية تضامنية وشخصية مطلقة في جميع أموالهم عن التزامات الشركة وديونها.",
                keywords="تضامن شركة ديون مسؤولية شركاء تضامنية"
            ),
            models.LawBook(
                law_name="القانون التجاري اليمني",
                chapter="السجل التجاري",
                article_number="المادة (25)",
                content="يجب على كل تاجر أو شركة تجارية القيد بالسجل التجاري التابع لوزارة الصناعة والتجارة خلال شهر من بدء ممارسة النشاط لتجنب الغرامات والمسؤوليات الشخصية القانونية.",
                keywords="سجل تجاري قيد رخصة وزارة عقوبة غرامة"
            ),
            models.LawBook(
                law_name="قانون العقوبات اليمني",
                chapter="جرائم الشيكات",
                article_number="المادة (367)",
                content="يعاقب بالحبس مدة لا تزيد على سنتين أو بغرامة مالية كل من أصدر بسوء نية شيكاً لا يقابله رصيد قائم وقابل للسحب، أو استرجع الرصيد كله أو بعضه بعد إعطاء الشيك.",
                keywords="شيك رصيد سحب عقوبة حبس غرامة عقوبات"
            ),
            models.LawBook(
                law_name="قانون الأحوال الشخصية اليمني",
                chapter="أحكام الحضانة",
                article_number="المادة (138)",
                content="الحضانة هي حفظ الولد وتربيته ورعايته وتثبت للأم ثم لأمها ثم للأب، وتستمر حضانة النساء للولد حتى سن التاسعة وللبنت حتى سن الحادية عشرة.",
                keywords="حضانة طفل رعاية أم أب أولاد الأحوال الشخصية"
            )
        ]
        for law in laws:
            db.add(law)

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
