import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lawsService } from '../../../services/laws.service';

export default function LawsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLawBook, setSelectedLawBook] = useState('');

  const { data: lawsList = [], isLoading } = useQuery({
    queryKey: ['laws', searchQuery, selectedLawBook],
    queryFn: () => lawsService.search(searchQuery, selectedLawBook),
  });

  return (
    <div className="laws-library-container">
      <h1>⚖️ مكتبة القوانين والتشريعات اليمنية</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        تصفح وابحث في القوانين المدنية والتجارية والجنائية المعمول بها في الجمهورية اليمنية.
      </p>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <input 
          type="text" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="form-input" 
          placeholder="ابحث برقم المادة أو كلمة مفتاحية (مثل: إيجار، تضامن، عقوبة)..." 
          style={{ flex: 2 }}
        />
        <select 
          value={selectedLawBook} 
          onChange={(e) => setSelectedLawBook(e.target.value)} 
          className="form-input" 
          style={{ flex: 1 }}
        >
          <option value="">كل القوانين</option>
          <option value="القانون المدني اليمني">القانون المدني اليمني</option>
          <option value="القانون التجاري اليمني">القانون التجاري اليمني</option>
          <option value="قانون العقوبات اليمني">قانون العقوبات اليمني</option>
          <option value="قانون الأحوال الشخصية اليمني">قانون الأحوال الشخصية اليمني</option>
        </select>
      </div>

      <div className="laws-list">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>🔄 جاري البحث في أرشيف المحكمة والتشريعات...</div>
        ) : (
          <>
            {lawsList.map((law, idx) => (
              <div key={law.id || idx} className="glass-panel law-card-item" style={{ padding: '20px', marginBottom: '15px', borderRight: '4px solid var(--accent-gold)', direction: 'rtl', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="badge badge-success" style={{ background: 'rgba(197, 160, 89, 0.1)', color: 'var(--accent-gold)' }}>{law.law_name}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{law.chapter || ''}</span>
                </div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>{law.article_number}</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  {law.content}
                </p>
                {law.keywords && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {law.keywords.split(' ').map((kw, kidx) => (
                      <span key={kidx} className="badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.03)' }}>#{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {lawsList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <h3>لا توجد مواد تطابق بحثك حالياً</h3>
                <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>جرب كتابة كلمات مثل "إيجار" أو "شيك" أو اختر قانوناً محدداً للتصفح.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
