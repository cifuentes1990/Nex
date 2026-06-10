import axios from 'axios';
import { storage } from './storage';

export const api = axios.create({
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (!config.baseURL) config.baseURL = await storage.getApiUrl();
  const token = await storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) await storage.clear();
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data.data),
};

export const ordersApi = {
  list: (params?: Record<string, any>) =>
    api.get('/orders', { params }).then((r) => r.data.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }).then((r) => r.data.data),
};

export const productsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/products', { params }).then((r) => r.data.data),
};
