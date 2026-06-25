import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLawyerStore } from '../../store/lawyerStore';
import { documentsService } from '../../services/documents.service';
import { getWebSocketUrl } from '../../config/api';
import Sidebar from './Sidebar';
import Header from './Header';
import OverviewTab from './overview/OverviewTab';
import CasesTab from './cases/CasesTab';
import CaseDetail from './cases/CaseDetail';
import ConsultationsTab from './consultings/ConsultationsTab';
import VirtualSession from './consultings/VirtualSession';
import BillingTab from './billing/BillingTab';
import AnalyticsTab from './analytics/AnalyticsTab';
import LawsTab from './laws/LawsTab';
import AiAssistant from './ai/AiAssistant';
import LawyerSettings from './settings/LawyerSettings';

export default function DashboardLayout({ user, onLogout, onUpdateUser }) {
  const queryClient = useQueryClient();
  const activeTab = useLawyerStore((state) => state.activeTab);
  const selectedCaseId = useLawyerStore((state) => state.selectedCaseId);
  const selectedDocForAnalysis = useLawyerStore((state) => state.selectedDocForAnalysis);
  const setSelectedDocForAnalysis = useLawyerStore((state) => state.setSelectedDocForAnalysis);
  const isAnalysisModalOpen = useLawyerStore((state) => state.isAnalysisModalOpen);
  const setAnalysisModalOpen = useLawyerStore((state) => state.setAnalysisModalOpen);
  const [selectedDocType, setSelectedDocType] = useState('lease');
  const reconnectTimerRef = useRef(null);

  const analyzeMutation = useMutation({
    mutationFn: () => documentsService.analyze(selectedDocForAnalysis.id, selectedDocType),
    onSuccess: (updatedDoc) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', updatedDoc.case_id] });
      setSelectedDocForAnalysis(updatedDoc);
    },
  });

  const closeAnalysisModal = () => {
    setAnalysisModalOpen(false);
    setSelectedDocForAnalysis(null);
    setSelectedDocType('lease');
  };

  useEffect(() => {
    const url = getWebSocketUrl(user.id);
    if (!url) return undefined;

    let socket;
    let shouldReconnect = true;

    const connect = () => {
      socket = new WebSocket(url);
      socket.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['cases'] });
        queryClient.invalidateQueries({ queryKey: ['consultations'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        if (selectedCaseId) {
          queryClient.invalidateQueries({ queryKey: ['case', selectedCaseId] });
        }
      };
      socket.onclose = () => {
        if (shouldReconnect) {
          reconnectTimerRef.current = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      window.clearTimeout(reconnectTimerRef.current);
      socket?.close();
    };
  }, [queryClient, selectedCaseId, user.id]);

  const renderActiveTab = () => {
    if (activeTab === 'cases' && selectedCaseId) {
      return <CaseDetail userId={user.id} />;
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'cases':
        return <CasesTab />;
      case 'consultations':
        return <ConsultationsTab />;
      case 'virtual-session':
        return <VirtualSession user={user} />;
      case 'billing':
        return <BillingTab />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'laws':
        return <LawsTab />;
      case 'ai':
        return <AiAssistant />;
      case 'settings':
        return <LawyerSettings onUpdateUser={onUpdateUser} />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="dashboard-grid">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Header />
        {renderActiveTab()}
      </main>

      {isAnalysisModalOpen && selectedDocForAnalysis && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '30px', width: '600px', background: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2>التحليل القانوني الذكي للوثيقة</h2>
              <button className="btn btn-secondary" type="button" onClick={closeAnalysisModal}>إغلاق</button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              اسم الملف: <strong>{selectedDocForAnalysis.file_name}</strong>
            </p>

            {selectedDocForAnalysis.ai_analysis ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', fontSize: '0.9rem', direction: 'rtl', textAlign: 'right' }}>
                {selectedDocForAnalysis.ai_analysis}
              </div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); analyzeMutation.mutate(); }}>
                <div className="form-group">
                  <label className="form-label">نوع الوثيقة</label>
                  <select value={selectedDocType} onChange={(event) => setSelectedDocType(event.target.value)} className="form-input">
                    <option value="lease">عقد إيجار عقار</option>
                    <option value="commercial">عقد شراكة أو اتفاقية تجارية</option>
                    <option value="complaint">عريضة دعوى أو مذكرة قانونية</option>
                  </select>
                </div>
                {analyzeMutation.isError && (
                  <div className="badge badge-warning" style={{ display: 'block', padding: '12px', marginBottom: '15px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    {analyzeMutation.error?.message || 'فشل تحليل الوثيقة.'}
                  </div>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={analyzeMutation.isPending}>
                  {analyzeMutation.isPending ? 'جاري التحليل...' : 'تشغيل فحص الذكاء الاصطناعي'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
