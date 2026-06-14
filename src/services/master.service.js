import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api/v1';
const M = '/master';

const masterApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

masterApi.interceptors.request.use(config => {
  const token = localStorage.getItem('masterToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const masterLogin = (body) => masterApi.post(`${M}/auth/login`, body);
export const masterMe = () => masterApi.get(`${M}/auth/me`);
export const getMasterBarbershops = (params) => masterApi.get(`${M}/barbershops`, { params });
export const createMasterBarbershop = (body) => masterApi.post(`${M}/barbershops`, body);
export const getMasterBarbershopById = (id) => masterApi.get(`${M}/barbershops/${id}`);
export const suspendBarbershop = (id, body) => masterApi.patch(`${M}/barbershops/${id}/suspend`, body);
export const reactivateBarbershop = (id) => masterApi.patch(`${M}/barbershops/${id}/reactivate`);
export const impersonateBarbershop = (id) => masterApi.post(`${M}/barbershops/${id}/impersonate`);
export const getMasterBarbershopStats = () => masterApi.get(`${M}/barbershops/stats`);
export const getMasterInvoices = (params) => masterApi.get(`${M}/invoices`, { params });
export const getMasterInvoiceSummary = () => masterApi.get(`${M}/invoices/summary`);
export const generateMonthlyInvoices = () => masterApi.post(`${M}/invoices/generate-monthly`);
export const chargeInvoice = (id, body) => masterApi.post(`${M}/invoices/${id}/charge`, body);
export const markInvoicePaid = (id, body) => masterApi.patch(`${M}/invoices/${id}/mark-paid`, body);
export const getMasterPlans = () => masterApi.get(`${M}/plans`);
export const createMasterPlan = (body) => masterApi.post(`${M}/plans`, body);
export const updateMasterPlan = (id, body) => masterApi.put(`${M}/plans/${id}`, body);
export const deleteMasterPlan = (id) => masterApi.delete(`${M}/plans/${id}`);
export const getMasterMrrHistory = (p) => masterApi.get(`${M}/reports/mrr-history`, { params: p });
export const getMasterRevenueByPlan = () => masterApi.get(`${M}/reports/revenue-by-plan`);
export const getMasterChurn = (p) => masterApi.get(`${M}/reports/churn`, { params: p });
export const getMasterGrowth = (p) => masterApi.get(`${M}/reports/growth`, { params: p });
export const getMasterReportSummary = () => masterApi.get(`${M}/reports/summary`);
export const exportMasterReport = (p) => masterApi.get(`${M}/reports/export`, { params: p, responseType: 'blob' });
export const getMasterTickets = (p) => masterApi.get(`${M}/support/tickets`, { params: p });
export const getMasterTicketById = (id) => masterApi.get(`${M}/support/tickets/${id}`);
export const replyMasterTicket = (id, body) => masterApi.post(`${M}/support/tickets/${id}/reply`, body);
export const updateMasterTicket = (id, body) => masterApi.patch(`${M}/support/tickets/${id}`, body);
export const getMasterSupportStats = () => masterApi.get(`${M}/support/stats`);
export const getMasterConfig = () => masterApi.get(`${M}/config`);
export const updateMasterConfig = (body) => masterApi.put(`${M}/config`, body);
export const getMasterFlags = () => masterApi.get(`${M}/flags`);
export const updateMasterFlag = (flagId, planId, body) => masterApi.patch(`${M}/flags/${flagId}/plan/${planId}`, body);
