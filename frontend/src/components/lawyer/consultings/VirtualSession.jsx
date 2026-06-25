import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationsService } from '../../../services/consultations.service';
import { useLawyerStore } from '../../../store/lawyerStore';
import ConsultationCall from '../../shared/ConsultationCall';

export default function VirtualSession({ user }) {
  const queryClient = useQueryClient();
  const activeSessionConsultation = useLawyerStore(state => state.activeSessionConsultation);
  const setActiveSessionConsultation = useLawyerStore(state => state.setActiveSessionConsultation);
  const setActiveTab = useLawyerStore(state => state.setActiveTab);

  const [sessionTimer, setSessionTimer] = useState(1800);
  const [sharedSessionNotes, setSharedSessionNotes] = useState(activeSessionConsultation?.session_notes || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (sessionTimer <= 0) return undefined;
    const interval = setInterval(() => setSessionTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [sessionTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }) => consultationsService.updateSessionNotes(id, notes),
    onSuccess: (data) => {
      setActiveSessionConsultation(data);
      setStatusMessage('تم تحديث وحفظ الملاحظات المشتركة للاستشارة.');
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
    onError: (err) => {
      setErrorMessage(err.message || 'فشل تحديث الملاحظات.');
      setStatusMessage('');
    }
  });

  const handleSaveNotes = () => {
    if (!activeSessionConsultation) return;
    updateNotesMutation.mutate({
      id: activeSessionConsultation.id,
      notes: sharedSessionNotes
    });
  };

  const handleLeaveRoom = () => {
    setActiveTab('consultations');
    setActiveSessionConsultation(null);
  };

  if (!activeSessionConsultation) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
        لا توجد جلسة استشارة نشطة حالياً.
      </div>
    );
  }

  return (
    <div>
      {statusMessage && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '15px' }}>{statusMessage}</div>}
      {errorMessage && <div className="badge badge-warning" style={{ display: 'block', padding: '12px', marginBottom: '15px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>{errorMessage}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>غرفة الاستشارة الافتراضية النشطة</h2>
        <button className="btn btn-secondary" onClick={handleLeaveRoom}>
          مغادرة الغرفة والعودة
        </button>
      </div>

      <div className="virtual-call-grid">
        <div className="video-feeds-container">
          <div className="session-timer-box">
            المتبقي من وقت الاستشارة: {formatTimer(sessionTimer)}
          </div>
          <ConsultationCall
            consultationId={activeSessionConsultation.id}
            userId={user.id}
            localLabel="أنت (المحامي)"
            remoteLabel={`${activeSessionConsultation.client_name} (الموكل)`}
            localAvatar="⚖️"
            remoteAvatar="👤"
            onLeave={handleLeaveRoom}
          />
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }} id="printable-recommendations-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>مفكرة التوصيات والملاحظات المشتركة</h3>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} onClick={() => window.print()}>
              طباعة الملاحظات
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            الملاحظات المدونة بالأسفل يتم مشاركتها وحفظها بينك وبين الموكل لحظياً.
          </p>

          <textarea
            value={sharedSessionNotes}
            onChange={(e) => setSharedSessionNotes(e.target.value)}
            className="form-input"
            rows="10"
            placeholder="يمكنك كتابة الاتفاقيات، البنود والتوصيات القانونية المشتركة هنا..."
            style={{ flex: 1, fontFamily: 'inherit', resize: 'none', lineHeight: '1.6' }}
          />

          <button
            className="btn btn-primary"
            onClick={handleSaveNotes}
            style={{ width: '100%' }}
            disabled={updateNotesMutation.isPending}
          >
            {updateNotesMutation.isPending ? 'جاري الحفظ...' : 'حفظ وتحديث الملاحظات المشتركة'}
          </button>
        </div>
      </div>

      <div className="printable-session-recommendations" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #c5a059', paddingBottom: '15px', marginBottom: '20px' }}>
          <h2>منصة أروى القانونية الرقمية</h2>
          <h3>توصيات وملاحظات جلسة الاستشارة الافتراضية</h3>
        </div>
        <p><strong>تاريخ الجلسة:</strong> {new Date(activeSessionConsultation.date).toLocaleString('ar-YE')}</p>
        <p><strong>المحامي الوكيل:</strong> أ. {user.full_name}</p>
        <p><strong>الموكل:</strong> {activeSessionConsultation.client_name}</p>
        <hr style={{ border: '1px solid #eee', margin: '20px 0' }} />
        <h4>الملاحظات والتوصيات المتفق عليها:</h4>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          {sharedSessionNotes || 'لا توجد ملاحظات مدونة.'}
        </div>
        <div style={{ marginTop: '50px', textAlign: 'left', fontSize: '0.9rem', color: '#666' }}>
          سند موثق إلكترونياً وصادر عن منصة أروى
        </div>
      </div>
    </div>
  );
}
