import api from './api';

export const updateProfile = (data) => api.patch('/auth/me', data).then((r) => r.data.user);

// The file goes up as the raw request body; the server checks it really is a PDF or JPG.
export const uploadResume = (file, onProgress) =>
  api
    .put('/auth/me/resume', file, {
      params: { name: file.name },
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    })
    .then((r) => r.data.user);

export const deleteResume = () => api.delete('/auth/me/resume').then((r) => r.data.user);

export const getResumeFile = () => api.get('/auth/me/resume', { responseType: 'blob' }).then((r) => r.data);
