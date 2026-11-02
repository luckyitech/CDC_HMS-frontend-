import axios from 'axios';
import toast from 'react-hot-toast';

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR
// Runs BEFORE every request is sent
// ============================================
api.interceptors.request.use(
  (config) => {
    // Get token from sessionStorage — or, on the entrance-tag page, the
    // phone's check-in-only pass (17 Oct 2026). The pass is sent with that one
    // request and never stored as the HMS session: it can only check in.
    // The tag page never falls back to a password session sitting in this tab.
    const token = config.tapPage ? config.passToken : sessionStorage.getItem('token');

    if (token) {
      // If token exists, add it to the request header
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!config.url?.startsWith('/auth/')) {
      // No token and not an auth endpoint — cancel silently
      // Prevents 401 console noise on the portal selection page before login
      return Promise.reject({ message: 'Not authenticated', status: 401 });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// Runs AFTER every response is received
// ============================================
api.interceptors.response.use(
  // Success handler - return just the data (unwrap axios response)
  (response) => {
    return response.data;
  },

  // Error handler
  (error) => {
    // Get error message from backend response, or use default
    const message = error.response?.data?.message || 'An error occurred';
    const status = error.response?.status;

    // authorize() says different things for "not granted" and "withdrawn from
    // your account". Both are more useful than a generic refusal, so they are
    // kept and only the bare fallback is replaced below.
    const permissionMessage = error.response?.data?.message;

    // The entrance-tag page answers every refusal itself, on its own screen. It
    // has no HMS session to clear and must not be sent to the sign-in page.
    if (error.config?.tapPage) {
      return Promise.reject({ message, status, data: error.response?.data });
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (status === 401) {
      // Clear stored auth data
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('currentUser');
      // The network lock (16 Oct 2026): the session left the clinic network.
      // The sign-in page shows this once, so the person knows why they are out.
      // The check-in gate (2 Nov 2026): yesterday's session, and no check-in
      // today — the same: signed out, and told why.
      if (['OUTSIDE_CLINIC', 'CHECKIN_REQUIRED'].includes(error.response?.data?.code)) {
        try { sessionStorage.setItem('signoutReason', error.response.data.message); } catch { /* private mode */ }
      }

      // Redirect to portal selection (only if not already there)
      // The main login/portal page is at "/" not "/login"
      if (
        window.location.pathname !== '/' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/forgot-password')
      ) {
        window.location.href = '/';
      }
    }

    // Weekly password rotation: the password expired mid-session (a Monday
    // rollover while the tab was left open). The token is still valid, so this
    // is not a 401 — flag the stored user and send them to set a new password
    // rather than letting every screen fill with error toasts.
    if (status === 403 && error.response?.data?.code === 'PASSWORD_ROTATION_REQUIRED') {
      try {
        const stored = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (stored) {
          const path = `/${stored.role}/change-password`;
          sessionStorage.setItem(
            'currentUser',
            JSON.stringify({ ...stored, mustChangePassword: true })
          );
          if (window.location.pathname !== path) window.location.href = path;
        }
      } catch {
        // Unparseable session — the 401 path below/next request will clear it.
      }
    }

    // A refused action, as opposed to an expired session (401, handled above)
    // or an expired password (the rotation branch above).
    //
    // Said here rather than left to each screen, because a screen that
    // .catch()es quietly — and several do — would otherwise show nothing at
    // all: the button appears to do nothing and the user retries. The fixed
    // toast id means a burst of refused requests from one page collapses into
    // a single message instead of a stack of identical ones.
    if (status === 403) {
      // authorize() already sends a whole sentence, and says more than anything
      // generic could when a capability was explicitly withdrawn. Keep it, and
      // add where to go next — which the API has no business knowing.
      const base = permissionMessage && permissionMessage !== 'Access denied'
        ? permissionMessage
        : 'You do not have permission to do that.';
      const shown = /administrator/i.test(base)
        ? base
        : `${base} Ask an administrator if you need access.`;

      // Only ACTIONS are announced.
      //
      // A refused write is something the person just tried to do: they pressed
      // a button and it has to say why nothing happened. A refused GET is
      // usually a screen loading a section this account does not have — it was
      // never an action, and shouting about it produces a permission warning
      // for simply opening a page. Opening a patient file fires several reads
      // at once, so a non-clinical account got a scary toast for doing nothing
      // but clicking View.
      //
      // The screen is responsible for the other half: it must not offer a
      // section it cannot load, or a silent 403 becomes a blank panel with no
      // explanation. Suppressing the toast without hiding the section would
      // trade a confusing message for a confusing emptiness.
      //
      // A read that IS an action — pressing Export, opening a report — can opt
      // back in with { announce403: true } on the request config.
      const isRead = (error.config?.method || 'get').toLowerCase() === 'get';
      const announce = error.config?.announce403 === true || !isRead;

      if (announce) toast.error(shown, { id: 'permission-denied' });
      return Promise.reject({ message: shown, status, data: error.response?.data, isPermissionDenied: true });
    }

    // Reject with a clean error object. `data` carries the backend's full
    // response body for callers that need structured payloads on error
    // (e.g. the stock FEFO gate's 409 with its fefoSuggestion).
    return Promise.reject({ message, status, data: error.response?.data });
  }
);

export default api;
