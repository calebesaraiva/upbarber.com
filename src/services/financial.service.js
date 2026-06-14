import { api } from './api';

export const financialService = {
  listTransactions: (params) => api.get('/financial/transactions', { params }),
  createTransaction: (data) => api.post('/financial/transactions', data),
  getSummary: (params) => api.get('/financial/summary', { params }),
  getCashFlow: (params) => api.get('/financial/cash-flow', { params }),
  getCommissions: (params) => api.get('/financial/commissions', { params }),
  getCurrentRegister: () => api.get('/cash-registers/current'),
  openRegister: (data) => api.post('/cash-registers/open', data),
  closeRegister: (id, data) => api.post(`/cash-registers/${id}/close`, data),
  getRegisterHistory: (params) => api.get('/cash-registers/history', { params }),
  getRegisterById: (id) => api.get(`/cash-registers/${id}`),
  generateCommissions: (data) => api.post('/commissions/generate', data),
  listCommissionReports: (params) => api.get('/commissions/reports', { params }),
  markCommissionPaid: (id, data = {}) => api.patch(`/commissions/reports/${id}/pay`, data),
  exportCommissionPdf: (id) => api.get(`/commissions/reports/${id}/pdf`, { responseType:'blob' }),
};
