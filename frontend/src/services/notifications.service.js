import { get, post, patch, del, request, put } from './api.client';

export const notificationsService = {

  list:        (token)        => get('/notifications', token),
  markRead:    (id, token)    => request('PUT', `/notifications/${id}/read`, {}, token),
  markAllRead: (token)        => request('PUT', '/notifications/read-all', {}, token),
  delete:      (id, token)    => del(`/notifications/${id}`, token),
  clearAll:    (token)        => del('/notifications/clear-all', token),
};
