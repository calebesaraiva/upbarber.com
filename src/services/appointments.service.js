import { api } from './api';

export const appointmentsService = {
  list: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id, reason) => api.delete(`/appointments/${id}`, { data: { cancelReason: reason } }),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  getAvailability: (params) => api.get('/appointments/availability', { params }),
  getToday: () => api.get('/appointments/today'),
  getSummary: (date) => api.get('/appointments/summary', { params: { date } }),
};
