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
    // Get token from localStorage
    const token = localStorage.getItem('token');

    // If token exists, add it to the request header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');

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

    // Reject with a clean error object
    return Promise.reject({ message, status });
  }
);

export default api;
