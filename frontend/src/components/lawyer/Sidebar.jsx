import React from 'react';
import { useLawyerStore } from '../../store/lawyerStore';
import { useQuery } from '@tanstack/react-query';
import { casesService } from '../../services/cases.service';
import { consultationsService } from '../../services/consultations.service';

export default function Sidebar({ user, onLogout }) {
  const activeTab = useLawyerStore((state) => state.activeTab);
  const setActiveTab = useLawyerStore((state) => state.setActiveTab);
  const setSelectedCaseId = useLawyerStore((state) => state.setSelectedCaseId);

  // Fetch counts from backend
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: casesService.getAll,
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations'],
    queryFn: consultationsService.getAll,
  });

  const pendingConsultationsCount = consultations.filter(c => c.status === 'pending').length;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedCaseId(null);
  };

  return (
    <aside className="sidebar">
      <div>
        <h2 style={{ color: 'var(--accent-gold)', marginBottom: '8px' }}>منصة أروى</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>مكتب المحامي الرقمي</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
        <button 
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => handleTabChange('overview')}
        >
          💡 نظرة عامة
        </button>
        <button 
          className={`btn ${activeTab === 'cases' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => handleTabChange('cases')}
        >
          💼 القضايا والملفات ({cases.length})
        </button>
        <button 
          className={`btn ${activeTab === 'consultations' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => handleTabChange('consultations')}
        >
          📩 الاستشارات ({pendingConsultationsCount})
        </button>
        <button 
          className={`btn ${activeTab === 'billing' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => handleTabChange('billing')}
        >
          💳 المالية والفواتير
        </button>
        <button 
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => handleTabChange('analytics')}
        >
          📊 التحليلات والأداء
        </button>
        <button 
          className={`btn ${activeTab === 'laws' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => handleTabChange('laws')}
        >
          ⚖️ المكتبة القانونية
        </button>
        <button 
          className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => handleTabChange('ai')}
        >
          🧠 المساعد القانوني
        </button>
        <button 
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => handleTabChange('settings')}
        >
          ⚙️ إعدادات المكتب
        </button>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>مرحباً، أ. {user.full_name}</p>
        <button className="btn btn-danger" style={{ width: '100%' }} onClick={onLogout}>تسجيل الخروج</button>
      </div>
    </aside>
  );
}
