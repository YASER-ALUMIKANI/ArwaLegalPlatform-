import { apiClient } from './api';

export const aiService = {
  getHistory: () => apiClient('/ai/chat'),
  sendMessage: (content) => apiClient('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ content })
  }),
};
