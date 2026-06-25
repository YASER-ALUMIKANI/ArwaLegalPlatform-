import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../../../services/profile.service';

export default function LawyerSettings({ onUpdateUser }) {
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    specialization: 'تجاري',
    hourly_rate: '',
    bio: ''
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getLawyer,
  });

  // Populate form when profile data changes
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        specialization: profile.specialization || 'تجاري',
        hourly_rate: profile.hourly_rate || '',
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: profileService.updateLawyer,
    onSuccess: (data) => {
      setStatusMessage('تم تحديث إعدادات وأسعار المكتب بنجاح.');
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (onUpdateUser) {
        onUpdateUser(data);
      }
    },
    onError: (err) => {
      setErrorMessage(err.message || 'فشل تحديث البيانات.');
      setStatusMessage('');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      ...profileForm,
      hourly_rate: parseFloat(profileForm.hourly_rate)
    });
  };

  return (
    <div>
      <h1>إعدادات مكتب المحاماة والخدمات</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        تتيح لك هذه الصفحة تعديل أسعار الاستشارات القانونية، التخصص الرئيسي، والبيانات المهنية للمكتب.
      </p>
      
      {statusMessage && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '15px' }}>✅ {statusMessage}</div>}
      {errorMessage && <div className="badge badge-warning" style={{ display: 'block', padding: '12px', marginBottom: '15px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>⚠️ {errorMessage}</div>}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '30px', maxWidth: '600px' }}>
        <h3 style={{ color: 'var(--accent-gold)', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>⚙️ تهيئة أسعار الخدمات والتخصص</h3>
        
        <div className="form-group">
          <label className="form-label">الاسم المهني للمحامي (كامل باللغة العربية)</label>
          <input 
            type="text" 
            value={profileForm.full_name} 
            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} 
            className="form-input" 
            required 
          />
        </div>

        <div className="form-group">
          <label className="form-label">رقم الهاتف (الواتساب المعتمد للتواصل)</label>
          <input 
            type="text" 
            value={profileForm.phone_number} 
            onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} 
            className="form-input" 
            required 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label className="form-label">نوع التخصص (نوع القضايا)</label>
            <select 
              value={profileForm.specialization} 
              onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })} 
              className="form-input"
            >
              <option value="تجاري">تجاري وشركات</option>
              <option value="جنائي">قضايا جنائية</option>
              <option value="مدني">حقوق ومدني</option>
              <option value="أحوال شخصية">أحوال شخصية ومواريث</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">سعر ساعة الاستشارة (بالريال اليمني)</label>
            <input 
              type="number" 
              value={profileForm.hourly_rate} 
              onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })} 
              className="form-input" 
              min="100"
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">نبذة تعريفية شاملة عن المكتب وعنوانه وخبراته</label>
          <textarea 
            value={profileForm.bio} 
            onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} 
            className="form-input" 
            rows="5" 
            placeholder="اكتب تفاصيل الخبرات والشهادات لمساعدة العملاء في اختياركم..."
          ></textarea>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', padding: '12px' }} disabled={updateProfileMutation.isPending}>
          {updateProfileMutation.isPending ? 'جاري حفظ التغييرات...' : '💾 حفظ وتطبيق التحديثات'}
        </button>
      </form>
    </div>
  );
}
