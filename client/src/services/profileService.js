import api from './api';

export const updateProfile = (data) => api.patch('/auth/me', data).then((r) => r.data.user);
