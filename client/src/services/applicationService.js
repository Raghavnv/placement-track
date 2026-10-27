import api from './api';

export const getMyApplications = () => api.get('/applications/me').then((r) => r.data);
export const getApplication = (id) => api.get(`/applications/${id}`).then((r) => r.data.application);
export const updateStage = (id, body) => api.patch(`/applications/${id}/stage`, body).then((r) => r.data.application);
export const updateNotes = (id, notes) => api.patch(`/applications/${id}/notes`, { notes }).then((r) => r.data.application);
export const getReminders = (days) => api.get('/applications/me/reminders', { params: { days } }).then((r) => r.data);

// The calendar needs the auth header, so fetch it as a blob and trigger the download ourselves.
export async function downloadCalendar() {
  const response = await api.get('/applications/me/calendar.ics', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'placementtrack.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
