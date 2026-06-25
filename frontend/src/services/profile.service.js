import { apiClient } from './api';

export const profileService = {
  getLawyer: () => apiClient('/lawyers/profile'),
  updateLawyer: (data) => apiClient('/lawyers/profile', { method: 'PUT', body: JSON.stringify(data) }),
};
