import { api } from './api';

export const dashboardService = {
  load: async () => {
    const [financial, appointments, subscriptions, overdue, products, barbers, notifications] = await Promise.all([
      api.get('/financial/summary'),
      api.get('/appointments/today'),
      api.get('/subscriptions/summary'),
      api.get('/subscriptions/overdue'),
      api.get('/products/low-stock'),
      api.get('/barbers'),
      api.get('/notifications'),
    ]);

    return {
      financial: financial.data.data,
      appointments: appointments.data.data,
      subscriptions: subscriptions.data.data,
      overdue: overdue.data.data,
      products: products.data.data,
      barbers: barbers.data.data,
      notifications: notifications.data.data,
    };
  },
};
