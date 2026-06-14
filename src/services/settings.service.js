import { api } from './api';

export const settingsService = {
  getBarbershop: () => api.get('/barbershop'),
  updateBarbershop: (data) => api.put('/barbershop', data),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.put('/barbershop/logo', fd, { headers: {'Content-Type':'multipart/form-data'} });
  },
  getHours: () => api.get('/barbershop/hours'),
  updateHours: (hours) => api.put('/barbershop/hours', { hours }),
  getPaymentMethods: () => api.get('/barbershop/payment-methods'),
  updatePaymentMethods: (data) => api.put('/barbershop/payment-methods', data),
  listUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getSaasPlans: () => api.get('/saas/plans'),
  getCurrentSaasInvoice: () => api.get('/saas/invoices/current'),
};
