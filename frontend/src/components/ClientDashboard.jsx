import React, { useState, useEffect } from 'react';
import ConsultationCall from './shared/ConsultationCall';
import { API_BASE } from '../config/api';

export default function ClientDashboard({ token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [lawyers, setLawyers] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  // فلاتر البحث عن المحامين
  const [searchQuery, setSearchQuery] = useState('');
  const [specFilter, setSpecFilter] = useState('');
  
  // نماذج الإدخال
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [bookDetails, setBookDetails] = useState({ date: '', notes: '' });
  
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState(null);
  
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

  // إضافات المرحلة الرابعة: مكتبة القوانين وغرفة الاستشارة الافتراضية
  const [lawsList, setLawsList] = useState([]);
  const [lawSearchQuery, setLawSearchQuery] = useState('');
  const [selectedLawBook, setSelectedLawBook] = useState('');
  
  const [activeSessionConsultation, setActiveSessionConsultation] = useState(null);
  const [sessionTimer, setSessionTimer] = useState(1800); // 30 mins
  const [sharedSessionNotes, setSharedSessionNotes] = useState('');

  // إضافات إدارة الملفات المتقدمة (السحب والإفلات)
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchLaws = async (query = '', lawName = '') => {
    try {
      const url = new URL(`${API_BASE}/laws`);
      if (query) url.searchParams.append('q', query);
      if (lawName) url.searchParams.append('law_name', lawName);
      
      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLawsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'laws') {
      fetchLaws(lawSearchQuery, selectedLawBook);
    }
  }, [activeTab, lawSearchQuery, selectedLawBook]);

  useEffect(() => {
    let interval = null;
    if (activeTab === 'virtual-session' && sessionTimer > 0) {
      interval = setInterval(() => {
        setSessionTimer(prev => prev - 1);
      }, 1000);
    } else if (sessionTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeTab, sessionTimer]);

  useEffect(() => {
    const handleSessionNotes = (event) => {
      const { consultationId, sessionNotes } = event.detail || {};
      if (!activeSessionConsultation || consultationId !== activeSessionConsultation.id) return;

      const nextNotes = sessionNotes || '';
      setSharedSessionNotes(nextNotes);
      setActiveSessionConsultation({
        ...activeSessionConsultation,
        session_notes: nextNotes
      });
    };

    window.addEventListener('consultation-session-notes', handleSessionNotes);
    return () => window.removeEventListener('consultation-session-notes', handleSessionNotes);
  }, [activeSessionConsultation]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpdateSessionNotes = async () => {
    if (!activeSessionConsultation) return;
    try {
      const res = await fetch(`${API_BASE}/consultations/${activeSessionConsultation.id}/session-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ session_notes: sharedSessionNotes })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveSessionConsultation(updated);
        setStatusMessage('تم تحديث وحفظ الملاحظات المشتركة للاستشارة.');
        fetchConsultations();
      } else {
        setErrorMessage('فشل تحديث الملاحظات.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handlePrintSessionNotes = () => {
    document.body.classList.add('printing-session-notes');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('printing-session-notes');
    }, 500);
  };

  useEffect(() => {
    fetchCases();
    fetchLawyers();
    fetchConsultations();
    fetchInvoices();
    fetchNotifications();
    fetchAiHistory();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 6000); // تحديث الإشعارات كل 6 ثوانٍ
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCase) {
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

  const fetchLawyers = async () => {
    try {
      const res = await fetch(`${API_BASE}/lawyers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLawyers(data);
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

  const [analyzingDocId, setAnalyzingDocId] = useState(null);

  const handlePayInvoice = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentMethod) return;
    setStatusMessage('');
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/invoices/${selectedInvoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ payment_method: paymentMethod })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`تم تسديد الفاتورة بنجاح عبر ${paymentMethod === 'kuraimi' ? 'محفظة الكريمي' : paymentMethod === 'floosak' ? 'محفظة فلوسك' : paymentMethod === 'jawaly' ? 'محفظة جوالي' : paymentMethod === 'mada' ? 'مدى' : 'فيزا'}!`);
        setShowPayModal(false);
        setPaymentMethod('');
        setSelectedInvoice(null);
        fetchInvoices();
        // فتح السند مباشرة للمستخدم
        setReceiptInvoice(data);
        setShowReceiptModal(true);
      } else {
        setErrorMessage(data.detail || 'فشل معالجة عملية السداد.');
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

  const handleBookConsultation = async (e) => {
    e.preventDefault();
    if (!selectedLawyer) return;
    setStatusMessage('');
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/consultations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lawyer_id: selectedLawyer.id,
          date: bookDetails.date,
          notes: bookDetails.notes
        })
      });
      if (res.ok) {
        setStatusMessage(`تم إرسال طلب الاستشارة للمحامي ${selectedLawyer.full_name} بنجاح.`);
        setShowBookModal(false);
        setBookDetails({ date: '', notes: '' });
        fetchConsultations();
      } else {
        const data = await res.json();
        setErrorMessage(data.detail || 'فشل إرسال طلب الاستشارة.');
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

  const performUpload = (file, caseId) => {
    setStatusMessage('');
    setErrorMessage('');
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('case_id', caseId);
    formData.append('token', token);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/documents/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFile(null);
      if (xhr.status === 200 || xhr.status === 201) {
        setStatusMessage('🔒 تم تشفير المستند بنجاح ومشاركته مع محاميك.');
        fetchCaseDetail(caseId);
      } else {
        try {
          const resJson = JSON.parse(xhr.responseText);
          setErrorMessage(resJson.detail || 'فشل رفع المستند.');
        } catch {
          setErrorMessage('فشل رفع المستند.');
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage('حدث خطأ أثناء الرفع.');
    };

    xhr.send(formData);
  };

  // تصفية المحامين بناء على البحث
  const filteredLawyers = lawyers.filter(l => {
    const matchesQuery = l.full_name.includes(searchQuery) || (l.bio && l.bio.includes(searchQuery));
    const matchesSpec = specFilter === '' || l.specialization === specFilter;
    return matchesQuery && matchesSpec;
  });

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
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>بوابة الموكل الإلكترونية</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('overview'); setSelectedCase(null); }}>💼 قضاياي وملفاتي ({cases.length})</button>
          <button className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('search'); setSelectedCase(null); }}>🔍 ابحث عن محامٍ</button>
          <button className={`btn ${activeTab === 'consultations' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('consultations'); setSelectedCase(null); }}>📅 مواعيدي واستشاراتي</button>
          <button className={`btn ${activeTab === 'billing' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('billing'); setSelectedCase(null); }}>💳 الفواتير والمدفوعات</button>
          <button className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('ai'); setSelectedCase(null); }}>🧠 المساعد الذكي</button>
          <button className={`btn ${activeTab === 'laws' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('laws'); setSelectedCase(null); }}>⚖️ المكتبة القانونية</button>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>مرحباً، {user.full_name}</p>
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={onLogout}>تسجيل الخروج</button>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="main-content" onClick={() => setShowNotifDropdown(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {activeTab === 'overview' ? '💼 لوحة المتابعة وقضايا المحكمة' : 
             activeTab === 'search' ? '🔍 دليل مكاتب الاستشارة المعتمدة' :
             activeTab === 'consultations' ? '📅 أجندة المواعيد والاستشارات' : 
             activeTab === 'billing' ? '💳 المالية والفواتير والوثائق' : 
             activeTab === 'laws' ? '⚖️ مكتبة القوانين والتشريعات اليمنية' :
             activeTab === 'virtual-session' ? '🎥 غرفة الاستشارة الافتراضية المباشرة' : '🧠 المساعد القانوني الذكي لمنصة أروى'}
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

        {/* 1. قضاياي وملفاتي */}
        {activeTab === 'overview' && !selectedCase && (
          <div>
            <h1 style={{ marginBottom: '20px' }}>ملفات القضايا الجارية</h1>
            <div className="card-grid">
              {cases.map(c => (
                <div key={c.id} className="glass-panel lawyer-card" style={{ cursor: 'pointer' }} onClick={() => fetchCaseDetail(c.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="badge badge-success">{c.status === 'active' ? 'نشطة' : 'منتهية'}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>رقم: {c.case_number || 'غير مقيد'}</span>
                  </div>
                  <h3>{c.title}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>🏛️ {c.court_name || 'غير مححدد'}</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--accent-gold)' }}>⚖️ المحامي الوكيل: أ. {c.lawyer_id ? 'معين بنجاح' : 'غير معين'}</p>
                </div>
              ))}
              {cases.length === 0 && (
                <div className="glass-panel" style={{ padding: '30px', gridColumn: '1 / -1', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>ليس لديك قضايا نشطة مسجلة باسمك حالياً.</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>عند قيام المحامي بتسجيل قضية لك باستخدام بريدك الإلكتروني، ستظهر هنا فوراً.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* تفاصيل القضية والمخطط الزمني */}
        {selectedCase && (
          <div>
            <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setSelectedCase(null)}>🔙 العودة للقائمة</button>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{selectedCase.title}</h2>
                <span className="badge badge-success">{selectedCase.status === 'active' ? 'نشطة' : 'مغلقة'}</span>
              </div>
              <p style={{ marginTop: '10px' }}>🏛️ <strong>المحكمة المختصة:</strong> {selectedCase.court_name || 'غير محدد'} | ⚖️ <strong>رقم قيد القضية:</strong> {selectedCase.case_number || 'غير مقيد'}</p>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '15px', paddingTop: '15px' }}>
                <p>⚖️ <strong>المحامي الوكيل:</strong> أ. {selectedCase.lawyer_name}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* المخطط الزمني للمحكمة والمستندات */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* الجلسات والمواعيد */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3>📅 المخطط الزمني البصري المطور وسجل الأحداث</h3>
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

                {/* المستندات */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3>📂 ملفات ومستندات القضية</h3>
                  
                  {/* منطقة السحب والإفلات */}
                  <div 
                    className={`drag-drop-zone ${isDragging ? 'active' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setUploadFile(file);
                        performUpload(file, selectedCase.id);
                      }
                    }}
                    onClick={() => document.getElementById('client-file-input').click()}
                    style={{ marginTop: '15px' }}
                  >
                    <div className="drag-drop-zone-icon">📥</div>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>اسحب وأفلت المستند هنا للرفع</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>أو انقر هنا لتصفح الملفات من جهازك</p>
                    <input 
                      type="file" 
                      id="client-file-input" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setUploadFile(file);
                          performUpload(file, selectedCase.id);
                        }
                      }}
                    />
                  </div>

                  {/* مؤشر رفع وتشفير الملفات */}
                  {isUploading && (
                    <div style={{ marginBottom: '15px' }}>
                      <div className="upload-progress-container">
                        <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                      <div className="upload-progress-text">
                        🔒 يجري التشفير والرفع المشفر... {uploadProgress}%
                      </div>
                    </div>
                  )}

                  {/* زر سريع: تشفير ومشاركة مع المحامي */}
                  {uploadFile && !isUploading && (
                    <button 
                      className="btn btn-primary btn-share-lock" 
                      style={{ width: '100%', marginBottom: '15px' }}
                      onClick={() => performUpload(uploadFile, selectedCase.id)}
                    >
                      🔒 تشفير ومشاركة المستند '{uploadFile.name}' مع المحامي
                    </button>
                  )}
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

              {/* المحادثة مع المحامي */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '15px' }}>💬 تواصل مباشر مع محاميك الوكيل</h3>
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
                    <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} className="form-input" placeholder="اكتب استفسارك للمحامي هنا..." />
                    <button type="submit" className="btn btn-primary">إرسال</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. ابحث عن محامٍ وحجز الاستشارات */}
        {activeTab === 'search' && !selectedCase && (
          <div>
            <h1>دليل مكاتب المحاماة المعتمدة</h1>
            <div style={{ display: 'flex', gap: '15px', marginTop: '15px', marginBottom: '20px' }}>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="form-input" placeholder="ابحث باسم المحامي أو التخصص..." style={{ flex: 2 }} />
              <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} className="form-input" style={{ flex: 1 }}>
                <option value="">كل التخصصات</option>
                <option value="تجاري">تجاري</option>
                <option value="جنائي">جنائي</option>
                <option value="مدني">مدني</option>
                <option value="أحوال شخصية">أحوال شخصية</option>
              </select>
            </div>

            <div className="card-grid">
              {filteredLawyers.map(l => (
                <div key={l.id} className="glass-panel lawyer-card">
                  <div className="lawyer-header">
                    <div className="lawyer-avatar">⚖️</div>
                    <div>
                      <h3>أ. {l.full_name}</h3>
                      <span className="badge badge-success" style={{ background: 'rgba(197, 160, 89, 0.1)', color: 'var(--accent-gold)' }}>التخصص: {l.specialization}</span>
                    </div>
                  </div>
                  {l.bio && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1 }}>{l.bio}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>السعر التقريبي</span>
                      <p style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>{l.hourly_rate} ريال / ساعة</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setSelectedLawyer(l); setShowBookModal(true); }}>احجز استشارة</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. الاستشارات */}
        {activeTab === 'consultations' && !selectedCase && (
          <div>
            <h1>جدول طلبات الاستشارات الخاصة بي</h1>
            <div style={{ marginTop: '20px' }}>
              {consultations.map(c => (
                <div key={c.id} className="glass-panel" style={{ padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>⚖️ المحامي: أ. {c.lawyer_name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📅 الموعد: {new Date(c.date).toLocaleString('ar-EG')}</p>
                    {c.notes && <p style={{ marginTop: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📝 ملاحظتي: {c.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span className={`badge ${c.status === 'accepted' ? 'badge-success' : c.status === 'completed' ? 'badge-success' : c.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {c.status === 'accepted' ? 'تم القبول' : c.status === 'pending' ? 'قيد المراجعة' : c.status === 'completed' ? 'منتهية' : 'مرفوضة'}
                    </span>
                    {(c.status === 'accepted' || c.status === 'completed') && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: '4px' }}
                        onClick={() => {
                          setActiveSessionConsultation(c);
                          setSharedSessionNotes(c.session_notes || '');
                          setSessionTimer(1800);
                          setActiveTab('virtual-session');
                        }}
                      >
                        🎥 دخول غرفة الاستشارة
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {consultations.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>لم تقم بطلب استشارات بعد.</p>}
            </div>
          </div>
        )}

        {/* 4. الفواتير والمدفوعات */}
        {activeTab === 'billing' && !selectedCase && (
          <div>
            <h1>الفواتير والمطالبات المالية</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>يمكنك مراجعة جميع الفواتير المستحقة وسدادها إلكترونياً وتوليد سندات القبض الموثقة.</p>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3>قائمة الفواتير المستحقة والمدفوعة</h3>
              <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>القضية</th>
                      <th>المبلغ المطلوب</th>
                      <th>التفاصيل</th>
                      <th>تاريخ الاستحقاق</th>
                      <th>الحالة</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td>
                          <strong>{inv.case_title || 'غير محدد'}</strong>
                        </td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>{inv.amount.toLocaleString('ar-YE')} ر.ي</td>
                        <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{inv.description || '-'}</td>
                        <td>{new Date(inv.due_date).toLocaleDateString('ar-YE')}</td>
                        <td>
                          <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {inv.status === 'paid' ? 'مدفوعة' : 'بانتظار السداد'}
                          </span>
                        </td>
                        <td>
                          {inv.status === 'unpaid' ? (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
                              onClick={() => { setSelectedInvoice(inv); setShowPayModal(true); }}
                            >
                              💳 سداد الآن
                            </button>
                          ) : (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} 
                              onClick={() => { setReceiptInvoice(inv); setShowReceiptModal(true); }}
                            >
                              📄 سند القبض
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>لا توجد أي فواتير مسجلة باسمك حالياً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. المساعد القانوني الذكي */}
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

        {/* 6. المكتبة القانونية */}
        {activeTab === 'laws' && !selectedCase && (
          <div className="laws-library-container">
            <h1>⚖️ مكتبة القوانين والتشريعات اليمنية</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              تصفح وابحث في القوانين المدنية والتجارية والجنائية المعمول بها في الجمهورية اليمنية.
            </p>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
              <input 
                type="text" 
                value={lawSearchQuery} 
                onChange={(e) => setLawSearchQuery(e.target.value)} 
                className="form-input" 
                placeholder="ابحث برقم المادة أو كلمة مفتاحية (مثل: إيجار، تضامن، عقوبة)..." 
                style={{ flex: 2 }}
              />
              <select 
                value={selectedLawBook} 
                onChange={(e) => setSelectedLawBook(e.target.value)} 
                className="form-input" 
                style={{ flex: 1 }}
              >
                <option value="">كل القوانين</option>
                <option value="القانون المدني اليمني">القانون المدني اليمني</option>
                <option value="القانون التجاري اليمني">القانون التجاري اليمني</option>
                <option value="قانون العقوبات اليمني">قانون العقوبات اليمني</option>
                <option value="قانون الأحوال الشخصية اليمني">قانون الأحوال الشخصية اليمني</option>
              </select>
            </div>

            <div className="laws-list">
              {lawsList.map((law, idx) => (
                <div key={law.id || idx} className="glass-panel law-card-item" style={{ padding: '20px', marginBottom: '15px', borderRight: '4px solid var(--accent-gold)', direction: 'rtl', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="badge badge-success" style={{ background: 'rgba(197, 160, 89, 0.1)', color: 'var(--accent-gold)' }}>{law.law_name}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{law.chapter || ''}</span>
                  </div>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>{law.article_number}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    {law.content}
                  </p>
                  {law.keywords && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {law.keywords.split(' ').map((kw, kidx) => (
                        <span key={kidx} className="badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.03)' }}>#{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {lawsList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <h3>لا توجد مواد تطابق بحثك حالياً</h3>
                  <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>جرب كتابة كلمات مثل "إيجار" أو "شيك" أو اختر قانوناً محدداً للتصفح.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* غرفة الاستشارة الافتراضية */}
        {activeTab === 'virtual-session' && activeSessionConsultation && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>🎥 غرفة الاستشارة الافتراضية النشطة</h2>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setActiveTab('consultations');
                  setActiveSessionConsultation(null);
                }}
              >
                🔙 مغادرة الغرفة والعودة
              </button>
            </div>
            
            <div className="virtual-call-grid">
              {/* شاشات الفيديو والمؤقت */}
              <div className="video-feeds-container">
                <div className="session-timer-box">
                  المتبقي من وقت الاستشارة: {formatTimer(sessionTimer)}
                </div>
                <ConsultationCall
                  consultationId={activeSessionConsultation.id}
                  userId={user.id}
                  localLabel="أنت (الموكل)"
                  remoteLabel={`أ. ${activeSessionConsultation.lawyer_name} (المحامي)`}
                  localAvatar="👤"
                  remoteAvatar="⚖️"
                  onLeave={() => {
                    setActiveTab('consultations');
                    setActiveSessionConsultation(null);
                  }}
                />
              </div>

              {/* المفكرة المشتركة */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }} id="printable-recommendations-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>📝 مفكرة التوصيات والملاحظات المشتركة</h3>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} onClick={handlePrintSessionNotes}>
                    🖨️ طباعة الملاحظات
                  </button>
                </div>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  الملاحظات المدونة بالأسفل يتم مشاركتها وحفظها بينك وبين المحامي لحظياً.
                </p>
                
                <textarea 
                  value={sharedSessionNotes}
                  onChange={(e) => setSharedSessionNotes(e.target.value)}
                  className="form-input" 
                  rows="10" 
                  placeholder="يمكنك كتابة الاتفاقيات، البنود والتوصيات القانونية المشتركة هنا..."
                  style={{ flex: 1, fontFamily: 'inherit', resize: 'none', lineHeight: '1.6' }}
                ></textarea>
                
                <button className="btn btn-primary" onClick={handleUpdateSessionNotes} style={{ width: '100%' }}>
                  💾 حفظ وتحديث الملاحظات المشتركة
                </button>
              </div>
            </div>

            {/* نسخة الطباعة المخفية */}
            <div className="printable-session-recommendations" style={{ display: 'none' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #c5a059', paddingBottom: '15px', marginBottom: '20px' }}>
                <h2>منصة أروى القانونية الرقمية ⚖️</h2>
                <h3>توصيات وملاحظات جلسة الاستشارة الافتراضية</h3>
              </div>
              <p><strong>تاريخ الجلسة:</strong> {new Date(activeSessionConsultation.date).toLocaleString('ar-YE')}</p>
              <p><strong>المحامي الوكيل:</strong> أ. {activeSessionConsultation.lawyer_name}</p>
              <p><strong>الموكل:</strong> {user.full_name}</p>
              <hr style={{ border: '1px solid #eee', margin: '20px 0' }} />
              <h4>📋 الملاحظات والتوصيات المتفق عليها:</h4>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                {sharedSessionNotes || 'لا توجد ملاحظات مدونة.'}
              </div>
              <div style={{ marginTop: '50px', textAlign: 'left', fontSize: '0.9rem', color: '#666' }}>
                سند موثق إلكترونياً وصادر عن منصة أروى
              </div>
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

        {/* مودال حجز موعد استشارة */}
        {showBookModal && selectedLawyer && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '450px', background: 'var(--bg-secondary)' }}>
              <h2>طلب حجز موعد مع أ. {selectedLawyer.full_name}</h2>
              <form onSubmit={handleBookConsultation} style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">التاريخ والوقت المقترحين</label>
                  <input type="datetime-local" value={bookDetails.date} onChange={(e) => setBookDetails({ ...bookDetails, date: e.target.value })} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">تفاصيل المشكلة / ملاحظة للمحامي</label>
                  <textarea value={bookDetails.notes} onChange={(e) => setBookDetails({ ...bookDetails, notes: e.target.value })} className="form-input" rows="4" placeholder="يرجى كتابة لمحة سريعة عن المشكلة القانونية لمساعدة المحامي في مراجعتها..." required></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary">إرسال الطلب</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowBookModal(false); setSelectedLawyer(null); }}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* مودال بوابة الدفع ومحاكاة السداد */}
        {showPayModal && selectedInvoice && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '500px', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2>بوابة الدفع وسداد الفاتورة</h2>
                <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--text-secondary)' }} onClick={() => { setShowPayModal(false); setSelectedInvoice(null); setPaymentMethod(''); }}>❌</button>
              </div>
              <p style={{ fontSize: '0.95rem', marginBottom: '20px' }}>أنت بصدد سداد فاتورة بقيمة <strong style={{ color: 'var(--accent-gold)' }}>{selectedInvoice.amount.toLocaleString('ar-YE')} ر.ي</strong> الخاصة بقضية <strong style={{ color: 'var(--accent-gold)' }}>{selectedInvoice.case_title || 'غير محدد'}</strong>.</p>
              
              <form onSubmit={handlePayInvoice}>
                <label className="form-label">اختر وسيلة الدفع الإلكتروني المفضلة:</label>
                <div className="payment-methods-grid">
                  <div className={`payment-method-card ${paymentMethod === 'kuraimi' ? 'selected' : ''}`} onClick={() => setPaymentMethod('kuraimi')}>
                    <span className="payment-logo">🏦</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>محفظة الكريمي</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ام كاش / M-Cash</span>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'floosak' ? 'selected' : ''}`} onClick={() => setPaymentMethod('floosak')}>
                    <span className="payment-logo">📱</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>محفظة فلوسك</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>الخدمات المالية</span>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'jawaly' ? 'selected' : ''}`} onClick={() => setPaymentMethod('jawaly')}>
                    <span className="payment-logo">💳</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>محفظة جوالي</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>دفع سريع</span>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'mada' ? 'selected' : ''}`} onClick={() => setPaymentMethod('mada')}>
                    <span className="payment-logo">🇸🇦</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>بطاقة مدى</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>الشبكة المحلية</span>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'visa' ? 'selected' : ''}`} onClick={() => setPaymentMethod('visa')}>
                    <span className="payment-logo">🌐</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>فيزا / ماستر</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>الدفع الدولي</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!paymentMethod}>تأكيد الدفع والسداد</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowPayModal(false); setSelectedInvoice(null); setPaymentMethod(''); }}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* مودال سند القبض المالي الموثق للطباعة */}
        {showReceiptModal && receiptInvoice && (
          <div className="printable-receipt-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, overflowY: 'auto', padding: '20px' }}>
            <div className="glass-panel receipt-container" style={{ width: '600px', background: 'var(--bg-secondary)', padding: '40px' }}>
              <div className="receipt-header">
                <span style={{ fontSize: '2.5rem' }}>⚖️</span>
                <h1 className="receipt-title">سند قـبـض مـالـي</h1>
                <p style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', marginTop: '5px' }}>منصة أروى القانونية الرقمية</p>
              </div>

              <div className="receipt-grid">
                <div className="receipt-row">
                  <p className="receipt-label">رقم المعاملة (العملية)</p>
                  <p className="receipt-value" style={{ fontFamily: 'monospace' }}>{receiptInvoice.transaction_id || '-'}</p>
                </div>
                <div className="receipt-row">
                  <p className="receipt-label">تاريخ السداد والتوثيق</p>
                  <p className="receipt-value">{receiptInvoice.paid_at ? new Date(receiptInvoice.paid_at).toLocaleString('ar-YE') : '-'}</p>
                </div>
                <div className="receipt-row">
                  <p className="receipt-label">الموكل (دافع السند)</p>
                  <p className="receipt-value">{receiptInvoice.client_name || user.full_name}</p>
                </div>
                <div className="receipt-row">
                  <p className="receipt-label">الوكيل المستلم (المحامي)</p>
                  <p className="receipt-value">منصة أروى القانونية (لصالح مكتب الوكيل)</p>
                </div>
                <div className="receipt-row" style={{ gridColumn: '1 / -1' }}>
                  <p className="receipt-label">البيان / تفاصيل الدفعة</p>
                  <p className="receipt-value">{receiptInvoice.description || 'أتعاب واستشارات قانونية'}</p>
                </div>
                <div className="receipt-row" style={{ gridColumn: '1 / -1' }}>
                  <p className="receipt-label">مرتبط بالقضية</p>
                  <p className="receipt-value">💼 {receiptInvoice.case_title || 'غير محدد'}</p>
                </div>
                
                <div className="receipt-amount-box">
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>المبلغ المقبوض بالريال اليمني</span>
                  {receiptInvoice.amount.toLocaleString('ar-YE')} ريال يمني فقط لا غير
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>حالة التوثيق:</p>
                  <p style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓ معتمد ومسدد بالكامل</p>
                </div>
                <div className="gold-seal-container">
                  <div className="gold-seal">
                    <span>منصة أروى</span>
                    <span>المكتب الرقمي</span>
                    <span className="gold-seal-text">موثق إلكترونياً</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }} className="modal-actions-print">
                <button className="btn btn-primary" onClick={() => window.print()} style={{ flex: 1 }}>🖨️ طباعة السند</button>
                <button className="btn btn-secondary" onClick={() => { setShowReceiptModal(false); setReceiptInvoice(null); }}>إغلاق النافذة</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

