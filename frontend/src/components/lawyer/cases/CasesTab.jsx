import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesService } from '../../../services/cases.service';
import { useLawyerStore } from '../../../store/lawyerStore';
import { API_ORIGIN } from '../../../config/api';

export default function CasesTab() {
  const queryClient = useQueryClient();
  const selectedCaseId = useLawyerStore(state => state.selectedCaseId);
  const setSelectedCaseId = useLawyerStore(state => state.setSelectedCaseId);

  // Local state for modals & forms
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', court_name: '', case_number: '', client_email: '' });
  const [expandedFolders, setExpandedFolders] = useState({ root_clients: true });
  const [errorMessage, setLocalErrorMessage] = useState('');
  const [statusMessage, setLocalStatusMessage] = useState('');

  // Fetch all cases
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: casesService.getAll,
  });

  // Create case mutation
  const createCaseMutation = useMutation({
    mutationFn: casesService.create,
    onSuccess: () => {
      setLocalStatusMessage('تم فتح ملف القضية بنجاح وتعيين الموكل.');
      setLocalErrorMessage('');
      setShowCaseModal(false);
      setNewCase({ title: '', court_name: '', case_number: '', client_email: '' });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err) => {
      setLocalErrorMessage(err.message || 'فشل إنشاء القضية.');
      setLocalStatusMessage('');
    }
  });

  const handleCreateCaseSubmit = (e) => {
    e.preventDefault();
    createCaseMutation.mutate(newCase);
  };

  const toggleFolder = (folderKey) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  // Group cases by client
  const clientGroups = {};
  cases.forEach(c => {
    if (!clientGroups[c.client_name]) {
      clientGroups[c.client_name] = [];
    }
    clientGroups[c.client_name].push(c);
  });

  const clients = Object.keys(clientGroups);

  const getDocUrl = (url) => {
    if (url.startsWith('http')) return url;
    return `${API_ORIGIN}${url}`;
  };

  const renderFolderTree = () => {
    if (clients.length === 0) {
      return <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>لا توجد قضايا أو ملفات لعرضها.</p>;
    }

    return (
      <div className="folder-tree">
        <div className="folder-tree-node">
          <div className="folder-tree-node-title" onClick={() => toggleFolder('root_clients')}>
            <span>{expandedFolders['root_clients'] ? '📂' : '📁'}</span>
            <strong>الموكلون والعملاء</strong>
          </div>

          {expandedFolders['root_clients'] && (
            <div className="folder-tree-node-children">
              {clients.map(clientName => {
                const folderKey = `client_${clientName}`;
                return (
                  <div key={clientName} className="folder-tree-node">
                    <div className="folder-tree-node-title" onClick={() => toggleFolder(folderKey)}>
                      <span>{expandedFolders[folderKey] ? '📂' : '📁'}</span>
                      <span>الموكل: {clientName}</span>
                    </div>

                    {expandedFolders[folderKey] && (
                      <div className="folder-tree-node-children">
                        {clientGroups[clientName].map(c => {
                          const caseFolderKey = `case_${c.id}`;
                          const isCaseSelected = selectedCaseId === c.id;
                          const docs = c.documents || [];
                          return (
                            <div key={c.id} className="folder-tree-node">
                              <div className="folder-tree-node-title" onClick={() => {
                                toggleFolder(caseFolderKey);
                                if (!isCaseSelected) {
                                  setSelectedCaseId(c.id);
                                }
                              }}>
                                <span>{expandedFolders[caseFolderKey] ? '📂' : '📁'}</span>
                                <span style={{ fontSize: '0.85rem' }}>قضية: {c.title}</span>
                              </div>

                              {expandedFolders[caseFolderKey] && (
                                <div className="folder-tree-node-children">
                                  {docs.map(doc => (
                                    <div key={doc.id} className="folder-tree-file">
                                      <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {doc.file_name}</span>
                                      <a href={getDocUrl(doc.file_url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontSize: '0.75rem', marginRight: '6px' }}>تحميل 📥</a>
                                    </div>
                                  ))}
                                  {docs.length === 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '10px' }}>
                                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>لا توجد ملفات. اضغط لاختيار القضية ومزامنتها.</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {statusMessage && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '15px' }}>✅ {statusMessage}</div>}
      {errorMessage && <div className="badge badge-warning" style={{ display: 'block', padding: '12px', marginBottom: '15px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>⚠️ {errorMessage}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>سجل القضايا الموكلة</h1>
        <button className="btn btn-primary" onClick={() => setShowCaseModal(true)}>➕ فتح ملف قضية</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* العمود الأيمن: شبكة القضايا */}
        <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', alignContent: 'start' }}>
          {cases.map(c => (
            <div 
              key={c.id} 
              className="glass-panel lawyer-card" 
              style={{ cursor: 'pointer', margin: 0 }} 
              onClick={() => setSelectedCaseId(c.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="badge badge-success">{c.status === 'active' ? 'نشطة' : 'منتهية'}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>رقم: {c.case_number || 'غير مقيد'}</span>
              </div>
              <h3>{c.title}</h3>
              <p style={{ color: 'var(--text-secondary)' }}>🏛 {c.court_name || 'غير محدد'}</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--accent-gold)' }}>👤 الموكل: {c.client_name}</p>
            </div>
          ))}
          {cases.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>لا توجد قضايا مسجلة بعد.</p>}
        </div>

        {/* العمود الأيسر: شجرة الملفات الشجرية */}
        <div className="glass-panel" style={{ padding: '20px', alignSelf: 'start' }}>
          <h3 style={{ marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>🗂️ شجرة المجلدات والأرشيف</h3>
          {renderFolderTree()}
        </div>
      </div>

      {/* مودال فتح ملف قضية */}
      {showCaseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '30px', width: '450px', background: 'var(--bg-secondary)' }}>
            <h2>فتح ملف قضية جديد</h2>
            <form onSubmit={handleCreateCaseSubmit} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني للموكل (يجب أن يكون مسجلاً بالمنصة)</label>
                <input 
                  type="email" 
                  value={newCase.client_email} 
                  onChange={(e) => setNewCase({ ...newCase, client_email: e.target.value })} 
                  className="form-input" 
                  placeholder="client@example.com" 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">عنوان القضية</label>
                <input 
                  type="text" 
                  value={newCase.title} 
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })} 
                  className="form-input" 
                  placeholder="مثال: دعوى إثبات ملكية عقار" 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">المحكمة / الدائرة</label>
                <input 
                  type="text" 
                  value={newCase.court_name} 
                  onChange={(e) => setNewCase({ ...newCase, court_name: e.target.value })} 
                  className="form-input" 
                  placeholder="مثال: المحكمة التجارية بصنعاء" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">رقم قيد القضية (اختياري)</label>
                <input 
                  type="text" 
                  value={newCase.case_number} 
                  onChange={(e) => setNewCase({ ...newCase, case_number: e.target.value })} 
                  className="form-input" 
                  placeholder="مثال: 124/ب لسنة 2026" 
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={createCaseMutation.isPending}>
                  {createCaseMutation.isPending ? 'جاري الحفظ...' : 'حفظ وتأكيد'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCaseModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
