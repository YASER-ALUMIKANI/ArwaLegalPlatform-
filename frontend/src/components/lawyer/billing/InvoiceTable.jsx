import React from 'react';

export default function InvoiceTable({ invoices = [] }) {
  return (
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
                  <strong>{inv.case_title || 'غير حدد'}</strong>
                </td>
                <td>{inv.client_name}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>{Number(inv.amount).toLocaleString('ar-YE')} ر.ي</td>
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
  );
}
