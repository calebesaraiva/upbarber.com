import { api } from './api';

export const productsService = {
  list: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock'),
  listMovements: (params) => api.get('/stock/movements', { params }),
  addMovement: (data) => api.post('/stock/movements', data),
  bulkAdjust: (items) => api.post('/stock/adjustment', { items }),
  listOrders: (params) => api.get('/orders', { params }),
  createOrder: (data) => api.post('/orders', data),
  getOrder: (id) => api.get(`/orders/${id}`),
  closeOrder: (id, data) => api.patch(`/orders/${id}/close`, data),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel`),
  addOrderItem: (id, data) => api.post(`/orders/${id}/items`, data),
  removeOrderItem: (orderId, itemId) => api.delete(`/orders/${orderId}/items/${itemId}`),
};
