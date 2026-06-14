import { api } from './api';

export const barbersService = {
  list: (params) => api.get('/barbers', { params }),
  getById: (id) => api.get(`/barbers/${id}`),
  create: (data) => api.post('/barbers', data),
  update: (id, data) => api.put(`/barbers/${id}`, data),
  delete: (id) => api.delete(`/barbers/${id}`),
  getSchedule: (id, params) => api.get(`/barbers/${id}/schedule`, { params }),
  getPerformance: (id, params) => api.get(`/barbers/${id}/performance`, { params }),
};
