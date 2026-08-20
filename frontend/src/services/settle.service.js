import { get, post, patch, del, request, put } from './api.client';

export const settleService = {

  plan:      (gid, mode, token) => get(`/settle/plan?group_id=${gid || 'all'}&settle_mode=${mode || 'transparent'}`, token),
  record:    (data, token)    => post('/settle', data, token),
  history:   (gid, token)     => get(`/settle/history?group_id=${gid || 'all'}`, token),
  undo:      (id, token)      => post(`/settle/${id}/undo`, {}, token),
  delete:    (id, token)      => del(`/settle/${id}`, token),
};
