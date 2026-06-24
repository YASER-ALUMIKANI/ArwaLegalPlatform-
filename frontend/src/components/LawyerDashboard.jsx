import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api';

export default function LawyerDashboard({ token, user, onLogout, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  // نماذج الإدخال
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', court_name: '', case_number: '', client_email: '' });
  const [showHearingModal, setShowHearingModal] = useState(false);
  const [newHearing, setNewHearing] = useState({ hearing_date: '', room_number: '', summary: '' });
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ case_id: '', amount: '', description: '', due_date: '' });
  
  // إعدادات مكتب المحامي
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    specialization: 'تجاري',
    hourly_rate: '',
    bio: ''
  });
  
  const [chatMessage, setChatMessage] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // إضافات المرحلة الثالثة: الإشعارات والمساعد والتحليل
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [aiHistory, setAiHistory] = useState([]);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedDocForAnalysis, setSelectedDocForAnalysis] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('lease');
  const [analyzingDocId, setAnalyzingDocId] = useState(null);

  useEffect(() => {
    fetchCases();
    fetchConsultations();
    fetchInvoices();
    fetchProfile();
    fetchNotifications();
    fetchAiHistory();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 6000); // تحديث الإشعارات كل 6 ثوانٍ
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCase) {
      // تحديث بيانات القضية المفتوحة دورياً للمحادثة
      const interval = setInterval(() => {
        fetchCaseDetail(selectedCase.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedCase]);

  const fetchCases = async () => {
    try {
      const res = await fetch(`${API_BASE}/cases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConsultations = async () => {
    try {
      const res = await fetch(`${API_BASE}/consultations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConsultations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          case_id: newInvoice.case_id,
          amount: parseFloat(newInvoice.amount),
          description: newInvoice.description,
          due_date: newInvoice.due_date
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage('تم إصدار الفاتورة بالريال اليمني وإشعار الموكل بنجاح.');
        setShowInvoiceModal(false);
        setNewInvoice({ case_id: '', amount: '', description: '', due_date: '' });
        fetchInvoices();
      } else {
        setErrorMessage(data.detail || 'فشل إصدار الفاتورة.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ في الخادم أثناء إصدار الفاتورة.');
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/lawyers/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileForm({
          full_name: data.full_name,
          phone_number: data.phone_number,
          specialization: data.specialization,
          hourly_rate: data.hourly_rate,
          bio: data.bio || ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    try {
      await Promise.all(unread.map(n => 
        fetch(`${API_BASE}/notifications/${n.id}/read`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ));
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAiHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAiHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendAiQuery = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    const userText = aiQuery;
    setAiQuery('');
    setAiLoading(true);
    
    const tempUserMsg = { id: 'temp-user', role: 'user', content: userText, created_at: new Date().toISOString() };
    setAiHistory(prev => [...prev, tempUserMsg]);
    
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: userText })
      });
      if (res.ok) {
        const assistantMsg = await res.json();
        setTimeout(() => {
          setAiHistory(prev => [...prev.filter(m => m.id !== 'temp-user'), tempUserMsg, assistantMsg]);
          setAiLoading(false);
          const chatBox = document.getElementById('ai-chat-box');
          if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
          }
        }, 800);
      } else {
        setAiLoading(false);
      }
    } catch (err) {
      setAiLoading(false);
    }
  };

  const handleAnalyzeDocument = async (e) => {
    e.preventDefault();
    if (!selectedDocForAnalysis) return;
    setAnalyzingDocId(selectedDocForAnalysis.id);
    try {
      const res = await fetch(`${API_BASE}/documents/${selectedDocForAnalysis.id}/analyze?doc_type=${selectedDocType}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedDoc = await res.json();
        if (selectedCase) {
          setSelectedCase(prev => ({
            ...prev,
            documents: prev.documents.map(d => d.id === updatedDoc.id ? updatedDoc : d)
          }));
        }
        setAnalyzingDocId(null);
        setSelectedDocForAnalysis(updatedDoc);
        fetchNotifications();
      } else {
        setAnalyzingDocId(null);
      }
    } catch (err) {
      setAnalyzingDocId(null);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/lawyers/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: profileForm.full_name,
          phone_number: profileForm.phone_number,
          specialization: profileForm.specialization,
          hourly_rate: parseFloat(profileForm.hourly_rate),
          bio: profileForm.bio
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage('تم تحديث إعدادات وأسعار المكتب بنجاح.');
        if (onUpdateUser) {
          onUpdateUser(data);
        }
      } else {
        setErrorMessage(data.detail || 'فشل تحديث البيانات.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const fetchCaseDetail = async (caseId) => {
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCase(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCase)
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage('تم فتح ملف القضية بنجاح وتعيين الموكل.');
        setShowCaseModal(false);
        setNewCase({ title: '', court_name: '', case_number: '', client_email: '' });
        fetchCases();
      } else {
        setErrorMessage(data.detail || 'فشل إنشاء القضية.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ في الخادم.');
    }
  };

  const handleAddHearing = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    setStatusMessage('');
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/hearings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          case_id: selectedCase.id,
          ...newHearing
        })
      });
      if (res.ok) {
        setStatusMessage('تمت جدولة الجلسة بنجاح وتنبيه الموكل.');
        setShowHearingModal(false);
        setNewHearing({ hearing_date: '', room_number: '', summary: '' });
        fetchCaseDetail(selectedCase.id);
      } else {
        const data = await res.json();
        setErrorMessage(data.detail || 'فشل إضافة الجلسة.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ في الخادم.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedCase) return;
    try {
      const res = await fetch(`${API_BASE}/messages?case_id=${selectedCase.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: chatMessage })
      });
      if (res.ok) {
        setChatMessage('');
        fetchCaseDetail(selectedCase.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedCase) return;
    setStatusMessage('');
    setErrorMessage('');
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('case_id', selectedCase.id);
    formData.append('token', token); // لدعم التوثيق المتعدد

    try {
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setStatusMessage('تم رفع وتشفير المستند بنجاح ومشاركته.');
        setUploadFile(null);
        fetchCaseDetail(selectedCase.id);
      } else {
        const data = await res.json();
        setErrorMessage(data.detail || 'فشل رفع المستند.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء الرفع.');
    }
  };

  const handleUpdateConsultation = async (id, statusUpdate) => {
    try {
      const res = await fetch(`${API_BASE}/consultations/${id}?status_update=${statusUpdate}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchConsultations();
        fetchInvoices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const collectedRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingRevenue = invoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + inv.amount, 0);

  // توليد أحداث المخطط الزمني البصري المطور
  const timelineEvents = [];
  if (selectedCase) {
    timelineEvents.push({
      id: 'case-creation',
      title: "تأسيس القضية وقيدها بالمنصة",
      date: selectedCase.created_at,
      type: 'administrative',
      summary: `تم فتح ملف القضية تحت رقم قيد: ${selectedCase.case_number || 'غير مقيد'} بمحكمة: ${selectedCase.court_name || 'غير محددة'}.`
    });
    
    if (selectedCase.hearings) {
      selectedCase.hearings.forEach(h => {
        timelineEvents.push({
          id: h.id,
          title: `جلسة مرافعة قضائية`,
          date: h.hearing_date,
          type: 'active',
          summary: `📍 القاعة/الدائرة: ${h.room_number || 'غير محددة'} | ${h.summary || 'لا توجد ملاحظات إضافية'}`
        });
      });
    }

    if (selectedCase.documents) {
      selectedCase.documents.forEach(d => {
        timelineEvents.push({
          id: d.id,
          title: `مشاركة مستند وتشفيره`,
          date: d.uploaded_at,
          type: 'administrative',
          summary: `📄 رفع مستند: '${d.file_name}' بواسطة: ${d.uploaded_by_name || 'أحد الأطراف'}`
        });
      });
    }

    const caseInvoices = invoices.filter(inv => inv.case_id === selectedCase.id);
    caseInvoices.forEach(inv => {
      timelineEvents.push({
        id: `inv-${inv.id}`,
        title: `إصدار فاتورة أتعاب`,
        date: inv.created_at,
        type: 'active',
        summary: `💳 فاتورة بقيمة ${inv.amount.toLocaleString('ar-YE')} ر.ي مستحقة. الوصف: ${inv.description || ''}`
      });
      if (inv.status === 'paid' && inv.paid_at) {
        timelineEvents.push({
          id: `inv-paid-${inv.id}`,
          title: `سداد الدفعة المالية وتوثيق السند`,
          date: inv.paid_at,
          type: 'completed',
          summary: `✓ تم الدفع بنجاح بقيمة ${inv.amount.toLocaleString('ar-YE')} ر.ي عبر ${inv.payment_method === 'kuraimi' ? 'محفظة الكريمي' : inv.payment_method === 'floosak' ? 'محفظة فلوسك' : inv.payment_method === 'jawaly' ? 'محفظة جوالي' : inv.payment_method === 'mada' ? 'بطاقة مدى' : 'فيزا'} | معرف العملية: ${inv.transaction_id}`
        });
      }
    });

    timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return (
    <div className="dashboard-grid">
      {/* القائمة الجانبية */}
      <aside className="sidebar">
        <div>
          <h2 style={{ color: 'var(--accent-gold)', marginBottom: '8px' }}>منصة أروى</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>مكتب المحامي الرقمي</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('overview'); setSelectedCase(null); }}>💡 نظرة عامة</button>
          <button className={`btn ${activeTab === 'cases' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('cases'); setSelectedCase(null); }}>💼 القضايا والملفات ({cases.length})</button>
          <button className={`btn ${activeTab === 'consultations' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('consultations'); setSelectedCase(null); }}>📩 الاستشارات ({consultations.filter(c => c.status === 'pending').length})</button>
          <button className={`btn ${activeTab === 'billing' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('billing'); setSelectedCase(null); }}>💳 المالية والفواتير</button>
          <button className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('ai'); setSelectedCase(null); }}>🧠 المساعد القانوني</button>
          <button className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('settings'); setSelectedCase(null); }}>⚙️ إعدادات المكتب</button>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>مرحباً، أ. {user.full_name}</p>
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={onLogout}>تسجيل الخروج</button>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="main-content" onClick={() => setShowNotifDropdown(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {activeTab === 'overview' ? '💡 لوحة التحكم المهنية' : 
             activeTab === 'cases' ? '💼 سجل القضايا والملفات' :
             activeTab === 'consultations' ? '📩 طلبات الاستشارات القانونية' : 
             activeTab === 'billing' ? '💳 الشؤون المالية وإصدار الفواتير' : 
             activeTab === 'settings' ? '⚙️ إعدادات مكتب المحاماة والخدمات' : '🧠 المساعد القانوني الذكي لمنصة أروى'}
          </h3>
          
          <div className="header-actions">
            {/* جرس الإشعارات */}
            <div className="notif-container" onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(!showNotifDropdown); }}>
              <span className="notif-bell">
                🔔 {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </span>
              
              {showNotifDropdown && (
                <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="notif-dropdown-header">
                    <h4>تنبيهات المنصة والقنوات</h4>
                    {unreadCount > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleMarkAllNotifsRead}>
                        تعليم الكل كمقروء ✓
                      </span>
                    )}
                  </div>
                  <ul className="notif-list">
                    {notifications.map(n => (
                      <li key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => handleMarkNotifRead(n.id)}>
                        <div className="notif-item-title">
                          <span>{n.title}</span>
                          <span className={`notif-channel-badge notif-channel-${n.type}`}>
                            {n.channel}
                          </span>
                        </div>
                        <p className="notif-item-content">{n.content}</p>
                        <span className="notif-item-time">{new Date(n.created_at).toLocaleTimeString('ar-YE', {hour: '2-digit', minute:'2-digit'})} - {new Date(n.created_at).toLocaleDateString('ar-YE')}</span>
                      </li>
                    ))}
                    {notifications.length === 0 && (
                      <li style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>لا توجد أي تنبيهات حالية.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {statusMessage && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '15px' }}>✅ {statusMessage}</div>}
        {errorMessage && <div className="badge badge-warning" style={{ display: 'block', padding: '12px', marginBottom: '15px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>⚠️ {errorMessage}</div>}

        {/* 1. نظرة عامة */}
        {activeTab === 'overview' && !selectedCase && (
          <div>
            <h1 style={{ marginBottom: '20px' }}>لوحة التحكم المهنية</h1>
            <div className="card-grid">
              <div className="glass-panel lawyer-card">
                <h3>القضايا النشطة</h3>
                <h1 style={{ color: 'var(--accent-gold)', fontSize: '2.5rem' }}>{cases.filter(c => c.status === 'active').length}</h1>
                <p>قضايا متداولة حالياً بالمحكمة</p>
              </div>
              <div className="glass-panel lawyer-card">
                <h3>طلبات الاستشارة</h3>
                <h1 style={{ color: 'var(--accent-gold)', fontSize: '2.5rem' }}>{consultations.filter(c => c.status === 'pending').length}</h1>
                <p>طلبات قيد المراجعة والموافقة</p>
              </div>
              <div className="glass-panel lawyer-card">
                <h3>أتعاب محصلة</h3>
                <h1 style={{ color: 'var(--success)', fontSize: '2.2rem' }}>{collectedRevenue.toLocaleString('ar-YE')} <span style={{ fontSize: '0.9rem' }}>ر.ي</span></h1>
                <p>إجمالي المبالغ المستلمة بالريال اليمني</p>
              </div>
              <div className="glass-panel lawyer-card">
                <h3>مستحقات معلقة</h3>
                <h1 style={{ color: 'var(--warning)', fontSize: '2.2rem' }}>{pendingRevenue.toLocaleString('ar-YE')} <span style={{ fontSize: '0.9rem' }}>ر.ي</span></h1>
                <p>فواتير صادرة بانتظار السداد</p>
              </div>
            </div>
            
            {/* تقويم تفاعلي للمواعيد */}
            <div className="glass-panel" style={{ marginTop: '30px', padding: '24px' }}>
              <div className="calendar-widget">
                <div className="calendar-header">
                  <h3>أجندة المواعيد والجلسات</h3>
                  <p style={{ color: 'var(--accent-gold)' }}>اليوم: {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="calendar-days" style={{ marginTop: '15px' }}>
                  {['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(d => (
                    <div key={d} className="calendar-day-name">{d}</div>
                  ))}
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="calendar-cell">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. القضايا والملفات */}
        {activeTab === 'cases' && !selectedCase && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h1>سجل القضايا الموكلة</h1>
              <button className="btn btn-primary" onClick={() => setShowCaseModal(true)}>➕ فتح ملف قضية</button>
            </div>
            
            <div className="card-grid">
              {cases.map(c => (
                <div key={c.id} className="glass-panel lawyer-card" style={{ cursor: 'pointer' }} onClick={() => fetchCaseDetail(c.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="badge badge-success">{c.status === 'active' ? 'نشطة' : 'منتهية'}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>رقم: {c.case_number || 'غير مقيد'}</span>
                  </div>
                  <h3>{c.title}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>🏛️ {c.court_name || 'غير محدد'}</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--accent-gold)' }}>👤 الموكل: {c.client_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تفاصيل القضية المفتوحة */}
        {selectedCase && (
          <div>
            <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setSelectedCase(null)}>🔙 العودة للقائمة</button>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{selectedCase.title}</h2>
                <span className="badge badge-success">{selectedCase.status === 'active' ? 'نشطة' : 'مغلقة'}</span>
              </div>
              <p style={{ marginTop: '10px' }}>🏛️ <strong>المحكمة:</strong> {selectedCase.court_name || 'غير محدد'} | ⚖️ <strong>رقم القضية:</strong> {selectedCase.case_number || 'غير مقيد'}</p>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '15px', paddingTop: '15px' }}>
                <p>👤 <strong>بيانات الموكل:</strong> {selectedCase.client_name} ({selectedCase.client_phone} - {selectedCase.client_email})</p>
              </div>
            </div>

            {/* المخطط الزمني والدردشة والتخزين */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* القسم الأيمن: الجلسات والوثائق */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* الجلسات والمخطط الزمني */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3>📅 المخطط الزمني البصري المطور وسجل الأحداث</h3>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowHearingModal(true)}>جدولة جلسة</button>
                  </div>
                  <div className="premium-roadmap">
                    {timelineEvents.map((evt, idx) => (
                      <div key={evt.id || idx} className={`roadmap-step ${evt.type}`}>
                        <div className="roadmap-glow-dot"></div>
                        <div className="roadmap-card-panel">
                          <div className="roadmap-card-header">
                            <span className="roadmap-card-title">{evt.title}</span>
                            <span className="roadmap-card-date">
                              {new Date(evt.date).toLocaleDateString('ar-YE')} {new Date(evt.date).toLocaleTimeString('ar-YE', {hour:'2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45' }}>
                            {evt.summary}
                          </p>
                        </div>
                      </div>
                    ))}
                    {timelineEvents.length === 0 && (
                      <p style={{ color: 'var(--text-secondary)' }}>لا توجد أحداث مسجلة لهذه القضية.</p>
                    )}
                  </div>
                </div>

                {/* الوثائق */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3>📂 أرشفة المستندات</h3>
                  <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
                    <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} className="form-input" style={{ padding: '6px' }} required />
                    <button type="submit" className="btn btn-primary">رفع مشفر</button>
                  </form>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {selectedCase.documents && selectedCase.documents.map(d => (
                      <li key={d.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>📄 {d.file_name}</span>
                          <a href={`http://localhost:8000${d.file_url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontSize: '0.85rem' }}>تحميل 📥</a>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>بواسطة: {d.uploaded_by_name || 'أحد الأطراف'}</span>
                          
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} 
                            onClick={() => { setSelectedDocForAnalysis(d); setShowAnalysisModal(true); }}
                          >
                            {d.ai_analysis ? '📊 عرض التقرير الذكي' : '🧠 فحص بالذكاء الاصطناعي'}
                          </button>
                        </div>
                      </li>
                    ))}
                    {(!selectedCase.documents || selectedCase.documents.length === 0) && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>لا توجد مستندات مرفوعة بعد.</p>
                    )}
                  </ul>
                </div>
              </div>

              {/* القسم الأيسر: المراسلة الفورية مع الموكل */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '15px' }}>💬 قناة تواصل آمنة ومشفرة</h3>
                <div className="chat-container">
                  <div className="chat-messages">
                    {selectedCase.messages && selectedCase.messages.map(m => (
                      <div key={m.id} className={`chat-bubble ${m.sender_id === user.id ? 'mine' : 'other'}`}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginBottom: '2px' }}>{m.sender_name}</p>
                        <p>{m.content}</p>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textAlign: 'left', marginTop: '4px' }}>{new Date(m.sent_at).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="chat-input-area">
                    <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} className="form-input" placeholder="اكتب رسالتك للموكل..." />
                    <button type="submit" className="btn btn-primary">إرسال</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. الاستشارات */}
        {activeTab === 'consultations' && !selectedCase && (
          <div>
            <h1>طلبات الاستشارات القانونية</h1>
            <div style={{ marginTop: '20px' }}>
              {consultations.map(c => (
                <div key={c.id} className="glass-panel" style={{ padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>👤 الموكل: {c.client_name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📅 الموعد المقترح: {new Date(c.date).toLocaleString('ar-EG')}</p>
                    {c.notes && <p style={{ marginTop: '5px', fontSize: '0.85rem' }}>💬 تفاصيل: {c.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {c.status === 'pending' ? (
                      <>
                        <button className="btn btn-primary" onClick={() => handleUpdateConsultation(c.id, 'accepted')}>قبول الموعد</button>
                        <button className="btn btn-danger" onClick={() => handleUpdateConsultation(c.id, 'rejected')}>رفض</button>
                      </>
                    ) : (
                      <span className="badge badge-success">{c.status === 'accepted' ? 'مقبولة' : c.status === 'completed' ? 'منتهية' : 'مرفوضة'}</span>
                    )}
                  </div>
                </div>
              ))}
              {consultations.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>لا توجد طلبات استشارات حالية.</p>}
            </div>
          </div>
        )}

        {/* 4. الشؤون المالية والفواتير */}
        {activeTab === 'billing' && !selectedCase && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h1>الشؤون المالية وإصدار الفواتير</h1>
              <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>➕ إصدار فاتورة جديدة</button>
            </div>

            <div className="card-grid" style={{ marginBottom: '30px' }}>
              <div className="glass-panel lawyer-card" style={{ borderRight: '4px solid var(--success)' }}>
                <h3>إجمالي المبالغ المحصلة</h3>
                <h1 style={{ color: 'var(--success)', fontSize: '2.2rem' }}>{collectedRevenue.toLocaleString('ar-YE')} <span style={{ fontSize: '1rem' }}>ريال يمني</span></h1>
                <p>أتعاب مدفوعة ومؤكدة بالكامل</p>
              </div>
              <div className="glass-panel lawyer-card" style={{ borderRight: '4px solid var(--warning)' }}>
                <h3>إجمالي المبالغ المعلقة</h3>
                <h1 style={{ color: 'var(--warning)', fontSize: '2.2rem' }}>{pendingRevenue.toLocaleString('ar-YE')} <span style={{ fontSize: '1rem' }}>ريال يمني</span></h1>
                <p>أتعاب بانتظار سداد الموكلين</p>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3>سجل الفواتير الصادرة</h3>
              <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>رقم القضية / المسمى</th>
                      <th>الموكل</th>
                      <th>المبلغ المطلوب</th>
                      <th>الوصف</th>
                      <th>تاريخ الاستحقاق</th>
                      <th>طريقة الدفع</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td>
                          <strong>{inv.case_title || 'غير محدد'}</strong>
                        </td>
                        <td>{inv.client_name}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>{inv.amount.toLocaleString('ar-YE')} ر.ي</td>
                        <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{inv.description || '-'}</td>
                        <td>{new Date(inv.due_date).toLocaleDateString('ar-YE')}</td>
                        <td>
                          {inv.payment_method ? (
                            <span className="badge badge-success" style={{ background: 'rgba(30, 58, 96, 0.2)', color: 'var(--text-primary)' }}>
                              {inv.payment_method === 'kuraimi' ? 'محفظة الكريمي' : 
                               inv.payment_method === 'floosak' ? 'محفظة فلوسك' :
                               inv.payment_method === 'jawaly' ? 'محفظة جوالي' :
                               inv.payment_method === 'mada' ? 'بطاقة مدى' : 'بطاقة فيزا'}
                            </span>
                          ) : '-'}
                        </td>
                        <td>
                          <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {inv.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>لا توجد فواتير صادرة بعد.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. إعدادات مكتب المحاماة والخدمات */}
        {activeTab === 'settings' && !selectedCase && (
          <div>
            <h1>إعدادات مكتب المحاماة والخدمات</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>تتيح لك هذه الصفحة تعديل أسعار الاستشارات القانونية، التخصص الرئيسي، والبيانات المهنية للمكتب.</p>
            
            <form onSubmit={handleUpdateProfile} className="glass-panel" style={{ padding: '30px', maxWidth: '600px' }}>
              <h3 style={{ color: 'var(--accent-gold)', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>⚙️ تهيئة أسعار الخدمات والتخصص</h3>
              
              <div className="form-group">
                <label className="form-label">الاسم المهني للمحامي (كامل باللغة العربية)</label>
                <input 
                  type="text" 
                  value={profileForm.full_name} 
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} 
                  className="form-input" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف (الواتساب المعتمد للتواصل)</label>
                <input 
                  type="text" 
                  value={profileForm.phone_number} 
                  onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} 
                  className="form-input" 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">نوع التخصص (نوع القضايا)</label>
                  <select 
                    value={profileForm.specialization} 
                    onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })} 
                    className="form-input"
                  >
                    <option value="تجاري">تجاري وشركات</option>
                    <option value="جنائي">قضايا جنائية</option>
                    <option value="مدني">حقوق ومدني</option>
                    <option value="أحوال شخصية">أحوال شخصية ومواريث</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">سعر ساعة الاستشارة (بالريال اليمني)</label>
                  <input 
                    type="number" 
                    value={profileForm.hourly_rate} 
                    onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })} 
                    className="form-input" 
                    min="100"
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">نبذة تعريفية شاملة عن المكتب وعنوانه وخبراته</label>
                <textarea 
                  value={profileForm.bio} 
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} 
                  className="form-input" 
                  rows="5" 
                  placeholder="اكتب تفاصيل الخبرات والشهادات لمساعدة العملاء في اختياركم..."
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', padding: '12px' }}>
                💾 حفظ وتطبيق التحديثات
              </button>
            </form>
          </div>
        )}

        {/* 6. المساعد القانوني الذكي */}
        {activeTab === 'ai' && !selectedCase && (
          <div className="ai-assistant-container">
            <h1>🧠 المساعد القانوني الذكي (التشريع اليمني)</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
              اسأل المساعد الذكي حول القوانين التجارية والمدنية وقوانين الأحوال الشخصية في الجمهورية اليمنية.
            </p>
            
            <div className="ai-chat-box" id="ai-chat-box">
              {aiHistory.map((msg, idx) => (
                <div key={msg.id || idx} className={`ai-bubble ${msg.role}`}>
                  <p style={{ fontWeight: 'bold', color: 'var(--accent-gold)', fontSize: '0.8rem', marginBottom: '4px' }}>
                    {msg.role === 'user' ? '👤 أنت' : '🧠 مستشار أروى الذكي'}
                  </p>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
              ))}
              {aiLoading && (
                <div className="typing-indicator">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '6px' }}>أروى تفكر</span>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              {aiHistory.length === 0 && !aiLoading && (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                  <span style={{ fontSize: '3rem' }}>🧠</span>
                  <h3>اسأل عن القوانين اليمنية</h3>
                  <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                    اكتب سؤالك بالأسفل مثل "ما هي شروط تأسيس شركة تضامن؟" أو "ما شروط طرد المستأجر في القانون اليمني؟"
                  </p>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSendAiQuery} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={aiQuery} 
                onChange={(e) => setAiQuery(e.target.value)} 
                className="form-input" 
                placeholder="اكتب استشارتك القانونية هنا..."
                style={{ flex: 1 }}
                required 
              />
              <button type="submit" className="btn btn-primary" disabled={aiLoading}>
                {aiLoading ? 'جاري الإرسال...' : 'إرسال الاستفسار ⚡'}
              </button>
            </form>
          </div>
        )}

        {/* مودال فتح ملف قضية */}
        {showCaseModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '450px', background: 'var(--bg-secondary)' }}>
              <h2>فتح ملف قضية جديد</h2>
              <form onSubmit={handleCreateCase} style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني للموكل (يجب أن يكون مسجلاً بالمنصة)</label>
                  <input type="email" value={newCase.client_email} onChange={(e) => setNewCase({ ...newCase, client_email: e.target.value })} className="form-input" placeholder="client@example.com" required />
                </div>
                <div className="form-group">
                  <label className="form-label">عنوان القضية</label>
                  <input type="text" value={newCase.title} onChange={(e) => setNewCase({ ...newCase, title: e.target.value })} className="form-input" placeholder="مثال: دعوى إثبات ملكية عقار" required />
                </div>
                <div className="form-group">
                  <label className="form-label">المحكمة / الدائرة</label>
                  <input type="text" value={newCase.court_name} onChange={(e) => setNewCase({ ...newCase, court_name: e.target.value })} className="form-input" placeholder="مثال: المحكمة التجارية بصنعاء" />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم قيد القضية (اختياري)</label>
                  <input type="text" value={newCase.case_number} onChange={(e) => setNewCase({ ...newCase, case_number: e.target.value })} className="form-input" placeholder="مثال: 124/ب لسنة 2026" />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary">حفظ وتأكيد</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCaseModal(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* مودال جدولة جلسة */}
        {showHearingModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '450px', background: 'var(--bg-secondary)' }}>
              <h2>جدولة جلسة مرافعة جديدة</h2>
              <form onSubmit={handleAddHearing} style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">تاريخ ووقت الجلسة</label>
                  <input type="datetime-local" value={newHearing.hearing_date} onChange={(e) => setNewHearing({ ...newHearing, hearing_date: e.target.value })} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">قاعة المحكمة / الدائرة</label>
                  <input type="text" value={newHearing.room_number} onChange={(e) => setNewHearing({ ...newHearing, room_number: e.target.value })} className="form-input" placeholder="قاعة 3، الدائرة التجارية الثانية" />
                </div>
                <div className="form-group">
                  <label className="form-label">ملخص الجلسة المتوقع / الملاحظة (اختياري)</label>
                  <textarea value={newHearing.summary} onChange={(e) => setNewHearing({ ...newHearing, summary: e.target.value })} className="form-input" rows="3" placeholder="تقديم مستندات الملكية والرد على دفع الخصم..."></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary">تأكيد الجدولة</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowHearingModal(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* مودال إصدار فاتورة جديدة */}
        {showInvoiceModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '450px', background: 'var(--bg-secondary)' }}>
              <h2>إصدار فاتورة أتعاب جديدة</h2>
              <form onSubmit={handleCreateInvoice} style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">اختر القضية المرتبطة</label>
                  <select 
                    value={newInvoice.case_id} 
                    onChange={(e) => setNewInvoice({ ...newInvoice, case_id: e.target.value })} 
                    className="form-input" 
                    required
                  >
                    <option value="">-- اختر من القضايا النشطة --</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.title} (الموكل: {c.client_name})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">المبلغ المطلوب (بالريال اليمني)</label>
                  <input 
                    type="number" 
                    value={newInvoice.amount} 
                    onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })} 
                    className="form-input" 
                    placeholder="مثال: 75000" 
                    min="1"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الاستحقاق</label>
                  <input 
                    type="date" 
                    value={newInvoice.due_date} 
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })} 
                    className="form-input" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">وصف المطالبة المالية / التفاصيل</label>
                  <textarea 
                    value={newInvoice.description} 
                    onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })} 
                    className="form-input" 
                    rows="3" 
                    placeholder="مثال: أتعاب كتابة اللائحة الجوابية وتقديمها للمحكمة التجارية..."
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary">إصدار وإرسال</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* مودال تحليل الوثيقة بالذكاء الاصطناعي */}
        {showAnalysisModal && selectedDocForAnalysis && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '600px', background: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2>🧠 التحليل القانوني الذكي للوثيقة</h2>
                <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--text-secondary)' }} onClick={() => { setShowAnalysisModal(false); setSelectedDocForAnalysis(null); }}>❌</button>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                اسم الملف: <strong>{selectedDocForAnalysis.file_name}</strong>
              </p>

              {selectedDocForAnalysis.ai_analysis ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px', whiteSpace: 'pre-wrap', fontSize: '0.9rem', direction: 'rtl', textAlign: 'right' }}>
                  {selectedDocForAnalysis.ai_analysis}
                </div>
              ) : (
                <form onSubmit={handleAnalyzeDocument} style={{ marginTop: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">حدد نوع الوثيقة لتخصيص عملية التحليل القانوني:</label>
                    <select 
                      value={selectedDocType} 
                      onChange={(e) => setSelectedDocType(e.target.value)} 
                      className="form-input"
                    >
                      <option value="lease">عقد إيجار عقار (سكني / تجاري)</option>
                      <option value="commercial">عقد شراكة أو اتفاقية تجارية</option>
                      <option value="complaint">عريضة دعوى أو مذكرة قانونية</option>
                    </select>
                  </div>
                  
                  {analyzingDocId === selectedDocForAnalysis.id ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}>
                      <div className="typing-indicator" style={{ display: 'inline-flex', alignSelf: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', marginRight: '8px' }}>جاري فحص وتلخيص البنود وتحليل المخاطر...</span>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  ) : (
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                      ⚡ تشغيل فحص الذكاء الاصطناعي
                    </button>
                  )}
                </form>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAnalysisModal(false); setSelectedDocForAnalysis(null); }}>إغلاق</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
