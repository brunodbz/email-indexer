import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(email, password) {
    return api.post('/auth/login', { email, password });
  },

  async register(userData) {
    return api.post('/auth/register', userData);
  },

  async getCurrentUser() {
    const response = await api.get('/users/profile');
    return response.data;
  },

  async setupMfa() {
    return api.post('/auth/setup-mfa');
  },

  async enableMfa(token) {
    return api.post('/auth/enable-mfa', { token });
  },

  async disableMfa(password) {
    return api.post('/auth/disable-mfa', { password });
  },

  async verifyMfa(token) {
    return api.post('/auth/verify-mfa', { token });
  }
};

export default api;