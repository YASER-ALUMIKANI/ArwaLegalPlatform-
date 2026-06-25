import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoicesService } from '../../../services/invoices.service';
import InvoiceTable from './InvoiceTable';
import InvoiceModal from './InvoiceModal';

export default function BillingTab() {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesService.getAll,
  });

  // Calculate stats
  const collectedRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  const pendingRevenue = invoices
    .filter(inv => inv.status === 'unpaid')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  if (isLoading) {
    return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>🔄 جاري تحميل البيانات المالية والفواتير...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>الشؤون المالية وإصدار الفواتير</h1>
        <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>➕ إصدار فاتورة جديدة</button>
      </div>

      <div className="card-grid" style={{ marginBottom: '30px' }}>
        <div className="glass-panel lawyer-card" style={{ borderRight: '4px solid var(--success)' }}>
          <h3>إجمالي المبالغ المحصلة</h3>
          <h1 style={{ color: 'var(--success)', fontSize: '2.2rem' }}>
            {collectedRevenue.toLocaleString('ar-YE')} <span style={{ fontSize: '1rem' }}>ريال يمني</span>
          </h1>
          <p>أتعاب مدفوعة ومؤكدة بالكامل</p>
        </div>
        <div className="glass-panel lawyer-card" style={{ borderRight: '4px solid var(--warning)' }}>
          <h3>إجمالي المبالغ المعلقة</h3>
          <h1 style={{ color: 'var(--warning)', fontSize: '2.2rem' }}>
            {pendingRevenue.toLocaleString('ar-YE')} <span style={{ fontSize: '1rem' }}>ريال يمني</span>
          </h1>
          <p>أتعاب بانتظار سداد الموكلين</p>
        </div>
      </div>

      <InvoiceTable invoices={invoices} />

      {showInvoiceModal && (
        <InvoiceModal onClose={() => setShowInvoiceModal(false)} />
      )}
    </div>
  );
}
