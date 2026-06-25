import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { casesService } from '../../../services/cases.service';
import { useLawyerStore } from '../../../store/lawyerStore';
import TimelinePanel from './TimelinePanel';
import DocumentsPanel from './DocumentsPanel';
import MessagesPanel from './MessagesPanel';

export default function CaseDetail({ userId }) {
  const selectedCaseId = useLawyerStore(state => state.selectedCaseId);
  const setSelectedCaseId = useLawyerStore(state => state.setSelectedCaseId);

  // Fetch case details using React Query
  const { data: caseDetail, isLoading, error } = useQuery({
    queryKey: ['case', selectedCaseId],
    queryFn: () => casesService.getById(selectedCaseId),
    enabled: !!selectedCaseId,
  });

  if (isLoading) {
    return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>🔄 جاري تحميل تفاصيل ملف القضية...</div>;
  }

  if (error || !caseDetail) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>⚠️ فشل تحميل تفاصيل القضية.</p>
        <button className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={() => setSelectedCaseId(null)}>🔙 العودة للقائمة</button>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setSelectedCaseId(null)}>🔙 العودة للقائمة</button>
      
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{caseDetail.title}</h2>
          <span className="badge badge-success">{caseDetail.status === 'active' ? 'نشطة' : 'مغلقة'}</span>
        </div>
        <p style={{ marginTop: '10px' }}>
          🏛️ <strong>المحكمة:</strong> {caseDetail.court_name || 'غير محدد'} | ⚖️ <strong>رقم القضية:</strong> {caseDetail.case_number || 'غير مقيد'}
        </p>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '15px', paddingTop: '15px' }}>
          <p>
            👤 <strong>بيانات الموكل:</strong> {caseDetail.client_name} ({caseDetail.client_phone} - {caseDetail.client_email})
          </p>
        </div>
      </div>

      {/* المخطط الزمني والدردشة والتخزين */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* القسم الأيمن: الجلسات والوثائق */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <TimelinePanel caseDetail={caseDetail} />
          <DocumentsPanel caseId={caseDetail.id} documents={caseDetail.documents} />
        </div>

        {/* القسم الأيسر: المراسلة الفورية مع الموكل */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <MessagesPanel caseId={caseDetail.id} messages={caseDetail.messages} userId={userId} />
        </div>
      </div>
    </div>
  );
}
