import React from 'react';
import { useLawyerStore } from '../../store/lawyerStore';
import NotificationDropdown from './notifications/NotificationDropdown';

export default function Header() {
  const activeTab = useLawyerStore((state) => state.activeTab);

  const getTitle = () => {
    switch (activeTab) {
      case 'overview': return '💡 لوحة التحكم المهنية';
      case 'cases': return '💼 سجل القضايا والملفات';
      case 'consultations': return '📩 طلبات الاستشارات القانونية';
      case 'billing': return '💳 الشؤون المالية وإصدار الفواتير';
      case 'analytics': return '📊 التحليلات البيانية والتقارير';
      case 'laws': return '⚖️ مكتبة القوانين والتشريعات اليمنية';
      case 'virtual-session': return '🎥 غرفة الاستشارة الافتراضية المباشرة';
      case 'settings': return '⚙️ إعدادات مكتب المحاماة والخدمات';
      default: return '🧠 المساعد القانوني الذكي لمنصة أروى';
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
        {getTitle()}
      </h3>
      <div className="header-actions">
        <NotificationDropdown />
      </div>
    </div>
  );
}
