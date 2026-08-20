import { CONFIG } from "../config";

const BASE_URL = CONFIG.API_URL;

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn("🟡 NEXT_PUBLIC_API_URL is missing. Falling back to default: " + BASE_URL);
}

export async function request(method, path, body = null, token = null) {
  if (!BASE_URL) throw new Error("API configuration missing (NEXT_PUBLIC_API_URL)");
  
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL.replace(/\/$/, '')}${fullPath}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    throw new Error('Unable to connect to server. The backend might be offline or blocked by CORS.');
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

export const get    = (path, token)        => request('GET',    path, null,  token);
export const post   = (path, body, token)  => request('POST',   path, body,  token);
export const patch  = (path, body, token)  => request('PATCH',  path, body,  token);
export const del    = (path, token)        => request('DELETE', path, null,  token);
export const put    = (path, body, token)  => request('PUT',    path, body,  token);
