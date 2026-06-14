import { api } from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  emailStatus: (email) => api.get('/auth/email-status', { params: { email } }),
  register: (data) => api.post('/auth/register', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  verifyEmailLink: (token) => api.get('/auth/verify-email-link', { params: { token } }),
  me: () => api.get('/auth/me'),
};
