// The phone side of a skin-photo hand-off (8 Oct 2026). NO sign-in — the
// one-time token from the QR link is the key — so these calls deliberately do
// NOT go through services/api (which adds the staff login and redirects to it).
// The phone keeps the key the server gives it on first open (sessionStorage).

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const keyName = (token) => `derm-capture-key:${String(token).slice(0, 16)}`;
const getKey = (token) => { try { return sessionStorage.getItem(keyName(token)) || ''; } catch { return ''; } };
const setKey = (token, k) => { try { sessionStorage.setItem(keyName(token), k); } catch { /* private mode: this tab only */ } };

const call = async (token, path, options = {}) => {
  const res = await fetch(`${API_URL}/derm-capture/${encodeURIComponent(token)}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), 'X-Capture-Key': getKey(token) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || `Request failed (${res.status})`);
    err.status = res.status; err.code = body?.code;
    throw err;
  }
  return body?.data ?? body;
};

// One open per token at a time: the server binds the link to the FIRST phone
// key it hands out, so a second open sent before the first answer arrives
// (React's development double-run, a double tap) would be refused as "another
// phone" (found 9 Oct 2026). Both callers share the first request instead.
const opening = new Map();

export const dermCaptureService = {
  open: (token) => {
    if (!opening.has(token)) {
      const p = call(token, '')
        .then((data) => { if (data?.deviceKey) setKey(token, data.deviceKey); return data; })
        .finally(() => { setTimeout(() => opening.delete(token), 0); });
      opening.set(token, p);
    }
    return opening.get(token);
  },
  upload: (token, blob, { regions, photoType }) => {
    const form = new FormData();
    form.append('photo', blob, 'skin.jpg');
    form.append('photoType', photoType || 'close_up');
    form.append('regions', JSON.stringify(regions || []));
    return call(token, '/photos', { method: 'POST', body: form });
  },
  done: (token) => call(token, '/done', { method: 'POST' }),
};

export default dermCaptureService;
