import api from './api';

export const getStats = (params) =>
  api.get('/admin/stats', { params: params?.graduationYear ? params : {} }).then((r) => r.data);

export const getStudentResume = (studentId) =>
  api.get(`/admin/students/${studentId}/resume`, { responseType: 'blob' }).then((r) => r.data);

export const listStudents = (params = {}) =>
  api.get('/admin/students', { params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)) }).then((r) => r.data);

export const getStudent = (id) => api.get(`/admin/students/${id}`).then((r) => r.data);
