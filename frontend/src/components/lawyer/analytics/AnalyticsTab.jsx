import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../../services/analytics.service';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

export default function AnalyticsTab() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsService.getLawyerAnalytics,
  });

  if (isLoading) {
    return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>🔄 جاري تحميل التحليلات البيانية والمبيعات...</div>;
  }

  if (error || !analytics) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--danger)' }}>
        ⚠️ فشل تحميل بيانات التحليلات من الخادم.
      </div>
    );
  }

  // Colors matching the visual design palette
  const statusColors = {
    'نشطة': '#1e3a60',
    'مغلقة': '#10b981',
    'قيد المراجعة': '#c5a059',
  };

  const getStatusColor = (status) => {
    return statusColors[status] || '#c5a059';
  };

  const pieData = analytics.case_status_distribution.map(item => ({
    name: item.status,
    value: item.count
  }));

  return (
    <div>
      <h1>📊 التقارير والتحليلات البيانية للمكتب</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        مؤشرات الأداء المالي والمهني لمكتبك مرسومة بالريال اليمني (YER).
      </p>

      <div className="card-grid">
        <div className="glass-panel lawyer-card" style={{ borderRight: '4px solid var(--success)' }}>
          <h3>إجمالي المبيعات المحصلة</h3>
          <h1 style={{ color: 'var(--success)', fontSize: '2rem' }}>
            {analytics.collected_revenue.toLocaleString('ar-YE')} <span style={{ fontSize: '0.85rem' }}>ر.ي</span>
          </h1>
          <p>أتعاب مستلمة وموثقة بسندات</p>
        </div>
        <div className="glass-panel lawyer-card" style={{ borderRight: '4px solid var(--warning)' }}>
          <h3>المستحقات المعلقة</h3>
          <h1 style={{ color: 'var(--warning)', fontSize: '2rem' }}>
            {analytics.pending_revenue.toLocaleString('ar-YE')} <span style={{ fontSize: '0.85rem' }}>ر.ي</span>
          </h1>
          <p>فواتير صادرة بانتظار سداد الموكل</p>
        </div>
        <div className="glass-panel lawyer-card" style={{ borderRight: '4px solid var(--accent-blue)' }}>
          <h3>معدل القضايا النشطة</h3>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '2.3rem' }}>
            {analytics.active_cases} <span style={{ fontSize: '0.9rem' }}>/ {analytics.total_cases}</span>
          </h1>
          <p>قضايا متداولة حالياً بالمحاكم</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '30px' }}>
        {/* مخطط الدخل الشهري */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px' }}>📈 مخطط التدفقات المالية الشهرية (أتعاب محصلة)</h3>
          <div style={{ width: '100%', height: '300px', flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.monthly_revenues}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}
                  formatter={(value) => [`${value.toLocaleString('ar-YE')} ر.ي`, 'أتعاب محصلة']}
                />
                <Bar dataKey="amount" fill="#c5a059" radius={[4, 4, 0, 0]}>
                  {analytics.monthly_revenues.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#c5a059" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* توزيع حالات القضايا */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '10px' }}>⚖️ توزيع القضايا حسب الحالة المهنية</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            مؤشر تفاعلي يعكس حجم القضايا الجارية والمنتهية.
          </p>
          <div style={{ width: '100%', height: '240px', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {analytics.total_cases > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    formatter={(value) => [`${value} قضية`]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span style={{ color: 'var(--text-primary)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>لا توجد قضايا لعرض توزيعها.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
