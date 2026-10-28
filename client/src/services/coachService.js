import api from './api';

// AI Resume Coach (Groq on the server). Answers are saved per resume, so repeat calls are instant.
export const getReview = () => api.get('/coach/review').then((r) => r.data.review);
export const runReview = (refresh = false) => api.post('/coach/review', { refresh }, { timeout: 90000 }).then((r) => r.data.review);

// target: { driveId } for a campus drive, or { job } with the listing's fields for an outside job.
export const checkFit = (target, refresh = false) =>
  api.post('/coach/fit', { ...target, refresh }, { timeout: 90000 }).then((r) => r.data.fit);
