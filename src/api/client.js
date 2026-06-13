// Single low-level transport to the GAS backend.
// POST with text/plain so the request stays a CORS "simple request"
// (no preflight) and no student data ever enters the URL (spec v1.1 §13.2).

const GAS_URL = import.meta.env.VITE_GAS_URL;

const TOKEN_KEY = 'amanah_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function gasPost(action, payload = {}) {
  if (!GAS_URL) throw new Error('VITE_GAS_URL belum diset (atau aktifkan VITE_USE_MOCK).');
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: getToken(), payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok') {
    const err = new Error(json.message || 'Request gagal');
    err.code = json.code;
    throw err;
  }
  return json.data;
}
