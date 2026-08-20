import { get, post, patch, del, request, put } from './api.client';

export const membersService = {

  search: (q, token) => get(`/members/search?q=${encodeURIComponent(q)}`, token),
  get:    (id, token) => get(`/members/${id}`, token),
};
