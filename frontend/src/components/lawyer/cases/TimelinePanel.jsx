import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoicesService } from '../../../services/invoices.service';
import HearingModal from './HearingModal';

export default function TimelinePanel({ caseDetail }) {
  const [showHearingModal, setShowHearingModal] = useState(false);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesService.getAll,
  });

  // Build events
  const timelineEvents = [];
  if (caseDetail) {
    // 1. Creation event
    timelineEvents.push({
      id: 'case-creation',
      title: "تأسيس القضية وقيدها بالمنصة",
      date: caseDetail.created_at,
      type: 'administrative',
      summary: `تم فتح ملف القضية تحت رقم قيد: ${caseDetail.case_number || 'غير مقيد'} بمحكمة: ${caseDetail.court_name || 'غير محددة'}.`
    });
    
    // 2. Hearing events
    if (caseDetail.hearings) {
      caseDetail.hearings.forEach(h => {
        timelineEvents.push({
          id: h.id,
          title: `جلسة مرافعة قضائية`,
          date: h.hearing_date,
          type: 'active',
          summary: `📍 القاعة/الدائرة: ${h.room_number || 'غير محددة'} | ${h.summary || 'لا توجد ملاحظات إضافية'}`
        });
      });
    }

    // 3. Document upload events
    if (caseDetail.documents) {
      caseDetail.documents.forEach(d => {
        timelineEvents.push({
          id: d.id,
          title: `مشاركة مستند وتشفيره`,
          date: d.uploaded_at,
          type: 'administrative',
          summary: `📄 رفع مستند: '${d.file_name}' بواسطة: ${d.uploaded_by_name || 'أحد الأطراف'}`
        });
      });
    }

    // 4. Invoices related to this case
    const caseInvoices = invoices.filter(inv => inv.case_id === caseDetail.id);
    caseInvoices.forEach(inv => {
      timelineEvents.push({
        id: `inv-${inv.id}`,
        title: `إصدار فاتورة أتعاب`,
        date: inv.created_at,
        type: 'active',
        summary: `💳 فاتورة بقيمة ${Number(inv.amount).toLocaleString('ar-YE')} ر.ي مستحقة. الوصف: ${inv.description || ''}`
      });
      if (inv.status === 'paid' && inv.paid_at) {
        timelineEvents.push({
          id: `inv-paid-${inv.id}`,
          title: `سداد الدفعة المالية وتوثيق السند`,
          date: inv.paid_at,
          type: 'completed',
          summary: `✓ تم الدفع بنجاح بقيمة ${Number(inv.amount).toLocaleString('ar-YE')} ر.ي عبر ${inv.payment_method === 'kuraimi' ? 'محفظة الكريمي' : inv.payment_method === 'floosak' ? 'محفظة فلوسك' : inv.payment_method === 'jawaly' ? 'محفظة جوالي' : inv.payment_method === 'mada' ? 'بطاقة مدى' : 'فيزا'} | معرف العملية: ${inv.transaction_id}`
        });
      }
    });

    timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>📅 المخطط الزمني البصري المطور وسجل الأحداث</h3>
        <button 
          className="btn btn-primary" 
          style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
          onClick={() => setShowHearingModal(true)}
        >
          جدولة جلسة
        </button>
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

      {showHearingModal && (
        <HearingModal 
          caseId={caseDetail.id} 
          onClose={() => setShowHearingModal(false)} 
        />
      )}
    </div>
  );
}
