import { get, post, patch, del, request, put } from './api.client';

export const aiService = {

  chat:       (msg, group_id, history, token) =>
    post('/ai/chat', { message: msg, group_id, conversation_history: history }, token),
  summary:    (gid, token)  => get(`/ai/summary/${gid}`, token),
  tips:       (gid, token)  => get(`/ai/tips/${gid}`, token),
  anomalies:  (gid, token)  => get(`/ai/anomalies/${gid}`, token),
};
