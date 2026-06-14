import { api } from './api';

export const clientsService = {
  list: (params) => api.get('/clients', { params }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  getHistory: (id) => api.get(`/clients/${id}/history`),
  getPurchases: (id) => api.get(`/clients/${id}/purchases`),
  getPayments: (id) => api.get(`/clients/${id}/payments`),
  createSubscription: (id, data) => api.post(`/clients/${id}/subscription`, data),
  cancelSubscription: (id) => api.delete(`/clients/${id}/subscription`),
};
