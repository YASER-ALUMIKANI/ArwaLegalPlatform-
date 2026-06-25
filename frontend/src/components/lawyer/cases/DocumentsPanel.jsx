import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { documentsService } from '../../../services/documents.service';
import { useLawyerStore } from '../../../store/lawyerStore';
import { API_ORIGIN } from '../../../config/api';

export default function DocumentsPanel({ caseId, documents = [] }) {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Zustand Store selectors
  const setSelectedDocForAnalysis = useLawyerStore(state => state.setSelectedDocForAnalysis);
  const setAnalysisModalOpen = useLawyerStore(state => state.setAnalysisModalOpen);

  const performUpload = async (file) => {
    setStatusMessage('');
    setErrorMessage('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      await documentsService.upload(file, caseId, (progress) => {
        setUploadProgress(progress);
      });
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFile(null);
      setStatusMessage('🔒 تم تشفير المستند بنجاح ومشاركته مع الموكل.');
      
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage(err.message || 'فشل رفع المستند.');
    }
  };

  const getDocUrl = (url) => {
    if (url.startsWith('http')) return url;
    return `${API_ORIGIN}${url}`;
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h3>📂 أرشفة المستندات</h3>
      
      {statusMessage && <div className="badge badge-success" style={{ display: 'block', padding: '8px', margin: '10px 0' }}>✅ {statusMessage}</div>}
      {errorMessage && <div className="badge badge-warning" style={{ display: 'block', padding: '8px', margin: '10px 0', color: 'var(--danger)', borderColor: 'var(--danger)' }}>⚠️ {errorMessage}</div>}

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
            performUpload(file);
          }
        }}
        onClick={() => document.getElementById('lawyer-file-input').click()}
        style={{ marginTop: '15px' }}
      >
        <div className="drag-drop-zone-icon">📥</div>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>اسحب وأفلت المستند هنا للرفع</p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>أو انقر هنا لتصفح الملفات من جهازك</p>
        <input 
          type="file" 
          id="lawyer-file-input" 
          style={{ display: 'none' }} 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const file = e.target.files[0];
              setUploadFile(file);
              performUpload(file);
            }
          }}
        />
      </div>

      {/* مؤشر رفع وتشفير الملفات */}
      {isUploading && (
        <div style={{ margin: '15px 0' }}>
          <div className="upload-progress-container">
            <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <div className="upload-progress-text">
            🔒 يجري التشفير العسكري والرفع... {uploadProgress}%
          </div>
        </div>
      )}

      {/* زر سريع: تشفير ومشاركة مع الموكل */}
      {uploadFile && !isUploading && (
        <button 
          className="btn btn-primary btn-share-lock" 
          style={{ width: '100%', margin: '15px 0' }}
          onClick={() => performUpload(uploadFile)}
        >
          🔒 تشفير ومشاركة المستند '{uploadFile.name}' مع الموكل
        </button>
      )}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px' }}>
        {documents.map(d => (
          <li key={d.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>📄 {d.file_name}</span>
              <a href={getDocUrl(d.file_url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontSize: '0.85rem' }}>تحميل 📥</a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>بواسطة: {d.uploaded_by_name || 'أحد الأطراف'}</span>
              
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} 
                onClick={() => { setSelectedDocForAnalysis(d); setAnalysisModalOpen(true); }}
              >
                {d.ai_analysis ? '📊 عرض التقرير الذكي' : '🧠 فحص بالذكاء الاصطناعي'}
              </button>
            </div>
          </li>
        ))}
        {documents.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>لا توجد مستندات مرفوعة بعد.</p>
        )}
      </ul>
    </div>
  );
}
