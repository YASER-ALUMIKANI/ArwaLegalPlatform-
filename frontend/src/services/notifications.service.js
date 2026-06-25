import { apiClient } from './api';

export const notificationsService = {
  getAll: () => apiClient('/notifications'),
  markAsRead: (id) => apiClient(`/notifications/${id}/read`, { method: 'PATCH' }),
};
