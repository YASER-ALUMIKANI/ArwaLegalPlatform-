import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../../../services/notifications.service';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.getAll,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const readMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => notificationsService.markAsRead(n.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  return (
    <div className="notif-container" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
      <span className="notif-bell">
        🔔 {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </span>
      
      {isOpen && (
        <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="notif-dropdown-header">
            <h4>تنبيهات المنصة والقنوات</h4>
            {unreadCount > 0 && (
              <span 
                style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={() => markAllReadMutation.mutate()}
              >
                تعليم الكل كمقروء ✓
              </span>
            )}
          </div>
          <ul className="notif-list">
            {notifications.map(n => (
              <li 
                key={n.id} 
                className={`notif-item ${!n.is_read ? 'unread' : ''}`} 
                onClick={() => !n.is_read && readMutation.mutate(n.id)}
              >
                <div className="notif-item-title">
                  <span>{n.title}</span>
                  <span className={`notif-channel-badge notif-channel-${n.type}`}>
                    {n.channel}
                  </span>
                </div>
                <p className="notif-item-content">{n.content}</p>
                <span className="notif-item-time">
                  {new Date(n.created_at).toLocaleTimeString('ar-YE', {hour: '2-digit', minute:'2-digit'})} - {new Date(n.created_at).toLocaleDateString('ar-YE')}
                </span>
              </li>
            ))}
            {notifications.length === 0 && (
              <li style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                لا توجد أي تنبيهات حالية.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
