import api from './api';

// Drop empty filters so URLs stay clean ("?q=" etc.).
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

// Outside job listings (Adzuna), scored against the student's profile. Not campus drives.
// Returns { data: jobs, pagination, search: { mode, keywords, location, suggestions } }.
export const searchJobs = (params) => api.get('/jobs', { params: clean(params) }).then((r) => r.data);
