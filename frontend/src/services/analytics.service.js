import { apiClient } from './api';

export const analyticsService = {
  getLawyerAnalytics: () => apiClient('/lawyer/analytics'),
};
