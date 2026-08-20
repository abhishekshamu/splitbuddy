import { get, post, patch, del, request, put } from './api.client';

export const reportsService = {

  monthly:    (gid, months, token) => get(`/reports/group/${gid}/monthly?months=${months || 6}`, token),
  categories: (gid, params, token) => {
    const qs = new URLSearchParams(params || {}).toString();
    return get(`/reports/group/${gid}/categories?${qs}`, token);
  },
  members:    (gid, token)   => get(`/reports/group/${gid}/members`, token),
  mySummary:  (token)        => get('/reports/user/summary', token),
};
