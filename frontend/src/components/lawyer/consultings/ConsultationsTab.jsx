import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationsService } from '../../../services/consultations.service';
import { useLawyerStore } from '../../../store/lawyerStore';

export default function ConsultationsTab() {
  const queryClient = useQueryClient();
  const setActiveTab = useLawyerStore(state => state.setActiveTab);
  const setActiveSessionConsultation = useLawyerStore(state => state.setActiveSessionConsultation);

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: consultationsService.getAll,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => consultationsService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const handleUpdateConsultation = (id, status) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleEnterSession = (c) => {
    setActiveSessionConsultation(c);
    setActiveTab('virtual-session');
  };

  if (isLoading) {
    return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>🔄 جاري تحميل طلبات الاستشارات...</div>;
  }

  return (
    <div>
      <h1>طلبات الاستشارات القانونية</h1>
      <div style={{ marginTop: '20px' }}>
        {consultations.map(c => (
          <div key={c.id} className="glass-panel" style={{ padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>👤 الموكل: {c.client_name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📅 الموعد المقترح: {new Date(c.date).toLocaleString('ar-EG')}</p>
              {c.notes && <p style={{ marginTop: '5px', fontSize: '0.85rem' }}>💬 تفاصيل: {c.notes}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              {c.status === 'pending' ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleUpdateConsultation(c.id, 'accepted')}
                    disabled={updateStatusMutation.isPending}
                  >
                    قبول الموعد
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleUpdateConsultation(c.id, 'rejected')}
                    disabled={updateStatusMutation.isPending}
                  >
                    رفض
                  </button>
                </div>
              ) : (
                <>
                  <span className="badge badge-success">{c.status === 'accepted' ? 'مقبولة' : c.status === 'completed' ? 'منتهية' : 'مرفوضة'}</span>
                  {(c.status === 'accepted' || c.status === 'completed') && (
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: '4px' }}
                      onClick={() => handleEnterSession(c)}
                    >
                      🎥 دخول غرفة الاستشارة
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {consultations.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>لا توجد طلبات استشارات حالية.</p>}
      </div>
    </div>
  );
}
