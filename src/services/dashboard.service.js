import { api } from './api';

export const dashboardService = {
  load: async () => {
    const [financial, appointments, subscriptions, overdue, products, barbers, notifications] = await Promise.allSettled([
      api.get('/financial/summary'),
      api.get('/appointments/today'),
      api.get('/subscriptions/summary'),
      api.get('/subscriptions/overdue'),
      api.get('/products/low-stock'),
      api.get('/barbers'),
      api.get('/notifications'),
    ]);

    return {
      financial: financial.status === 'fulfilled' ? financial.value.data.data : { totalIncome: 0, profit: 0 },
      appointments: appointments.status === 'fulfilled' ? appointments.value.data.data : [],
      subscriptions: subscriptions.status === 'fulfilled' ? subscriptions.value.data.data : { active: 0 },
      overdue: overdue.status === 'fulfilled' ? overdue.value.data.data : [],
      products: products.status === 'fulfilled' ? products.value.data.data : [],
      barbers: barbers.status === 'fulfilled' ? barbers.value.data.data : [],
      notifications: notifications.status === 'fulfilled' ? notifications.value.data.data : [],
    };
  },
};
