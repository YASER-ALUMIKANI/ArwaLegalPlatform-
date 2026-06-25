import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { casesService } from '../../../services/cases.service';

export default function HearingModal({ caseId, onClose }) {
  const queryClient = useQueryClient();
  const [newHearing, setNewHearing] = useState({ hearing_date: '', room_number: '', summary: '' });
  const [error, setError] = useState('');

  const addHearingMutation = useMutation({
    mutationFn: casesService.addHearing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'حدث خطأ أثناء إضافة الجلسة.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addHearingMutation.mutate({
      case_id: caseId,
      ...newHearing,
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-panel" style={{ padding: '30px', width: '450px', background: 'var(--bg-secondary)' }}>
        <h2>جدولة جلسة مرافعة جديدة</h2>
        {error && <div className="badge badge-warning" style={{ display: 'block', padding: '8px', marginBottom: '10px' }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="form-group">
            <label className="form-label">تاريخ ووقت الجلسة</label>
            <input 
              type="datetime-local" 
              value={newHearing.hearing_date} 
              onChange={(e) => setNewHearing({ ...newHearing, hearing_date: e.target.value })} 
              className="form-input" 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">قاعة / دائرة المحكمة</label>
            <input 
              type="text" 
              value={newHearing.room_number} 
              onChange={(e) => setNewHearing({ ...newHearing, room_number: e.target.value })} 
              className="form-input" 
              placeholder="مثال: القاعة الثالثة، الدائرة ب" 
            />
          </div>
          <div className="form-group">
            <label className="form-label">خلاصة موضوع الجلسة والتعليمات</label>
            <textarea 
              value={newHearing.summary} 
              onChange={(e) => setNewHearing({ ...newHearing, summary: e.target.value })} 
              className="form-input" 
              rows="3" 
              placeholder="اكتب خلاصة ما يجب تحضيره لهذه الجلسة..."
            ></textarea>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={addHearingMutation.isPending}>
              {addHearingMutation.isPending ? 'جاري الحفظ...' : 'حفظ وجدولة'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
