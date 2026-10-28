import api from './api';

// Resume builder (api-contract.md #50-53). The draft holds everything except name, email and phone (from the profile).
export const getResumeDraft = () => api.get('/resume-builder').then((r) => r.data); // { data, updatedAt }
export const saveResumeDraft = (data) => api.put('/resume-builder', data).then((r) => r.data);
export const getResumePdf = () => api.get('/resume-builder/pdf', { responseType: 'blob' }).then((r) => r.data);
export const useBuilderResume = () => api.post('/resume-builder/use').then((r) => r.data.user);
