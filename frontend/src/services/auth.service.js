import { get, post, patch, del, request, put } from './api.client';

export const authService = {

  register:    (data)          => post('/auth/register', data),
  login:       (email, pass)   => post('/auth/login',    { email, password: pass }),
  loginGoogle: (id_token)      => post('/auth/google',   { id_token }),
  sendOtp:     (phone)         => post('/auth/otp/send', { phone }),
  verifyOtp:   (phone, token)  => post('/auth/otp/verify', { phone, token }),
  refresh:     (rt)            => post('/auth/refresh',  { refresh_token: rt }),
  logout:      (token)         => post('/auth/logout',   {}, token),
  me:          (token)         => get('/auth/me',        token),
  updateMe:    (data, token)   => patch('/auth/me',      data, token),
  updateProfile: (data, token) => patch('/auth/me',      data, token),
  changePassword: (data, token) => post('/auth/change-password', data, token),
  deleteAccount: (token)       => del('/auth/me',        token),
  search:      (q, token)      => get(`/auth/search?q=${encodeURIComponent(q)}`, token),
  pinGroup:    (group_id, token) => post('/auth/me/pin-group', { group_id }, token),
};
