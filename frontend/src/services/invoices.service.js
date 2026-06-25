import { apiClient } from './api';

export const invoicesService = {
  getAll: () => apiClient('/invoices'),
  create: (data) => apiClient('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  pay: (id, paymentMethod) => apiClient(`/invoices/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({ payment_method: paymentMethod })
  }),
};
