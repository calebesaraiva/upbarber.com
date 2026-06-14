import { api } from './api';

export const branchesService = {
  list: () => api.get('/branches'),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
  toggle: (id) => api.patch(`/branches/${id}/toggle`),
  setMain: (id) => api.patch(`/branches/${id}/main`),
};
