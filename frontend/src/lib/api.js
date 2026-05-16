/**
 * SplitBuddy – Frontend API Client
 * src/lib/api.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Core fetch wrapper ────────────────────────────────────────────
async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status  = res.status;
    err.details = data.details;
    throw err;
  }

  return data;
}

const get    = (path, token)        => request('GET',    path, null,  token);
const post   = (path, body, token)  => request('POST',   path, body,  token);
const patch  = (path, body, token)  => request('PATCH',  path, body,  token);
const del    = (path, token)        => request('DELETE', path, null,  token);

// ── Auth ──────────────────────────────────────────────────────────
export const auth = {
  register:    (data)          => post('/auth/register', data),
  login:       (email, pass)   => post('/auth/login',    { email, password: pass }),
  loginGoogle: (id_token)      => post('/auth/google',   { id_token }),
  sendOtp:     (phone)         => post('/auth/otp/send', { phone }),
  verifyOtp:   (phone, token)  => post('/auth/otp/verify', { phone, token }),
  refresh:     (rt)            => post('/auth/refresh',  { refresh_token: rt }),
  logout:      (token)         => post('/auth/logout',   {}, token),
  me:          (token)         => get('/auth/me',        token),
  updateMe:    (data, token)   => patch('/auth/me',      data, token),
  search:      (q, token)      => get(`/auth/search?q=${encodeURIComponent(q)}`, token),
};

// ── Groups ────────────────────────────────────────────────────────
export const groups = {
  list:          (token)              => get('/groups', token),
  create:        (data, token)        => post('/groups', data, token),
  get:           (id, token)          => get(`/groups/${id}`, token),
  update:        (id, data, token)    => patch(`/groups/${id}`, data, token),
  archive:       (id, token)          => del(`/groups/${id}`, token),
  regenerateInvite: (id, token)       => post(`/groups/${id}/invite`, {}, token),
  join:          (code, token)        => post(`/groups/join/${code}`, {}, token),
  leave:         (id, token)          => del(`/groups/${id}/leave`, token),
  members:       (id, token)          => get(`/groups/${id}/members`, token),
  updateMember:  (gid, uid, role, token) => patch(`/groups/${gid}/members/${uid}`, { role }, token),
  removeMember:  (gid, uid, token)    => del(`/groups/${gid}/members/${uid}`, token),
};

// ── Expenses ──────────────────────────────────────────────────────
export const expenses = {
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

// ── Settle ────────────────────────────────────────────────────────
export const settle = {
  plan:      (gid, token)     => get(`/settle/plan?group_id=${gid || 'all'}`, token),
  record:    (data, token)    => post('/settle', data, token),
  history:   (gid, token)     => get(`/settle/history?group_id=${gid || 'all'}`, token),
  delete:    (id, token)      => del(`/settle/${id}`, token),
};

// ── Reports ───────────────────────────────────────────────────────
export const reports = {
  monthly:    (gid, months, token) => get(`/reports/group/${gid}/monthly?months=${months || 6}`, token),
  categories: (gid, params, token) => {
    const qs = new URLSearchParams(params || {}).toString();
    return get(`/reports/group/${gid}/categories?${qs}`, token);
  },
  members:    (gid, token)   => get(`/reports/group/${gid}/members`, token),
  mySummary:  (token)        => get('/reports/user/summary', token),
};

// ── Utilities ─────────────────────────────────────────────────────
export const utility = {
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

// ── Notifications ──────────────────────────────────────────────────
export const notifications = {
  list:        (token)        => get('/notifications', token),
  markRead:    (id, token)    => request('PUT', `/notifications/${id}/read`, {}, token),
  markAllRead: (token)        => request('PUT', '/notifications/read-all', {}, token),
  delete:      (id, token)    => del(`/notifications/${id}`, token),
  clearAll:    (token)        => del('/notifications/clear-all', token),
};

// ── AI ────────────────────────────────────────────────────────────
export const ai = {
  chat:       (msg, group_id, history, token) =>
    post('/ai/chat', { message: msg, group_id, conversation_history: history }, token),
  summary:    (gid, token)  => get(`/ai/summary/${gid}`, token),
  tips:       (gid, token)  => get(`/ai/tips/${gid}`, token),
  anomalies:  (gid, token)  => get(`/ai/anomalies/${gid}`, token),
};

// ── Members ───────────────────────────────────────────────────────
export const members = {
  search: (q, token) => get(`/members/search?q=${encodeURIComponent(q)}`, token),
  get:    (id, token) => get(`/members/${id}`, token),
};

export default { auth, groups, expenses, settle, reports, utility, ai, members, notifications };
