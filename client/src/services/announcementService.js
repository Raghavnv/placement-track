import api from './api';

export const listAnnouncements = (params = {}) =>
  api.get('/announcements', { params: Object.fromEntries(Object.entries(params).filter(([, v]) => v)) }).then((r) => r.data);
export const createAnnouncement = (data) => api.post('/announcements', data).then((r) => r.data.announcement);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`).then((r) => r.data);
