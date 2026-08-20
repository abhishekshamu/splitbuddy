import { get, post, patch, del, request, put } from './api.client';

export const expensesService = {

  list:       (group_id, params, token) => {
    const qs = new URLSearchParams(params || {}).toString();
    return get(`/expenses/group/${group_id}?${qs}`, token);
  },
  all:        (params, token) => {
    const qs = new URLSearchParams(params || {}).toString();
    return get(`/expenses?${qs}`, token);
  },
  settlePlan: (group_id, token) => get(`/expenses/group/${group_id}/settle-plan`, token),
  add:        (data, token)     => post('/expenses', data, token),
  get:        (id, token)       => get(`/expenses/${id}`, token),
  update:     (id, data, token) => patch(`/expenses/${id}`, data, token),
  delete:     (id, token)       => del(`/expenses/${id}`, token),
};
