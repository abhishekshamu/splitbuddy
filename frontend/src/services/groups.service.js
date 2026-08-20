import { get, post, patch, del, request, put } from './api.client';

export const groupsService = {

  list:          (token)              => get('/groups', token),
  create:        (data, token)        => post('/groups', data, token),
  get:           (id, token)          => get(`/groups/${id}`, token),
  update:        (id, data, token)    => patch(`/groups/${id}`, data, token),
  updateBudget:  (id, budget, token)  => request('PUT', `/groups/${id}/budget`, { monthly_budget: budget }, token),
  archive:       (id, token)          => del(`/groups/${id}`, token),
  regenerateInvite: (id, token)       => post(`/groups/${id}/invite`, {}, token),
  join:          (code, token)        => post(`/groups/join/${code}`, {}, token),
  leave:         (id, token)          => del(`/groups/${id}/leave`, token),
  members:       (id, token)          => get(`/groups/${id}/members`, token),
  updateMember:  (gid, uid, role, token) => patch(`/groups/${gid}/members/${uid}`, { role }, token),
  addMember:     (gid, data, token)   => post(`/groups/${gid}/members`, data, token),
  removeMember:  (gid, uid, token)    => del(`/groups/${gid}/members/${uid}`, token),
};
