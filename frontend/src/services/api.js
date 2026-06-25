import { API_BASE } from '../config/api';

const DEFAULT_TIMEOUT_MS = 15000;
const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getAuthToken = () => localStorage.getItem('arwa_token');

export const apiClient = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const { timeout = DEFAULT_TIMEOUT_MS, retries = 1, ...requestOptions } = options;
  const headers = {
    ...(requestOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...requestOptions.headers,
  };
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const method = (requestOptions.method || 'GET').toUpperCase();
  const attempts = RETRYABLE_METHODS.has(method) ? retries + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...requestOptions,
        headers,
        signal: requestOptions.signal || controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'حدث خطأ أثناء جلب البيانات.');
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    } catch (error) {
      if (attempt === attempts - 1 || error.name === 'AbortError') {
        throw error.name === 'AbortError' ? new Error('انتهت مهلة الاتصال بالخادم.') : error;
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return null;
};
