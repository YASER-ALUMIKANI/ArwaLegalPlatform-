import { apiClient } from './api';

export const lawsService = {
  search: (query = '', lawName = '') => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (lawName) params.append('law_name', lawName);
    const queryString = params.toString();
    return apiClient(`/laws${queryString ? `?${queryString}` : ''}`);
  },
};
