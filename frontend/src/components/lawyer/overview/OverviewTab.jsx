import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { casesService } from '../../../services/cases.service';
import { consultationsService } from '../../../services/consultations.service';
import { invoicesService } from '../../../services/invoices.service';

export default function OverviewTab() {
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: casesService.getAll,
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations'],
    queryFn: consultationsService.getAll,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesService.getAll,
  });

  // Calculate metrics
  const activeCasesCount = cases.filter(c => c.status === 'active').length;
  const pendingConsultationsCount = consultations.filter(c => c.status === 'pending').length;
  const collectedRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  const pendingRevenue = invoices
    .filter(inv => inv.status === 'unpaid')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>لوحة التحكم المهنية</h1>
      <div className="card-grid">
        <div className="glass-panel lawyer-card">
          <h3>القضايا النشطة</h3>
          <h1 style={{ color: 'var(--accent-gold)', fontSize: '2.5rem' }}>{activeCasesCount}</h1>
          <p>قضايا متداولة حالياً بالمحكمة</p>
        </div>
        <div className="glass-panel lawyer-card">
          <h3>طلبات الاستشارة</h3>
          <h1 style={{ color: 'var(--accent-gold)', fontSize: '2.5rem' }}>{pendingConsultationsCount}</h1>
          <p>طلبات قيد المراجعة والموافقة</p>
        </div>
        <div className="glass-panel lawyer-card">
          <h3>أتعاب محصلة</h3>
          <h1 style={{ color: 'var(--success)', fontSize: '2.2rem' }}>
            {collectedRevenue.toLocaleString('ar-YE')} <span style={{ fontSize: '0.9rem' }}>ر.ي</span>
          </h1>
          <p>إجمالي المبالغ المستلمة بالريال اليمني</p>
        </div>
        <div className="glass-panel lawyer-card">
          <h3>مستحقات معلقة</h3>
          <h1 style={{ color: 'var(--warning)', fontSize: '2.2rem' }}>
            {pendingRevenue.toLocaleString('ar-YE')} <span style={{ fontSize: '0.9rem' }}>ر.ي</span>
          </h1>
          <p>فواتير صادرة بانتظار السداد</p>
        </div>
      </div>
      
      {/* تقويم تفاعلي للمواعيد */}
      <div className="glass-panel" style={{ marginTop: '30px', padding: '24px' }}>
        <div className="calendar-widget">
          <div className="calendar-header">
            <h3>أجندة المواعيد والجلسات</h3>
            <p style={{ color: 'var(--accent-gold)' }}>
              اليوم: {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
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
  );
}
