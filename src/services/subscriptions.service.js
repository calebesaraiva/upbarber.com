import { api } from './api';

export const subscriptionsService = {
  listPlans: () => api.get('/subscription-plans'),
  createPlan: (data) => api.post('/subscription-plans', data),
  updatePlan: (id, data) => api.put(`/subscription-plans/${id}`, data),
  deletePlan: (id) => api.delete(`/subscription-plans/${id}`),
  list: (params) => api.get('/subscriptions', { params }),
  create: (data) => api.post('/subscriptions', data),
  cancel: (id) => api.post(`/subscriptions/${id}/cancel`),
  renew: (id) => api.post(`/subscriptions/${id}/renew`),
  charge: (id, data) => api.post(`/subscriptions/${id}/charge`, data),
  getSummary: () => api.get('/subscriptions/summary'),
  getOverdue: () => api.get('/subscriptions/overdue'),
  getCalendar: (params) => api.get('/subscriptions/calendar', { params }),
  listPayments: (params) => api.get('/subscription-payments', { params }),
  updatePaymentStatus: (id, status) => api.patch(`/subscription-payments/${id}/status`, { status }),
  getPipeline: (params) => api.get('/subscription-pipeline', { params }),
  addToPipeline: (data) => api.post('/subscription-pipeline', data),
  convert: (id) => api.post(`/subscription-pipeline/${id}/convert`),
  retain: (id) => api.post(`/subscription-pipeline/${id}/retain`),
  getContracts: (params) => api.get('/subscriptions', { params: { ...params, includeContracts: true } }),
  downloadContract: (id) => api.get(`/subscriptions/${id}/contract/pdf`, { responseType: 'blob' }),
};
