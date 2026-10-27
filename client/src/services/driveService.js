import api from './api';

// Drop empty filters so URLs stay clean ("?search=" etc.).
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false));

export const listDrives = (params) => api.get('/drives', { params: clean(params) }).then((r) => r.data);
export const getDrive = (id) => api.get(`/drives/${id}`).then((r) => r.data.drive);
export const createDrive = (data) => api.post('/drives', data).then((r) => r.data.drive);
export const updateDrive = (id, data) => api.put(`/drives/${id}`, data).then((r) => r.data.drive);
export const deleteDrive = (id) => api.delete(`/drives/${id}`).then((r) => r.data);
export const applyToDrive = (id) => api.post(`/drives/${id}/apply`).then((r) => r.data.application);
export const getApplicants = (id, params) =>
  api.get(`/drives/${id}/applicants`, { params: clean(params) }).then((r) => r.data);
