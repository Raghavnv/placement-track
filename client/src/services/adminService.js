import api from './api';

export const getStats = (params) =>
  api.get('/admin/stats', { params: params?.graduationYear ? params : {} }).then((r) => r.data);
