import api from './api';

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

// Interview experiences written by students (api-contract.md #46-49).
export const listExperiences = (params) => api.get('/experiences', { params: clean(params) }).then((r) => r.data);
export const listExperienceCompanies = () => api.get('/experiences/companies').then((r) => r.data.data);
export const createExperience = (body) => api.post('/experiences', body).then((r) => r.data.experience);
export const deleteExperience = (id) => api.delete(`/experiences/${id}`).then((r) => r.data);
