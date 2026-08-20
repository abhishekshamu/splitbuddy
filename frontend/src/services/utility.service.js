import { get, post, patch, del, request, put } from './api.client';

export const utilityService = {

  // Grocery
  groceryList:    (gid, token)       => get(`/utility/grocery/${gid}`, token),
  addGrocery:     (data, token)      => post('/utility/grocery', data, token),
  updateGrocery:  (id, data, token)  => patch(`/utility/grocery/${id}`, data, token),
  toggleGrocery:  (id, token)        => patch(`/utility/grocery/${id}/toggle`, {}, token),
  deleteGrocery:  (id, token)        => del(`/utility/grocery/${id}`, token),

  // Chores
  chores:         (gid, token)       => get(`/utility/chores/${gid}`, token),
  addChore:       (data, token)      => post('/utility/chores', data, token),
  updateChore:    (id, data, token)  => patch(`/utility/chores/${id}`, data, token),
  rotateChores:   (gid, token)       => post(`/utility/chores/${gid}/rotate`, {}, token),
  deleteChore:    (id, token)        => del(`/utility/chores/${id}`, token),

  // Reminders
  reminders:      (gid, token)       => get(`/utility/reminders/${gid}`, token),
  addReminder:    (data, token)      => post('/utility/reminders', data, token),
  updateReminder: (id, data, token)  => patch(`/utility/reminders/${id}`, data, token),
  toggleReminder: (id, token)        => patch(`/utility/reminders/${id}/toggle`, {}, token),
  deleteReminder: (id, token)        => del(`/utility/reminders/${id}`, token),

  // Notes
  notes:          (gid, token)       => get(`/utility/notes/${gid}`, token),
  addNote:        (data, token)      => post('/utility/notes', data, token),
  updateNote:     (id, data, token)  => patch(`/utility/notes/${id}`, data, token),
  deleteNote:     (id, token)        => del(`/utility/notes/${id}`, token),

  // Shared Links
  links:          (gid, token)       => get(`/utility/links/${gid}`, token),
  addLink:        (data, token)      => post('/utility/links', data, token),
  deleteLink:     (id, token)        => del(`/utility/links/${id}`, token),

  // Payment Dues
  payments:       (gid, token)       => get(`/utility/payments/${gid}`, token),
  addPayment:     (data, token)      => post('/utility/payments', data, token),
  updatePayment:  (id, data, token)  => patch(`/utility/payments/${id}`, data, token),
  deletePayment:  (id, token)        => del(`/utility/payments/${id}`, token),

  // Activities
  activities:     (gid, token)       => get(`/utility/activities/${gid}`, token),

};
