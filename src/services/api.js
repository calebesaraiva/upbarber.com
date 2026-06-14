import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const unwrap = (payload) => payload?.data ?? payload;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('upbarber:token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const branchId = localStorage.getItem('upbarber:branchId');
  if (branchId) config.headers['X-Branch-Id'] = branchId;

  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const isAuthRequest = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (err.response?.status === 401 && !original?._retry && !isAuthRequest) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('upbarber:refreshToken');
        if (!refreshToken) throw new Error('Refresh token ausente');
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const tokens = unwrap(res.data);
        localStorage.setItem('upbarber:token', tokens.accessToken);
        localStorage.setItem('upbarber:refreshToken', tokens.refreshToken);
        original.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
