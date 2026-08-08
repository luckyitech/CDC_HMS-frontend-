import axios from 'axios';

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
    // Get token from sessionStorage
    const token = sessionStorage.getItem('token');

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

    // Handle 401 Unauthorized - token expired or invalid
    if (status === 401) {
      // Clear stored auth data
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('currentUser');

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

    // Reject with a clean error object. `data` carries the backend's full
    // response body for callers that need structured payloads on error
    // (e.g. the stock FEFO gate's 409 with its fefoSuggestion).
    return Promise.reject({ message, status, data: error.response?.data });
  }
);

export default api;
