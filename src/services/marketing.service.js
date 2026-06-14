import { api } from './api';

export const marketingService = {
  listBanners: (params) => api.get('/banners', { params }),
  createBanner: (data) => api.post('/banners', data),
  updateBanner: (id, data) => api.put(`/banners/${id}`, data),
  deleteBanner: (id) => api.delete(`/banners/${id}`),
  toggleBanner: (id) => api.patch(`/banners/${id}/toggle`),
  uploadBannerImage: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/banners/${id}/image`, fd, { headers: {'Content-Type':'multipart/form-data'} });
  },
  listBenefits: () => api.get('/club-benefits'),
  createBenefit: (data) => api.post('/club-benefits', data),
  updateBenefit: (id, data) => api.put(`/club-benefits/${id}`, data),
  toggleBenefit: (id) => api.patch(`/club-benefits/${id}/toggle`),
  listPromotions: (params) => api.get('/promotions', { params }),
  createPromotion: (data) => api.post('/promotions', data),
  updatePromotion: (id, data) => api.put(`/promotions/${id}`, data),
  deletePromotion: (id) => api.delete(`/promotions/${id}`),
  togglePromotion: (id) => api.patch(`/promotions/${id}/toggle`),
  getWAStatus: () => api.get('/whatsapp/connection'),
  connectWA: () => api.post('/whatsapp/connect'),
  disconnectWA: () => api.post('/whatsapp/disconnect'),
  listAutoMessages: () => api.get('/whatsapp/auto-messages'),
  updateAutoMessage: (id, data) => api.put(`/whatsapp/auto-messages/${id}`, data),
  toggleAutoMessage: (id) => api.patch(`/whatsapp/auto-messages/${id}/toggle`),
  testAutoMessage: (id, phone) => api.post(`/whatsapp/auto-messages/${id}/test`, { phone }),
  listFlows: () => api.get('/whatsapp/flows'),
  toggleFlow: (id) => api.patch(`/whatsapp/flows/${id}/toggle`),
  listCampaigns: (params) => api.get('/whatsapp/campaigns', { params }),
  createCampaign: (data) => api.post('/whatsapp/campaigns', data),
  sendCampaign: (id) => api.post(`/whatsapp/campaigns/${id}/send`),
};
