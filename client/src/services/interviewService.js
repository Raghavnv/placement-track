import api from './api';

// AI mock interviews (Groq on the server). Writing questions and grading can take ~30s.
const AI_TIMEOUT = 90000;

// target: { driveId } or { job: { id, title, company, location, description, skills, salary } }
export const startInterview = (target) => api.post('/interviews', target, { timeout: AI_TIMEOUT }).then((r) => r.data.interview);
export const listInterviews = (params) => api.get('/interviews', { params }).then((r) => r.data);
export const getInterview = (id) => api.get(`/interviews/${id}`).then((r) => r.data.interview);
export const saveAnswer = (id, index, answer) => api.put(`/interviews/${id}/answers/${index}`, { answer }).then((r) => r.data);
export const finishInterview = (id) => api.post(`/interviews/${id}/finish`, null, { timeout: AI_TIMEOUT }).then((r) => r.data.interview);
