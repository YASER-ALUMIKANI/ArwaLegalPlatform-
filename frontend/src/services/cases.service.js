import { apiClient } from './api';

export const casesService = {
  getAll: () => apiClient('/cases'),
  getById: (id) => apiClient(`/cases/${id}`),
  create: (data) => apiClient('/cases', { method: 'POST', body: JSON.stringify(data) }),
  addHearing: (data) => apiClient('/hearings', { method: 'POST', body: JSON.stringify(data) }),
  sendMessage: (caseId, content) => apiClient(`/messages?case_id=${caseId}`, {
    method: 'POST',
    body: JSON.stringify({ content })
  }),
};
