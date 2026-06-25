import { apiClient } from './api';

export const consultationsService = {
  getAll: () => apiClient('/consultations'),
  create: (data) => apiClient('/consultations', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) => apiClient(`/consultations/${id}?status_update=${status}`, { method: 'PATCH' }),
  updateSessionNotes: (id, sessionNotes) => apiClient(`/consultations/${id}/session-notes`, {
    method: 'POST',
    body: JSON.stringify({ session_notes: sessionNotes })
  }),
};
