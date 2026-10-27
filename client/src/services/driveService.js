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

// Body: { stage, remark, applicationIds } or { stage, remark, rollNumbers }. Returns { stage, moved, skipped, notFound }.
export const bulkMoveApplicants = (id, body) => api.post(`/drives/${id}/applicants/stage`, body).then((r) => r.data);

// ZIP of applicants' resumes. Body: { applicationIds } (ticked rows), { stage }, or {} (everyone).
export async function downloadResumesZip(id, body) {
  try {
    const response = await api.post(`/drives/${id}/applicants/resumes`, body, { responseType: 'blob' });
    const name = /filename="([^"]+)"/.exec(response.headers['content-disposition'] || '')?.[1] || 'resumes.zip';
    return {
      blob: response.data,
      filename: name,
      included: Number(response.headers['x-resume-count']) || 0,
      missing: Number(response.headers['x-missing-resume-count']) || 0,
    };
  } catch (error) {
    // Blob responses hide the JSON error body, so give the one case officers will hit a clear message.
    if (error.status === 404) throw { ...error, message: "None of these applicants have uploaded a resume yet." };
    throw error;
  }
}
