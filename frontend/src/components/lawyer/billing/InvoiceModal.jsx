import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesService } from '../../../services/cases.service';
import { invoicesService } from '../../../services/invoices.service';

export default function InvoiceModal({ onClose }) {
  const queryClient = useQueryClient();
  const [newInvoice, setNewInvoice] = useState({ case_id: '', amount: '', description: '', due_date: '' });
  const [error, setError] = useState('');

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: casesService.getAll,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: invoicesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'حدث خطأ أثناء إصدار الفاتورة.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createInvoiceMutation.mutate({
      case_id: newInvoice.case_id,
      amount: parseFloat(newInvoice.amount),
      description: newInvoice.description,
      due_date: newInvoice.due_date
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-panel" style={{ padding: '30px', width: '450px', background: 'var(--bg-secondary)' }}>
        <h2>إصدار فاتورة أتعاب جديدة</h2>
        {error && <div className="badge badge-warning" style={{ display: 'block', padding: '8px', marginBottom: '10px' }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="form-group">
            <label className="form-label">اختر القضية المرتبطة</label>
            <select 
              value={newInvoice.case_id} 
              onChange={(e) => setNewInvoice({ ...newInvoice, case_id: e.target.value })} 
              className="form-input" 
              required
            >
              <option value="">-- اختر من القضايا النشطة --</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.title} (الموكل: {c.client_name})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">المبلغ المطلوب (بالريال اليمني)</label>
            <input 
              type="number" 
              value={newInvoice.amount} 
              onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })} 
              className="form-input" 
              placeholder="مثال: 75000" 
              min="1"
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">تاريخ الاستحقاق</label>
            <input 
              type="date" 
              value={newInvoice.due_date} 
              onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })} 
              className="form-input" 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">وصف المطالبة المالية / التفاصيل</label>
            <textarea 
              value={newInvoice.description} 
              onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })} 
              className="form-input" 
              rows="3" 
              placeholder="مثال: الدفعة الثانية من أتعاب صياغة ومتابعة لائحة الدعوى التجارية..."
              required
            ></textarea>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={createInvoiceMutation.isPending}>
              {createInvoiceMutation.isPending ? 'جاري الحفظ...' : 'تأكيد وإصدار الفاتورة'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
