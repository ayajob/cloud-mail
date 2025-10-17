import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return client.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  register: (email, password) =>
    client.post('/api/auth/register', { email, password }),
  
  getCurrentUser: () => client.get('/api/auth/me'),
  
  // Prefixes
  getPrefixes: () => client.get('/api/prefixes/'),
  
  createPrefix: (prefix, description, accessPassword) =>
    client.post('/api/prefixes/', {
      prefix,
      description,
      access_password: accessPassword,
    }),
  
  updatePrefix: (id, data) => client.put(`/api/prefixes/${id}`, data),
  
  deletePrefix: (id) => client.delete(`/api/prefixes/${id}`),
  
  verifyPrefixAccess: (prefix, accessPassword) =>
    client.post('/api/prefixes/verify', {
      prefix,
      access_password: accessPassword,
    }),
  
  // Emails
  fetchEmails: (prefix, accessPassword, limit = 50, offset = 0) =>
    client.post('/api/emails/fetch', {
      prefix,
      access_password: accessPassword,
      limit,
      offset,
    }),
  
  getAllEmails: (limit = 50, offset = 0) =>
    client.get('/api/emails/admin/all', {
      params: { limit, offset },
    }),
  
  refreshEmails: (prefix, accessPassword) =>
    client.post(`/api/emails/refresh/${prefix}`, null, {
      params: { access_password: accessPassword },
    }),
};

export default client;