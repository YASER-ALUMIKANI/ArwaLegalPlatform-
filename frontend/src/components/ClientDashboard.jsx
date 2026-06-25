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
  
  // ÙÙ„Ø§ØªØ± Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„Ù…Ø­Ø§Ù…ÙŠÙ†
  const [searchQuery, setSearchQuery] = useState('');
  const [specFilter, setSpecFilter] = useState('');
  
  // Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ø¥Ø¯Ø®Ø§Ù„
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

  // Ø¥Ø¶Ø§ÙØ§Øª Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø§Ù„Ø«Ø§Ù„Ø«Ø©: Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ÙˆØ§Ù„Ù…Ø³Ø§Ø¹Ø¯ ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [aiHistory, setAiHistory] = useState([]);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedDocForAnalysis, setSelectedDocForAnalysis] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('lease');

  // Ø¥Ø¶Ø§ÙØ§Øª Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø§Ù„Ø±Ø§Ø¨Ø¹Ø©: Ù…ÙƒØªØ¨Ø© Ø§Ù„Ù‚ÙˆØ§Ù†ÙŠÙ† ÙˆØºØ±ÙØ© Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©
  const [lawsList, setLawsList] = useState([]);
  const [lawSearchQuery, setLawSearchQuery] = useState('');
  const [selectedLawBook, setSelectedLawBook] = useState('');
  
  const [activeSessionConsultation, setActiveSessionConsultation] = useState(null);
  const [sessionTimer, setSessionTimer] = useState(1800); // 30 mins
  const [sharedSessionNotes, setSharedSessionNotes] = useState('');

  // Ø¥Ø¶Ø§ÙØ§Øª Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø© (Ø§Ù„Ø³Ø­Ø¨ ÙˆØ§Ù„Ø¥ÙÙ„Ø§Øª)
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
        setStatusMessage('ØªÙ… ØªØ­Ø¯ÙŠØ« ÙˆØ­ÙØ¸ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ù…Ø´ØªØ±ÙƒØ© Ù„Ù„Ø§Ø³ØªØ´Ø§Ø±Ø©.');
        fetchConsultations();
      } else {
        setErrorMessage('ÙØ´Ù„ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª.');
      }
    } catch (err) {
      setErrorMessage('Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù….');
    }
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
    }, 6000); // ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ÙƒÙ„ 6 Ø«ÙˆØ§Ù†Ù
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
        setStatusMessage(`ØªÙ… ØªØ³Ø¯ÙŠØ¯ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­ Ø¹Ø¨Ø± ${paymentMethod === 'kuraimi' ? 'Ù…Ø­ÙØ¸Ø© Ø§Ù„ÙƒØ±ÙŠÙ…ÙŠ' : paymentMethod === 'floosak' ? 'Ù…Ø­ÙØ¸Ø© ÙÙ„ÙˆØ³Ùƒ' : paymentMethod === 'jawaly' ? 'Ù…Ø­ÙØ¸Ø© Ø¬ÙˆØ§Ù„ÙŠ' : paymentMethod === 'mada' ? 'Ù…Ø¯Ù‰' : 'ÙÙŠØ²Ø§'}!`);
        setShowPayModal(false);
        setPaymentMethod('');
        setSelectedInvoice(null);
        fetchInvoices();
        // ÙØªØ­ Ø§Ù„Ø³Ù†Ø¯ Ù…Ø¨Ø§Ø´Ø±Ø© Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù…
        setReceiptInvoice(data);
        setShowReceiptModal(true);
      } else {
        setErrorMessage(data.detail || 'ÙØ´Ù„ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø³Ø¯Ø§Ø¯.');
      }
    } catch (err) {
      setErrorMessage('Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù….');
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
        setStatusMessage(`ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø© Ù„Ù„Ù…Ø­Ø§Ù…ÙŠ ${selectedLawyer.full_name} Ø¨Ù†Ø¬Ø§Ø­.`);
        setShowBookModal(false);
        setBookDetails({ date: '', notes: '' });
        fetchConsultations();
      } else {
        const data = await res.json();
        setErrorMessage(data.detail || 'ÙØ´Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø©.');
      }
    } catch (err) {
      setErrorMessage('Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù….');
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
        setStatusMessage('ðŸ”’ ØªÙ… ØªØ´ÙÙŠØ± Ø§Ù„Ù…Ø³ØªÙ†Ø¯ Ø¨Ù†Ø¬Ø§Ø­ ÙˆÙ…Ø´Ø§Ø±ÙƒØªÙ‡ Ù…Ø¹ Ù…Ø­Ø§Ù…ÙŠÙƒ.');
        fetchCaseDetail(caseId);
      } else {
        try {
          const resJson = JSON.parse(xhr.responseText);
          setErrorMessage(resJson.detail || 'ÙØ´Ù„ Ø±ÙØ¹ Ø§Ù„Ù…Ø³ØªÙ†Ø¯.');
        } catch {
          setErrorMessage('ÙØ´Ù„ Ø±ÙØ¹ Ø§Ù„Ù…Ø³ØªÙ†Ø¯.');
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø±ÙØ¹.');
    };

    xhr.send(formData);
  };

  // ØªØµÙÙŠØ© Ø§Ù„Ù…Ø­Ø§Ù…ÙŠÙ† Ø¨Ù†Ø§Ø¡ Ø¹Ù„Ù‰ Ø§Ù„Ø¨Ø­Ø«
  const filteredLawyers = lawyers.filter(l => {
    const matchesQuery = l.full_name.includes(searchQuery) || (l.bio && l.bio.includes(searchQuery));
    const matchesSpec = specFilter === '' || l.specialization === specFilter;
    return matchesQuery && matchesSpec;
  });

  // ØªÙˆÙ„ÙŠØ¯ Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ù…Ø®Ø·Ø· Ø§Ù„Ø²Ù…Ù†ÙŠ Ø§Ù„Ø¨ØµØ±ÙŠ Ø§Ù„Ù…Ø·ÙˆØ±
  const timelineEvents = [];
  if (selectedCase) {
    timelineEvents.push({
      id: 'case-creation',
      title: "ØªØ£Ø³ÙŠØ³ Ø§Ù„Ù‚Ø¶ÙŠØ© ÙˆÙ‚ÙŠØ¯Ù‡Ø§ Ø¨Ø§Ù„Ù…Ù†ØµØ©",
      date: selectedCase.created_at,
      type: 'administrative',
      summary: `ØªÙ… ÙØªØ­ Ù…Ù„Ù Ø§Ù„Ù‚Ø¶ÙŠØ© ØªØ­Øª Ø±Ù‚Ù… Ù‚ÙŠØ¯: ${selectedCase.case_number || 'ØºÙŠØ± Ù…Ù‚ÙŠØ¯'} Ø¨Ù…Ø­ÙƒÙ…Ø©: ${selectedCase.court_name || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©'}.`
    });
    
    if (selectedCase.hearings) {
      selectedCase.hearings.forEach(h => {
        timelineEvents.push({
          id: h.id,
          title: `Ø¬Ù„Ø³Ø© Ù…Ø±Ø§ÙØ¹Ø© Ù‚Ø¶Ø§Ø¦ÙŠØ©`,
          date: h.hearing_date,
          type: 'active',
          summary: `ðŸ“ Ø§Ù„Ù‚Ø§Ø¹Ø©/Ø§Ù„Ø¯Ø§Ø¦Ø±Ø©: ${h.room_number || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©'} | ${h.summary || 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©'}`
        });
      });
    }

    if (selectedCase.documents) {
      selectedCase.documents.forEach(d => {
        timelineEvents.push({
          id: d.id,
          title: `Ù…Ø´Ø§Ø±ÙƒØ© Ù…Ø³ØªÙ†Ø¯ ÙˆØªØ´ÙÙŠØ±Ù‡`,
          date: d.uploaded_at,
          type: 'administrative',
          summary: `ðŸ“„ Ø±ÙØ¹ Ù…Ø³ØªÙ†Ø¯: '${d.file_name}' Ø¨ÙˆØ§Ø³Ø·Ø©: ${d.uploaded_by_name || 'Ø£Ø­Ø¯ Ø§Ù„Ø£Ø·Ø±Ø§Ù'}`
        });
      });
    }

    const caseInvoices = invoices.filter(inv => inv.case_id === selectedCase.id);
    caseInvoices.forEach(inv => {
      timelineEvents.push({
        id: `inv-${inv.id}`,
        title: `Ø¥ØµØ¯Ø§Ø± ÙØ§ØªÙˆØ±Ø© Ø£ØªØ¹Ø§Ø¨`,
        date: inv.created_at,
        type: 'active',
        summary: `ðŸ’³ ÙØ§ØªÙˆØ±Ø© Ø¨Ù‚ÙŠÙ…Ø© ${inv.amount.toLocaleString('ar-YE')} Ø±.ÙŠ Ù…Ø³ØªØ­Ù‚Ø©. Ø§Ù„ÙˆØµÙ: ${inv.description || ''}`
      });
      if (inv.status === 'paid' && inv.paid_at) {
        timelineEvents.push({
          id: `inv-paid-${inv.id}`,
          title: `Ø³Ø¯Ø§Ø¯ Ø§Ù„Ø¯ÙØ¹Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© ÙˆØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø³Ù†Ø¯`,
          date: inv.paid_at,
          type: 'completed',
          summary: `âœ“ ØªÙ… Ø§Ù„Ø¯ÙØ¹ Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ù‚ÙŠÙ…Ø© ${inv.amount.toLocaleString('ar-YE')} Ø±.ÙŠ Ø¹Ø¨Ø± ${inv.payment_method === 'kuraimi' ? 'Ù…Ø­ÙØ¸Ø© Ø§Ù„ÙƒØ±ÙŠÙ…ÙŠ' : inv.payment_method === 'floosak' ? 'Ù…Ø­ÙØ¸Ø© ÙÙ„ÙˆØ³Ùƒ' : inv.payment_method === 'jawaly' ? 'Ù…Ø­ÙØ¸Ø© Ø¬ÙˆØ§Ù„ÙŠ' : inv.payment_method === 'mada' ? 'Ø¨Ø·Ø§Ù‚Ø© Ù…Ø¯Ù‰' : 'ÙÙŠØ²Ø§'} | Ù…Ø¹Ø±Ù Ø§Ù„Ø¹Ù…Ù„ÙŠØ©: ${inv.transaction_id}`
        });
      }
    });

    timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return (
    <div className="dashboard-grid">
      {/* Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¬Ø§Ù†Ø¨ÙŠØ© */}
      <aside className="sidebar">
        <div>
          <h2 style={{ color: 'var(--accent-gold)', marginBottom: '8px' }}>Ù…Ù†ØµØ© Ø£Ø±ÙˆÙ‰</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ù…ÙˆÙƒÙ„ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ©</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('overview'); setSelectedCase(null); }}>ðŸ’¼ Ù‚Ø¶Ø§ÙŠØ§ÙŠ ÙˆÙ…Ù„ÙØ§ØªÙŠ ({cases.length})</button>
          <button className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('search'); setSelectedCase(null); }}>ðŸ” Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…Ø­Ø§Ù…Ù</button>
          <button className={`btn ${activeTab === 'consultations' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('consultations'); setSelectedCase(null); }}>ðŸ“… Ù…ÙˆØ§Ø¹ÙŠØ¯ÙŠ ÙˆØ§Ø³ØªØ´Ø§Ø±Ø§ØªÙŠ</button>
          <button className={`btn ${activeTab === 'billing' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('billing'); setSelectedCase(null); }}>ðŸ’³ Ø§Ù„ÙÙˆØ§ØªÙŠØ± ÙˆØ§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª</button>
          <button className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('ai'); setSelectedCase(null); }}>ðŸ§  Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ</button>
          <button className={`btn ${activeTab === 'laws' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('laws'); setSelectedCase(null); }}>âš–ï¸ Ø§Ù„Ù…ÙƒØªØ¨Ø© Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ©</button>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Ù…Ø±Ø­Ø¨Ø§Ù‹ØŒ {user.full_name}</p>
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={onLogout}>ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬</button>
        </div>
      </aside>

      {/* Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ */}
      <main className="main-content" onClick={() => setShowNotifDropdown(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {activeTab === 'overview' ? 'ðŸ’¼ Ù„ÙˆØ­Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙˆÙ‚Ø¶Ø§ÙŠØ§ Ø§Ù„Ù…Ø­ÙƒÙ…Ø©' : 
             activeTab === 'search' ? 'ðŸ” Ø¯Ù„ÙŠÙ„ Ù…ÙƒØ§ØªØ¨ Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø© Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©' :
             activeTab === 'consultations' ? 'ðŸ“… Ø£Ø¬Ù†Ø¯Ø© Ø§Ù„Ù…ÙˆØ§Ø¹ÙŠØ¯ ÙˆØ§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª' : 
             activeTab === 'billing' ? 'ðŸ’³ Ø§Ù„Ù…Ø§Ù„ÙŠØ© ÙˆØ§Ù„ÙÙˆØ§ØªÙŠØ± ÙˆØ§Ù„ÙˆØ«Ø§Ø¦Ù‚' : 
             activeTab === 'laws' ? 'âš–ï¸ Ù…ÙƒØªØ¨Ø© Ø§Ù„Ù‚ÙˆØ§Ù†ÙŠÙ† ÙˆØ§Ù„ØªØ´Ø±ÙŠØ¹Ø§Øª Ø§Ù„ÙŠÙ…Ù†ÙŠØ©' :
             activeTab === 'virtual-session' ? 'ðŸŽ¥ ØºØ±ÙØ© Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ© Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©' : 'ðŸ§  Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ø§Ù„Ø°ÙƒÙŠ Ù„Ù…Ù†ØµØ© Ø£Ø±ÙˆÙ‰'}
          </h3>
          
          <div className="header-actions">
            {/* Ø¬Ø±Ø³ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª */}
            <div className="notif-container" onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(!showNotifDropdown); }}>
              <span className="notif-bell">
                ðŸ”” {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </span>
              
              {showNotifDropdown && (
                <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="notif-dropdown-header">
                    <h4>ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ù…Ù†ØµØ© ÙˆØ§Ù„Ù‚Ù†ÙˆØ§Øª</h4>
                    {unreadCount > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleMarkAllNotifsRead}>
                        ØªØ¹Ù„ÙŠÙ… Ø§Ù„ÙƒÙ„ ÙƒÙ…Ù‚Ø±ÙˆØ¡ âœ“
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
                      <li style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ÙŠ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø­Ø§Ù„ÙŠØ©.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {statusMessage && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '15px' }}>âœ… {statusMessage}</div>}
        {errorMessage && <div className="badge badge-warning" style={{ display: 'block', padding: '12px', marginBottom: '15px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>âš ï¸ {errorMessage}</div>}

        {/* 1. Ù‚Ø¶Ø§ÙŠØ§ÙŠ ÙˆÙ…Ù„ÙØ§ØªÙŠ */}
        {activeTab === 'overview' && !selectedCase && (
          <div>
            <h1 style={{ marginBottom: '20px' }}>Ù…Ù„ÙØ§Øª Ø§Ù„Ù‚Ø¶Ø§ÙŠØ§ Ø§Ù„Ø¬Ø§Ø±ÙŠØ©</h1>
            <div className="card-grid">
              {cases.map(c => (
                <div key={c.id} className="glass-panel lawyer-card" style={{ cursor: 'pointer' }} onClick={() => fetchCaseDetail(c.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="badge badge-success">{c.status === 'active' ? 'Ù†Ø´Ø·Ø©' : 'Ù…Ù†ØªÙ‡ÙŠØ©'}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Ø±Ù‚Ù…: {c.case_number || 'ØºÙŠØ± Ù…Ù‚ÙŠØ¯'}</span>
                  </div>
                  <h3>{c.title}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>ðŸ›ï¸ {c.court_name || 'ØºÙŠØ± Ù…Ø­Ø­Ø¯Ø¯'}</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--accent-gold)' }}>âš–ï¸ Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ Ø§Ù„ÙˆÙƒÙŠÙ„: Ø£. {c.lawyer_id ? 'Ù…Ø¹ÙŠÙ† Ø¨Ù†Ø¬Ø§Ø­' : 'ØºÙŠØ± Ù…Ø¹ÙŠÙ†'}</p>
                </div>
              ))}
              {cases.length === 0 && (
                <div className="glass-panel" style={{ padding: '30px', gridColumn: '1 / -1', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ Ù‚Ø¶Ø§ÙŠØ§ Ù†Ø´Ø·Ø© Ù…Ø³Ø¬Ù„Ø© Ø¨Ø§Ø³Ù…Ùƒ Ø­Ø§Ù„ÙŠØ§Ù‹.</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>Ø¹Ù†Ø¯ Ù‚ÙŠØ§Ù… Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ Ø¨ØªØ³Ø¬ÙŠÙ„ Ù‚Ø¶ÙŠØ© Ù„Ùƒ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØŒ Ø³ØªØ¸Ù‡Ø± Ù‡Ù†Ø§ ÙÙˆØ±Ø§Ù‹.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù‚Ø¶ÙŠØ© ÙˆØ§Ù„Ù…Ø®Ø·Ø· Ø§Ù„Ø²Ù…Ù†ÙŠ */}
        {selectedCase && (
          <div>
            <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setSelectedCase(null)}>ðŸ”™ Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ù‚Ø§Ø¦Ù…Ø©</button>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{selectedCase.title}</h2>
                <span className="badge badge-success">{selectedCase.status === 'active' ? 'Ù†Ø´Ø·Ø©' : 'Ù…ØºÙ„Ù‚Ø©'}</span>
              </div>
              <p style={{ marginTop: '10px' }}>ðŸ›ï¸ <strong>Ø§Ù„Ù…Ø­ÙƒÙ…Ø© Ø§Ù„Ù…Ø®ØªØµØ©:</strong> {selectedCase.court_name || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'} | âš–ï¸ <strong>Ø±Ù‚Ù… Ù‚ÙŠØ¯ Ø§Ù„Ù‚Ø¶ÙŠØ©:</strong> {selectedCase.case_number || 'ØºÙŠØ± Ù…Ù‚ÙŠØ¯'}</p>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '15px', paddingTop: '15px' }}>
                <p>âš–ï¸ <strong>Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ Ø§Ù„ÙˆÙƒÙŠÙ„:</strong> Ø£. {selectedCase.lawyer_name}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Ø§Ù„Ù…Ø®Ø·Ø· Ø§Ù„Ø²Ù…Ù†ÙŠ Ù„Ù„Ù…Ø­ÙƒÙ…Ø© ÙˆØ§Ù„Ù…Ø³ØªÙ†Ø¯Ø§Øª */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Ø§Ù„Ø¬Ù„Ø³Ø§Øª ÙˆØ§Ù„Ù…ÙˆØ§Ø¹ÙŠØ¯ */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3>ðŸ“… Ø§Ù„Ù…Ø®Ø·Ø· Ø§Ù„Ø²Ù…Ù†ÙŠ Ø§Ù„Ø¨ØµØ±ÙŠ Ø§Ù„Ù…Ø·ÙˆØ± ÙˆØ³Ø¬Ù„ Ø§Ù„Ø£Ø­Ø¯Ø§Ø«</h3>
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
                      <p style={{ color: 'var(--text-secondary)' }}>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø­Ø¯Ø§Ø« Ù…Ø³Ø¬Ù„Ø© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø¶ÙŠØ©.</p>
                    )}
                  </div>
                </div>

                {/* Ø§Ù„Ù…Ø³ØªÙ†Ø¯Ø§Øª */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3>ðŸ“‚ Ù…Ù„ÙØ§Øª ÙˆÙ…Ø³ØªÙ†Ø¯Ø§Øª Ø§Ù„Ù‚Ø¶ÙŠØ©</h3>
                  
                  {/* Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø³Ø­Ø¨ ÙˆØ§Ù„Ø¥ÙÙ„Ø§Øª */}
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
                    <div className="drag-drop-zone-icon">ðŸ“¥</div>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>Ø§Ø³Ø­Ø¨ ÙˆØ£ÙÙ„Øª Ø§Ù„Ù…Ø³ØªÙ†Ø¯ Ù‡Ù†Ø§ Ù„Ù„Ø±ÙØ¹</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ø£Ùˆ Ø§Ù†Ù‚Ø± Ù‡Ù†Ø§ Ù„ØªØµÙØ­ Ø§Ù„Ù…Ù„ÙØ§Øª Ù…Ù† Ø¬Ù‡Ø§Ø²Ùƒ</p>
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

                  {/* Ù…Ø¤Ø´Ø± Ø±ÙØ¹ ÙˆØªØ´ÙÙŠØ± Ø§Ù„Ù…Ù„ÙØ§Øª */}
                  {isUploading && (
                    <div style={{ marginBottom: '15px' }}>
                      <div className="upload-progress-container">
                        <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                      <div className="upload-progress-text">
                        ðŸ”’ ÙŠØ¬Ø±ÙŠ Ø§Ù„ØªØ´ÙÙŠØ± ÙˆØ§Ù„Ø±ÙØ¹ Ø§Ù„Ù…Ø´ÙØ±... {uploadProgress}%
                      </div>
                    </div>
                  )}

                  {/* Ø²Ø± Ø³Ø±ÙŠØ¹: ØªØ´ÙÙŠØ± ÙˆÙ…Ø´Ø§Ø±ÙƒØ© Ù…Ø¹ Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ */}
                  {uploadFile && !isUploading && (
                    <button 
                      className="btn btn-primary btn-share-lock" 
                      style={{ width: '100%', marginBottom: '15px' }}
                      onClick={() => performUpload(uploadFile, selectedCase.id)}
                    >
                      ðŸ”’ ØªØ´ÙÙŠØ± ÙˆÙ…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ù…Ø³ØªÙ†Ø¯ '{uploadFile.name}' Ù…Ø¹ Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ
                    </button>
                  )}
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {selectedCase.documents && selectedCase.documents.map(d => (
                      <li key={d.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>ðŸ“„ {d.file_name}</span>
                          <a href={`http://localhost:8000${d.file_url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontSize: '0.85rem' }}>ØªØ­Ù…ÙŠÙ„ ðŸ“¥</a>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ø¨ÙˆØ§Ø³Ø·Ø©: {d.uploaded_by_name || 'Ø£Ø­Ø¯ Ø§Ù„Ø£Ø·Ø±Ø§Ù'}</span>
                          
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} 
                            onClick={() => { setSelectedDocForAnalysis(d); setShowAnalysisModal(true); }}
                          >
                            {d.ai_analysis ? 'ðŸ“Š Ø¹Ø±Ø¶ Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø°ÙƒÙŠ' : 'ðŸ§  ÙØ­Øµ Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ'}
                          </button>
                        </div>
                      </li>
                    ))}
                    {(!selectedCase.documents || selectedCase.documents.length === 0) && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø³ØªÙ†Ø¯Ø§Øª Ù…Ø±ÙÙˆØ¹Ø© Ø¨Ø¹Ø¯.</p>
                    )}
                  </ul>
                </div>
              </div>

              {/* Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ù…Ø¹ Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '15px' }}>ðŸ’¬ ØªÙˆØ§ØµÙ„ Ù…Ø¨Ø§Ø´Ø± Ù…Ø¹ Ù…Ø­Ø§Ù…ÙŠÙƒ Ø§Ù„ÙˆÙƒÙŠÙ„</h3>
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
                    <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} className="form-input" placeholder="Ø§ÙƒØªØ¨ Ø§Ø³ØªÙØ³Ø§Ø±Ùƒ Ù„Ù„Ù…Ø­Ø§Ù…ÙŠ Ù‡Ù†Ø§..." />
                    <button type="submit" className="btn btn-primary">Ø¥Ø±Ø³Ø§Ù„</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…Ø­Ø§Ù…Ù ÙˆØ­Ø¬Ø² Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª */}
        {activeTab === 'search' && !selectedCase && (
          <div>
            <h1>Ø¯Ù„ÙŠÙ„ Ù…ÙƒØ§ØªØ¨ Ø§Ù„Ù…Ø­Ø§Ù…Ø§Ø© Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©</h1>
            <div style={{ display: 'flex', gap: '15px', marginTop: '15px', marginBottom: '20px' }}>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="form-input" placeholder="Ø§Ø¨Ø­Ø« Ø¨Ø§Ø³Ù… Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ Ø£Ùˆ Ø§Ù„ØªØ®ØµØµ..." style={{ flex: 2 }} />
              <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} className="form-input" style={{ flex: 1 }}>
                <option value="">ÙƒÙ„ Ø§Ù„ØªØ®ØµØµØ§Øª</option>
                <option value="ØªØ¬Ø§Ø±ÙŠ">ØªØ¬Ø§Ø±ÙŠ</option>
                <option value="Ø¬Ù†Ø§Ø¦ÙŠ">Ø¬Ù†Ø§Ø¦ÙŠ</option>
                <option value="Ù…Ø¯Ù†ÙŠ">Ù…Ø¯Ù†ÙŠ</option>
                <option value="Ø£Ø­ÙˆØ§Ù„ Ø´Ø®ØµÙŠØ©">Ø£Ø­ÙˆØ§Ù„ Ø´Ø®ØµÙŠØ©</option>
              </select>
            </div>

            <div className="card-grid">
              {filteredLawyers.map(l => (
                <div key={l.id} className="glass-panel lawyer-card">
                  <div className="lawyer-header">
                    <div className="lawyer-avatar">âš–ï¸</div>
                    <div>
                      <h3>Ø£. {l.full_name}</h3>
                      <span className="badge badge-success" style={{ background: 'rgba(197, 160, 89, 0.1)', color: 'var(--accent-gold)' }}>Ø§Ù„ØªØ®ØµØµ: {l.specialization}</span>
                    </div>
                  </div>
                  {l.bio && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1 }}>{l.bio}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ø§Ù„Ø³Ø¹Ø± Ø§Ù„ØªÙ‚Ø±ÙŠØ¨ÙŠ</span>
                      <p style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>{l.hourly_rate} Ø±ÙŠØ§Ù„ / Ø³Ø§Ø¹Ø©</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setSelectedLawyer(l); setShowBookModal(true); }}>Ø§Ø­Ø¬Ø² Ø§Ø³ØªØ´Ø§Ø±Ø©</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª */}
        {activeTab === 'consultations' && !selectedCase && (
          <div>
            <h1>Ø¬Ø¯ÙˆÙ„ Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ø§Ù„Ø®Ø§ØµØ© Ø¨ÙŠ</h1>
            <div style={{ marginTop: '20px' }}>
              {consultations.map(c => (
                <div key={c.id} className="glass-panel" style={{ padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>âš–ï¸ Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ: Ø£. {c.lawyer_name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ðŸ“… Ø§Ù„Ù…ÙˆØ¹Ø¯: {new Date(c.date).toLocaleString('ar-EG')}</p>
                    {c.notes && <p style={{ marginTop: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ðŸ“ Ù…Ù„Ø§Ø­Ø¸ØªÙŠ: {c.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span className={`badge ${c.status === 'accepted' ? 'badge-success' : c.status === 'completed' ? 'badge-success' : c.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {c.status === 'accepted' ? 'ØªÙ… Ø§Ù„Ù‚Ø¨ÙˆÙ„' : c.status === 'pending' ? 'Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©' : c.status === 'completed' ? 'Ù…Ù†ØªÙ‡ÙŠØ©' : 'Ù…Ø±ÙÙˆØ¶Ø©'}
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
                        ðŸŽ¥ Ø¯Ø®ÙˆÙ„ ØºØ±ÙØ© Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø©
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {consultations.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Ù„Ù… ØªÙ‚Ù… Ø¨Ø·Ù„Ø¨ Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ø¨Ø¹Ø¯.</p>}
            </div>
          </div>
        )}

        {/* 4. Ø§Ù„ÙÙˆØ§ØªÙŠØ± ÙˆØ§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª */}
        {activeTab === 'billing' && !selectedCase && (
          <div>
            <h1>Ø§Ù„ÙÙˆØ§ØªÙŠØ± ÙˆØ§Ù„Ù…Ø·Ø§Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>ÙŠÙ…ÙƒÙ†Ùƒ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¬Ù…ÙŠØ¹ Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø© ÙˆØ³Ø¯Ø§Ø¯Ù‡Ø§ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Ù‹ ÙˆØªÙˆÙ„ÙŠØ¯ Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù‚Ø¨Ø¶ Ø§Ù„Ù…ÙˆØ«Ù‚Ø©.</p>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3>Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø© ÙˆØ§Ù„Ù…Ø¯ÙÙˆØ¹Ø©</h3>
              <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Ø§Ù„Ù‚Ø¶ÙŠØ©</th>
                      <th>Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø·Ù„ÙˆØ¨</th>
                      <th>Ø§Ù„ØªÙØ§ØµÙŠÙ„</th>
                      <th>ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th>
                      <th>Ø§Ù„Ø­Ø§Ù„Ø©</th>
                      <th>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td>
                          <strong>{inv.case_title || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}</strong>
                        </td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>{inv.amount.toLocaleString('ar-YE')} Ø±.ÙŠ</td>
                        <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{inv.description || '-'}</td>
                        <td>{new Date(inv.due_date).toLocaleDateString('ar-YE')}</td>
                        <td>
                          <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {inv.status === 'paid' ? 'Ù…Ø¯ÙÙˆØ¹Ø©' : 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø³Ø¯Ø§Ø¯'}
                          </span>
                        </td>
                        <td>
                          {inv.status === 'unpaid' ? (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
                              onClick={() => { setSelectedInvoice(inv); setShowPayModal(true); }}
                            >
                              ðŸ’³ Ø³Ø¯Ø§Ø¯ Ø§Ù„Ø¢Ù†
                            </button>
                          ) : (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} 
                              onClick={() => { setReceiptInvoice(inv); setShowReceiptModal(true); }}
                            >
                              ðŸ“„ Ø³Ù†Ø¯ Ø§Ù„Ù‚Ø¨Ø¶
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ÙŠ ÙÙˆØ§ØªÙŠØ± Ù…Ø³Ø¬Ù„Ø© Ø¨Ø§Ø³Ù…Ùƒ Ø­Ø§Ù„ÙŠØ§Ù‹.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ø§Ù„Ø°ÙƒÙŠ */}
        {activeTab === 'ai' && !selectedCase && (
          <div className="ai-assistant-container">
            <h1>ðŸ§  Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ø§Ù„Ø°ÙƒÙŠ (Ø§Ù„ØªØ´Ø±ÙŠØ¹ Ø§Ù„ÙŠÙ…Ù†ÙŠ)</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Ø§Ø³Ø£Ù„ Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ Ø­ÙˆÙ„ Ø§Ù„Ù‚ÙˆØ§Ù†ÙŠÙ† Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ© ÙˆØ§Ù„Ù…Ø¯Ù†ÙŠØ© ÙˆÙ‚ÙˆØ§Ù†ÙŠÙ† Ø§Ù„Ø£Ø­ÙˆØ§Ù„ Ø§Ù„Ø´Ø®ØµÙŠØ© ÙÙŠ Ø§Ù„Ø¬Ù…Ù‡ÙˆØ±ÙŠØ© Ø§Ù„ÙŠÙ…Ù†ÙŠØ©.
            </p>
            
            <div className="ai-chat-box" id="ai-chat-box">
              {aiHistory.map((msg, idx) => (
                <div key={msg.id || idx} className={`ai-bubble ${msg.role}`}>
                  <p style={{ fontWeight: 'bold', color: 'var(--accent-gold)', fontSize: '0.8rem', marginBottom: '4px' }}>
                    {msg.role === 'user' ? 'ðŸ‘¤ Ø£Ù†Øª' : 'ðŸ§  Ù…Ø³ØªØ´Ø§Ø± Ø£Ø±ÙˆÙ‰ Ø§Ù„Ø°ÙƒÙŠ'}
                  </p>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
              ))}
              {aiLoading && (
                <div className="typing-indicator">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '6px' }}>Ø£Ø±ÙˆÙ‰ ØªÙÙƒØ±</span>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              {aiHistory.length === 0 && !aiLoading && (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                  <span style={{ fontSize: '3rem' }}>ðŸ§ </span>
                  <h3>Ø§Ø³Ø£Ù„ Ø¹Ù† Ø§Ù„Ù‚ÙˆØ§Ù†ÙŠÙ† Ø§Ù„ÙŠÙ…Ù†ÙŠØ©</h3>
                  <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                    Ø§ÙƒØªØ¨ Ø³Ø¤Ø§Ù„Ùƒ Ø¨Ø§Ù„Ø£Ø³ÙÙ„ Ù…Ø«Ù„ "Ù…Ø§ Ù‡ÙŠ Ø´Ø±ÙˆØ· ØªØ£Ø³ÙŠØ³ Ø´Ø±ÙƒØ© ØªØ¶Ø§Ù…Ù†ØŸ" Ø£Ùˆ "Ù…Ø§ Ø´Ø±ÙˆØ· Ø·Ø±Ø¯ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± ÙÙŠ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„ÙŠÙ…Ù†ÙŠØŸ"
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
                placeholder="Ø§ÙƒØªØ¨ Ø§Ø³ØªØ´Ø§Ø±ØªÙƒ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© Ù‡Ù†Ø§..."
                style={{ flex: 1 }}
                required 
              />
              <button type="submit" className="btn btn-primary" disabled={aiLoading}>
                {aiLoading ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...' : 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø± âš¡'}
              </button>
            </form>
          </div>
        )}

        {/* 6. Ø§Ù„Ù…ÙƒØªØ¨Ø© Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© */}
        {activeTab === 'laws' && !selectedCase && (
          <div className="laws-library-container">
            <h1>âš–ï¸ Ù…ÙƒØªØ¨Ø© Ø§Ù„Ù‚ÙˆØ§Ù†ÙŠÙ† ÙˆØ§Ù„ØªØ´Ø±ÙŠØ¹Ø§Øª Ø§Ù„ÙŠÙ…Ù†ÙŠØ©</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              ØªØµÙØ­ ÙˆØ§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù‚ÙˆØ§Ù†ÙŠÙ† Ø§Ù„Ù…Ø¯Ù†ÙŠØ© ÙˆØ§Ù„ØªØ¬Ø§Ø±ÙŠØ© ÙˆØ§Ù„Ø¬Ù†Ø§Ø¦ÙŠØ© Ø§Ù„Ù…Ø¹Ù…ÙˆÙ„ Ø¨Ù‡Ø§ ÙÙŠ Ø§Ù„Ø¬Ù…Ù‡ÙˆØ±ÙŠØ© Ø§Ù„ÙŠÙ…Ù†ÙŠØ©.
            </p>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
              <input 
                type="text" 
                value={lawSearchQuery} 
                onChange={(e) => setLawSearchQuery(e.target.value)} 
                className="form-input" 
                placeholder="Ø§Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… Ø§Ù„Ù…Ø§Ø¯Ø© Ø£Ùˆ ÙƒÙ„Ù…Ø© Ù…ÙØªØ§Ø­ÙŠØ© (Ù…Ø«Ù„: Ø¥ÙŠØ¬Ø§Ø±ØŒ ØªØ¶Ø§Ù…Ù†ØŒ Ø¹Ù‚ÙˆØ¨Ø©)..." 
                style={{ flex: 2 }}
              />
              <select 
                value={selectedLawBook} 
                onChange={(e) => setSelectedLawBook(e.target.value)} 
                className="form-input" 
                style={{ flex: 1 }}
              >
                <option value="">ÙƒÙ„ Ø§Ù„Ù‚ÙˆØ§Ù†ÙŠÙ†</option>
                <option value="Ø§Ù„Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„Ù…Ø¯Ù†ÙŠ Ø§Ù„ÙŠÙ…Ù†ÙŠ">Ø§Ù„Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„Ù…Ø¯Ù†ÙŠ Ø§Ù„ÙŠÙ…Ù†ÙŠ</option>
                <option value="Ø§Ù„Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„ØªØ¬Ø§Ø±ÙŠ Ø§Ù„ÙŠÙ…Ù†ÙŠ">Ø§Ù„Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„ØªØ¬Ø§Ø±ÙŠ Ø§Ù„ÙŠÙ…Ù†ÙŠ</option>
                <option value="Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„Ø¹Ù‚ÙˆØ¨Ø§Øª Ø§Ù„ÙŠÙ…Ù†ÙŠ">Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„Ø¹Ù‚ÙˆØ¨Ø§Øª Ø§Ù„ÙŠÙ…Ù†ÙŠ</option>
                <option value="Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„Ø£Ø­ÙˆØ§Ù„ Ø§Ù„Ø´Ø®ØµÙŠØ© Ø§Ù„ÙŠÙ…Ù†ÙŠ">Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„Ø£Ø­ÙˆØ§Ù„ Ø§Ù„Ø´Ø®ØµÙŠØ© Ø§Ù„ÙŠÙ…Ù†ÙŠ</option>
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
                  <h3>Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ÙˆØ§Ø¯ ØªØ·Ø§Ø¨Ù‚ Ø¨Ø­Ø«Ùƒ Ø­Ø§Ù„ÙŠØ§Ù‹</h3>
                  <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>Ø¬Ø±Ø¨ ÙƒØªØ§Ø¨Ø© ÙƒÙ„Ù…Ø§Øª Ù…Ø«Ù„ "Ø¥ÙŠØ¬Ø§Ø±" Ø£Ùˆ "Ø´ÙŠÙƒ" Ø£Ùˆ Ø§Ø®ØªØ± Ù‚Ø§Ù†ÙˆÙ†Ø§Ù‹ Ù…Ø­Ø¯Ø¯Ø§Ù‹ Ù„Ù„ØªØµÙØ­.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ØºØ±ÙØ© Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ© */}
        {activeTab === 'virtual-session' && activeSessionConsultation && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>ðŸŽ¥ ØºØ±ÙØ© Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ© Ø§Ù„Ù†Ø´Ø·Ø©</h2>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setActiveTab('consultations');
                  setActiveSessionConsultation(null);
                }}
              >
                ðŸ”™ Ù…ØºØ§Ø¯Ø±Ø© Ø§Ù„ØºØ±ÙØ© ÙˆØ§Ù„Ø¹ÙˆØ¯Ø©
              </button>
            </div>
            
            <div className="virtual-call-grid">
              {/* Ø´Ø§Ø´Ø§Øª Ø§Ù„ÙÙŠØ¯ÙŠÙˆ ÙˆØ§Ù„Ù…Ø¤Ù‚Øª */}
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
                  <h3>ðŸ“ Ù…ÙÙƒØ±Ø© Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ù…Ø´ØªØ±ÙƒØ©</h3>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} onClick={() => window.print()}>
                    ðŸ–¨ï¸ Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª
                  </button>
                </div>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ù…Ø¯ÙˆÙ†Ø© Ø¨Ø§Ù„Ø£Ø³ÙÙ„ ÙŠØªÙ… Ù…Ø´Ø§Ø±ÙƒØªÙ‡Ø§ ÙˆØ­ÙØ¸Ù‡Ø§ Ø¨ÙŠÙ†Ùƒ ÙˆØ¨ÙŠÙ† Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ Ù„Ø­Ø¸ÙŠØ§Ù‹.
                </p>
                
                <textarea 
                  value={sharedSessionNotes}
                  onChange={(e) => setSharedSessionNotes(e.target.value)}
                  className="form-input" 
                  rows="10" 
                  placeholder="ÙŠÙ…ÙƒÙ†Ùƒ ÙƒØªØ§Ø¨Ø© Ø§Ù„Ø§ØªÙØ§Ù‚ÙŠØ§ØªØŒ Ø§Ù„Ø¨Ù†ÙˆØ¯ ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© Ø§Ù„Ù…Ø´ØªØ±ÙƒØ© Ù‡Ù†Ø§..."
                  style={{ flex: 1, fontFamily: 'inherit', resize: 'none', lineHeight: '1.6' }}
                ></textarea>
                
                <button className="btn btn-primary" onClick={handleUpdateSessionNotes} style={{ width: '100%' }}>
                  ðŸ’¾ Ø­ÙØ¸ ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ù…Ø´ØªØ±ÙƒØ©
                </button>
              </div>
            </div>

            {/* Ù†Ø³Ø®Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ù…Ø®ÙÙŠØ© */}
            <div className="printable-session-recommendations" style={{ display: 'none' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #c5a059', paddingBottom: '15px', marginBottom: '20px' }}>
                <h2>Ù…Ù†ØµØ© Ø£Ø±ÙˆÙ‰ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© Ø§Ù„Ø±Ù‚Ù…ÙŠØ© âš–ï¸</h2>
                <h3>ØªÙˆØµÙŠØ§Øª ÙˆÙ…Ù„Ø§Ø­Ø¸Ø§Øª Ø¬Ù„Ø³Ø© Ø§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©</h3>
              </div>
              <p><strong>ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¬Ù„Ø³Ø©:</strong> {new Date(activeSessionConsultation.date).toLocaleString('ar-YE')}</p>
              <p><strong>Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ Ø§Ù„ÙˆÙƒÙŠÙ„:</strong> Ø£. {activeSessionConsultation.lawyer_name}</p>
              <p><strong>Ø§Ù„Ù…ÙˆÙƒÙ„:</strong> {user.full_name}</p>
              <hr style={{ border: '1px solid #eee', margin: '20px 0' }} />
              <h4>ðŸ“‹ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª Ø§Ù„Ù…ØªÙÙ‚ Ø¹Ù„ÙŠÙ‡Ø§:</h4>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                {sharedSessionNotes || 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ù…Ø¯ÙˆÙ†Ø©.'}
              </div>
              <div style={{ marginTop: '50px', textAlign: 'left', fontSize: '0.9rem', color: '#666' }}>
                Ø³Ù†Ø¯ Ù…ÙˆØ«Ù‚ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Ù‹ ÙˆØµØ§Ø¯Ø± Ø¹Ù† Ù…Ù†ØµØ© Ø£Ø±ÙˆÙ‰
              </div>
            </div>
          </div>
        )}

        {/* Ù…ÙˆØ¯Ø§Ù„ ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙˆØ«ÙŠÙ‚Ø© Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ */}
        {showAnalysisModal && selectedDocForAnalysis && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '600px', background: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2>ðŸ§  Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ø§Ù„Ø°ÙƒÙŠ Ù„Ù„ÙˆØ«ÙŠÙ‚Ø©</h2>
                <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--text-secondary)' }} onClick={() => { setShowAnalysisModal(false); setSelectedDocForAnalysis(null); }}>âŒ</button>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Ø§Ø³Ù… Ø§Ù„Ù…Ù„Ù: <strong>{selectedDocForAnalysis.file_name}</strong>
              </p>

              {selectedDocForAnalysis.ai_analysis ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px', whiteSpace: 'pre-wrap', fontSize: '0.9rem', direction: 'rtl', textAlign: 'right' }}>
                  {selectedDocForAnalysis.ai_analysis}
                </div>
              ) : (
                <form onSubmit={handleAnalyzeDocument} style={{ marginTop: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Ø­Ø¯Ø¯ Ù†ÙˆØ¹ Ø§Ù„ÙˆØ«ÙŠÙ‚Ø© Ù„ØªØ®ØµÙŠØµ Ø¹Ù…Ù„ÙŠØ© Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ:</label>
                    <select 
                      value={selectedDocType} 
                      onChange={(e) => setSelectedDocType(e.target.value)} 
                      className="form-input"
                    >
                      <option value="lease">Ø¹Ù‚Ø¯ Ø¥ÙŠØ¬Ø§Ø± Ø¹Ù‚Ø§Ø± (Ø³ÙƒÙ†ÙŠ / ØªØ¬Ø§Ø±ÙŠ)</option>
                      <option value="commercial">Ø¹Ù‚Ø¯ Ø´Ø±Ø§ÙƒØ© Ø£Ùˆ Ø§ØªÙØ§Ù‚ÙŠØ© ØªØ¬Ø§Ø±ÙŠØ©</option>
                      <option value="complaint">Ø¹Ø±ÙŠØ¶Ø© Ø¯Ø¹ÙˆÙ‰ Ø£Ùˆ Ù…Ø°ÙƒØ±Ø© Ù‚Ø§Ù†ÙˆÙ†ÙŠØ©</option>
                    </select>
                  </div>
                  
                  {analyzingDocId === selectedDocForAnalysis.id ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}>
                      <div className="typing-indicator" style={{ display: 'inline-flex', alignSelf: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', marginRight: '8px' }}>Ø¬Ø§Ø±ÙŠ ÙØ­Øµ ÙˆØªÙ„Ø®ÙŠØµ Ø§Ù„Ø¨Ù†ÙˆØ¯ ÙˆØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ø®Ø§Ø·Ø±...</span>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  ) : (
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                      âš¡ ØªØ´ØºÙŠÙ„ ÙØ­Øµ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ
                    </button>
                  )}
                </form>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAnalysisModal(false); setSelectedDocForAnalysis(null); }}>Ø¥ØºÙ„Ø§Ù‚</button>
              </div>
            </div>
          </div>
        )}

        {/* Ù…ÙˆØ¯Ø§Ù„ Ø­Ø¬Ø² Ù…ÙˆØ¹Ø¯ Ø§Ø³ØªØ´Ø§Ø±Ø© */}
        {showBookModal && selectedLawyer && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '450px', background: 'var(--bg-secondary)' }}>
              <h2>Ø·Ù„Ø¨ Ø­Ø¬Ø² Ù…ÙˆØ¹Ø¯ Ù…Ø¹ Ø£. {selectedLawyer.full_name}</h2>
              <form onSubmit={handleBookConsultation} style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…Ù‚ØªØ±Ø­ÙŠÙ†</label>
                  <input type="datetime-local" value={bookDetails.date} onChange={(e) => setBookDetails({ ...bookDetails, date: e.target.value })} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© / Ù…Ù„Ø§Ø­Ø¸Ø© Ù„Ù„Ù…Ø­Ø§Ù…ÙŠ</label>
                  <textarea value={bookDetails.notes} onChange={(e) => setBookDetails({ ...bookDetails, notes: e.target.value })} className="form-input" rows="4" placeholder="ÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© Ù„Ù…Ø­Ø© Ø³Ø±ÙŠØ¹Ø© Ø¹Ù† Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© Ù„Ù…Ø³Ø§Ø¹Ø¯Ø© Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ ÙÙŠ Ù…Ø±Ø§Ø¬Ø¹ØªÙ‡Ø§..." required></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary">Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø·Ù„Ø¨</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowBookModal(false); setSelectedLawyer(null); }}>Ø¥Ù„ØºØ§Ø¡</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ù…ÙˆØ¯Ø§Ù„ Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø¯ÙØ¹ ÙˆÙ…Ø­Ø§ÙƒØ§Ø© Ø§Ù„Ø³Ø¯Ø§Ø¯ */}
        {showPayModal && selectedInvoice && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '500px', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2>Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø¯ÙØ¹ ÙˆØ³Ø¯Ø§Ø¯ Ø§Ù„ÙØ§ØªÙˆØ±Ø©</h2>
                <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--text-secondary)' }} onClick={() => { setShowPayModal(false); setSelectedInvoice(null); setPaymentMethod(''); }}>âŒ</button>
              </div>
              <p style={{ fontSize: '0.95rem', marginBottom: '20px' }}>Ø£Ù†Øª Ø¨ØµØ¯Ø¯ Ø³Ø¯Ø§Ø¯ ÙØ§ØªÙˆØ±Ø© Ø¨Ù‚ÙŠÙ…Ø© <strong style={{ color: 'var(--accent-gold)' }}>{selectedInvoice.amount.toLocaleString('ar-YE')} Ø±.ÙŠ</strong> Ø§Ù„Ø®Ø§ØµØ© Ø¨Ù‚Ø¶ÙŠØ© <strong style={{ color: 'var(--accent-gold)' }}>{selectedInvoice.case_title || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}</strong>.</p>
              
              <form onSubmit={handlePayInvoice}>
                <label className="form-label">Ø§Ø®ØªØ± ÙˆØ³ÙŠÙ„Ø© Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„Ù…ÙØ¶Ù„Ø©:</label>
                <div className="payment-methods-grid">
                  <div className={`payment-method-card ${paymentMethod === 'kuraimi' ? 'selected' : ''}`} onClick={() => setPaymentMethod('kuraimi')}>
                    <span className="payment-logo">ðŸ¦</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Ù…Ø­ÙØ¸Ø© Ø§Ù„ÙƒØ±ÙŠÙ…ÙŠ</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Ø§Ù… ÙƒØ§Ø´ / M-Cash</span>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'floosak' ? 'selected' : ''}`} onClick={() => setPaymentMethod('floosak')}>
                    <span className="payment-logo">ðŸ“±</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Ù…Ø­ÙØ¸Ø© ÙÙ„ÙˆØ³Ùƒ</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©</span>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'jawaly' ? 'selected' : ''}`} onClick={() => setPaymentMethod('jawaly')}>
                    <span className="payment-logo">ðŸ’³</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Ù…Ø­ÙØ¸Ø© Ø¬ÙˆØ§Ù„ÙŠ</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Ø¯ÙØ¹ Ø³Ø±ÙŠØ¹</span>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'mada' ? 'selected' : ''}`} onClick={() => setPaymentMethod('mada')}>
                    <span className="payment-logo">ðŸ‡¸ðŸ‡¦</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Ø¨Ø·Ø§Ù‚Ø© Ù…Ø¯Ù‰</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Ø§Ù„Ø´Ø¨ÙƒØ© Ø§Ù„Ù…Ø­Ù„ÙŠØ©</span>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'visa' ? 'selected' : ''}`} onClick={() => setPaymentMethod('visa')}>
                    <span className="payment-logo">ðŸŒ</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>ÙÙŠØ²Ø§ / Ù…Ø§Ø³ØªØ±</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ø¯ÙˆÙ„ÙŠ</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!paymentMethod}>ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¯ÙØ¹ ÙˆØ§Ù„Ø³Ø¯Ø§Ø¯</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowPayModal(false); setSelectedInvoice(null); setPaymentMethod(''); }}>Ø¥Ù„ØºØ§Ø¡</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ù…ÙˆØ¯Ø§Ù„ Ø³Ù†Ø¯ Ø§Ù„Ù‚Ø¨Ø¶ Ø§Ù„Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ÙˆØ«Ù‚ Ù„Ù„Ø·Ø¨Ø§Ø¹Ø© */}
        {showReceiptModal && receiptInvoice && (
          <div className="printable-receipt-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, overflowY: 'auto', padding: '20px' }}>
            <div className="glass-panel receipt-container" style={{ width: '600px', background: 'var(--bg-secondary)', padding: '40px' }}>
              <div className="receipt-header">
                <span style={{ fontSize: '2.5rem' }}>âš–ï¸</span>
                <h1 className="receipt-title">Ø³Ù†Ø¯ Ù‚Ù€Ø¨Ù€Ø¶ Ù…Ù€Ø§Ù„Ù€ÙŠ</h1>
                <p style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', marginTop: '5px' }}>Ù…Ù†ØµØ© Ø£Ø±ÙˆÙ‰ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© Ø§Ù„Ø±Ù‚Ù…ÙŠØ©</p>
              </div>

              <div className="receipt-grid">
                <div className="receipt-row">
                  <p className="receipt-label">Ø±Ù‚Ù… Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø© (Ø§Ù„Ø¹Ù…Ù„ÙŠØ©)</p>
                  <p className="receipt-value" style={{ fontFamily: 'monospace' }}>{receiptInvoice.transaction_id || '-'}</p>
                </div>
                <div className="receipt-row">
                  <p className="receipt-label">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø³Ø¯Ø§Ø¯ ÙˆØ§Ù„ØªÙˆØ«ÙŠÙ‚</p>
                  <p className="receipt-value">{receiptInvoice.paid_at ? new Date(receiptInvoice.paid_at).toLocaleString('ar-YE') : '-'}</p>
                </div>
                <div className="receipt-row">
                  <p className="receipt-label">Ø§Ù„Ù…ÙˆÙƒÙ„ (Ø¯Ø§ÙØ¹ Ø§Ù„Ø³Ù†Ø¯)</p>
                  <p className="receipt-value">{receiptInvoice.client_name || user.full_name}</p>
                </div>
                <div className="receipt-row">
                  <p className="receipt-label">Ø§Ù„ÙˆÙƒÙŠÙ„ Ø§Ù„Ù…Ø³ØªÙ„Ù… (Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ)</p>
                  <p className="receipt-value">Ù…Ù†ØµØ© Ø£Ø±ÙˆÙ‰ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© (Ù„ØµØ§Ù„Ø­ Ù…ÙƒØªØ¨ Ø§Ù„ÙˆÙƒÙŠÙ„)</p>
                </div>
                <div className="receipt-row" style={{ gridColumn: '1 / -1' }}>
                  <p className="receipt-label">Ø§Ù„Ø¨ÙŠØ§Ù† / ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¯ÙØ¹Ø©</p>
                  <p className="receipt-value">{receiptInvoice.description || 'Ø£ØªØ¹Ø§Ø¨ ÙˆØ§Ø³ØªØ´Ø§Ø±Ø§Øª Ù‚Ø§Ù†ÙˆÙ†ÙŠØ©'}</p>
                </div>
                <div className="receipt-row" style={{ gridColumn: '1 / -1' }}>
                  <p className="receipt-label">Ù…Ø±ØªØ¨Ø· Ø¨Ø§Ù„Ù‚Ø¶ÙŠØ©</p>
                  <p className="receipt-value">ðŸ’¼ {receiptInvoice.case_title || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}</p>
                </div>
                
                <div className="receipt-amount-box">
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ù‚Ø¨ÙˆØ¶ Ø¨Ø§Ù„Ø±ÙŠØ§Ù„ Ø§Ù„ÙŠÙ…Ù†ÙŠ</span>
                  {receiptInvoice.amount.toLocaleString('ar-YE')} Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ ÙÙ‚Ø· Ù„Ø§ ØºÙŠØ±
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ø­Ø§Ù„Ø© Ø§Ù„ØªÙˆØ«ÙŠÙ‚:</p>
                  <p style={{ color: 'var(--success)', fontWeight: 'bold' }}>âœ“ Ù…Ø¹ØªÙ…Ø¯ ÙˆÙ…Ø³Ø¯Ø¯ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„</p>
                </div>
                <div className="gold-seal-container">
                  <div className="gold-seal">
                    <span>Ù…Ù†ØµØ© Ø£Ø±ÙˆÙ‰</span>
                    <span>Ø§Ù„Ù…ÙƒØªØ¨ Ø§Ù„Ø±Ù‚Ù…ÙŠ</span>
                    <span className="gold-seal-text">Ù…ÙˆØ«Ù‚ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Ù‹</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }} className="modal-actions-print">
                <button className="btn btn-primary" onClick={() => window.print()} style={{ flex: 1 }}>ðŸ–¨ï¸ Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø³Ù†Ø¯</button>
                <button className="btn btn-secondary" onClick={() => { setShowReceiptModal(false); setReceiptInvoice(null); }}>Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù†Ø§ÙØ°Ø©</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

