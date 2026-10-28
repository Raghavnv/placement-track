import api from './api';

export const register = (data) => api.post('/auth/register', data).then((r) => r.data);
export const login = (credentials) => api.post('/auth/login', credentials).then((r) => r.data);
export const me = () => api.get('/auth/me').then((r) => r.data);
