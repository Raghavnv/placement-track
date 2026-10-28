import api from './api';

// The bell: { data: notifications (newest first), unreadCount }.
export const listNotifications = () => api.get('/notifications').then((r) => r.data);
// Marks these ids read, or every notification when ids is omitted.
export const markNotificationsRead = (ids) => api.post('/notifications/read', ids ? { ids } : {}).then((r) => r.data);
