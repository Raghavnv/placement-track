import api from './api';

export const getStats = (params) =>
  api.get('/admin/stats', { params: params?.graduationYear ? params : {} }).then((r) => r.data);

export const getStudentResume = (studentId) =>
  api.get(`/admin/students/${studentId}/resume`, { responseType: 'blob' }).then((r) => r.data);
