import React, { useState, useEffect } from 'react';
import LawyerDashboard from './components/LawyerDashboard';
import ClientDashboard from './components/ClientDashboard';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('arwa_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('arwa_user') || 'null'));
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  
  // حقول التسجيل
  const [role, setRole] = useState('client');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // حقول إضافية للمحامي
  const [license, setLicense] = useState('');
  const [specialization, setSpecialization] = useState('تجاري');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState(100);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('arwa_token');
    localStorage.removeItem('arwa_user');
    setToken('');
    setUser(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('arwa_token', data.access_token);
        localStorage.setItem('arwa_user', JSON.stringify({ id: data.user_id, full_name: data.full_name, role: data.role }));
        setToken(data.access_token);
        setUser({ id: data.user_id, full_name: data.full_name, role: data.role });
      } else {
        setErrorMessage(data.detail || 'فشل تسجيل الدخول، يرجى التحقق من المدخلات.');
      }
    } catch (err) {
      setErrorMessage('تعذر الاتصال بالخادم الخلفي.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    const bodyData = {
      full_name: fullName,
      email,
      phone_number: phone,
      password,
      role,
      license_number: role === 'lawyer' ? license : null,
      specialization: role === 'lawyer' ? specialization : null,
      bio: role === 'lawyer' ? bio : null,
      hourly_rate: role === 'lawyer' ? parseFloat(hourlyRate) : null
    };

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
        setAuthView('login');
      } else {
        setErrorMessage(data.detail || 'فشل إنشاء الحساب.');
      }
    } catch (err) {
      setErrorMessage('تعذر الاتصال بالخادم الخلفي.');
    }
  };

  const handleUpdateUser = (updatedUser) => {
    const freshUser = { id: updatedUser.id, full_name: updatedUser.full_name, role: user.role };
    localStorage.setItem('arwa_user', JSON.stringify(freshUser));
    setUser(freshUser);
  };

  // توجيه المستخدم للوحة المناسبة إذا سجل دخوله
  if (token && user) {
    if (user.role === 'lawyer') {
      return <LawyerDashboard token={token} user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
    } else {
      return <ClientDashboard token={token} user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px', background: 'var(--bg-secondary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: 'var(--accent-gold)', fontSize: '2.2rem', marginBottom: '8px' }}>منصة أروى القانونية</h1>
          <p style={{ color: 'var(--text-secondary)' }}>بوابتك الرقمية للعدالة والاستشارات القانونية المتكاملة</p>
        </div>

        {errorMessage && <div className="badge badge-warning" style={{ display: 'block', padding: '12px', marginBottom: '20px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>⚠️ {errorMessage}</div>}
        {successMessage && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '20px' }}>✅ {successMessage}</div>}

        {authView === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="mail@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', padding: '14px' }}>تسجيل الدخول</button>
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              ليس لديك حساب؟{' '}
              <span style={{ color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setAuthView('register'); setErrorMessage(''); }}>إنشاء حساب جديد</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">نوع الحساب</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="radio" name="role" value="client" checked={role === 'client'} onChange={() => setRole('client')} /> موكل (صاحب قضية)
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="radio" name="role" value="lawyer" checked={role === 'lawyer'} onChange={() => setRole('lawyer')} /> محامٍ (مكتب استشاري)
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">الاسم الكامل (الثلاثي باللغة العربية)</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" placeholder="أحمد محمد اليماني" required />
            </div>

            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="mail@example.com" required />
            </div>

            <div className="form-group">
              <label className="form-label">رقم الجوال (مع رمز الدولة)</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" placeholder="+967777777777" required />
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="••••••••" required />
            </div>

            {/* تفاصيل إضافية للمحامي */}
            {role === 'lawyer' && (
              <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <h4 style={{ color: 'var(--accent-gold)', marginBottom: '12px' }}>معلومات الترخيص المهني</h4>
                <div className="form-group">
                  <label className="form-label">رقم رخصة مزاولة المهنة (نقابة المحامين)</label>
                  <input type="text" value={license} onChange={(e) => setLicense(e.target.value)} className="form-input" placeholder="مثال: نقابة/صنعاء/1024" required />
                </div>
                <div className="form-group">
                  <label className="form-label">التخصص الرئيسي</label>
                  <select value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="form-input">
                    <option value="تجاري">تجاري وشركات</option>
                    <option value="جنائي">قضايا جنائية</option>
                    <option value="مدني">حقوق ومدني</option>
                    <option value="أحوال شخصية">أحوال شخصية ومواريث</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">التكلفة التقريبية للاستشارة (بالساعة)</label>
                  <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">نبذة تعريفية وموجز الخبرات المهنية</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="form-input" rows="3" placeholder="اكتب نبذة عن مكتبكم وخبراتكم القضائية..."></textarea>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', padding: '14px' }}>إنشاء الحساب وتفعيل البوابة</button>
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              لديك حساب بالفعل؟{' '}
              <span style={{ color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setAuthView('login'); setErrorMessage(''); }}>تسجيل الدخول</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
