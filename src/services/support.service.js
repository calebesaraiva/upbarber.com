import { api } from './api';
export const supportService = {
  list: () => api.get('/support/tickets'),
  create: data => api.post('/support/tickets', data),
};
