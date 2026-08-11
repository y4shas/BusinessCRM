import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.patch(`/users/${id}`, data),
  deactivate: (id: number) => api.patch(`/users/${id}/deactivate`),
};

// ─── Customers ───────────────────────────────────────────────────────────────
export const customersApi = {
  list: (params?: Record<string, any>) => api.get('/customers', { params }),
  get: (id: number) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  addFollowUp: (id: number, data: any) => api.post(`/customers/${id}/follow-ups`, data),
  getFollowUps: (id: number, params?: any) => api.get(`/customers/${id}/follow-ups`, { params }),
};

// ─── Products ────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params?: Record<string, any>) => api.get('/products', { params }),
  get: (id: number) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  addStockMovement: (id: number, data: any) => api.post(`/products/${id}/stock-movements`, data),
  getStockMovements: (id: number, params?: any) => api.get(`/products/${id}/stock-movements`, { params }),
};

// ─── Challans ────────────────────────────────────────────────────────────────
export const challansApi = {
  list: (params?: Record<string, any>) => api.get('/challans', { params }),
  get: (id: number) => api.get(`/challans/${id}`),
  create: (data: any) => api.post('/challans', data),
  update: (id: number, data: any) => api.put(`/challans/${id}`, data),
  confirm: (id: number) => api.post(`/challans/${id}/confirm`),
  cancel: (id: number) => api.post(`/challans/${id}/cancel`),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
};

export default api;
