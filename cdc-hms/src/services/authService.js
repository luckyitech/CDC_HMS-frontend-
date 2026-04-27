import api from './api';

/**
 * Authentication Service
 * Handles all auth-related API calls: login, logout, password management
 */

export const authService = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} role - User role (doctor, staff, lab, patient, admin)
   * @returns {Promise} - { success: true, data: { token, user } }
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });

    // If login successful, store token and user in sessionStorage
    if (response.success && response.data.token) {
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }

    return response;
  },

  /**
   * Logout user
   * Calls backend to invalidate token, then clears local storage
   */
  logout: async () => {
    try {
      // Tell backend to invalidate the token
      await api.post('/auth/logout');
    } catch (error) {
      // Even if backend call fails, still clear local storage
      console.warn('Logout API call failed:', error.message);
    } finally {
      // Always clear local storage
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('currentUser');
    }
  },

  /**
   * Get current user profile
   * Uses the token to fetch fresh user data from backend
   * @returns {Promise} - { success: true, data: { user object } }
   */
  getMe: async () => {
    return api.get('/auth/me');
  },

  /**
   * Change password (for logged-in users)
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} - { success: true, message: '...' }
   */
  changePassword: async (currentPassword, newPassword) => {
    return api.put('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Request password reset email
   * @param {string} email - User email
   * @returns {Promise} - { success: true, message: '...' }
   */
  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email });
  },

  /**
   * Reset password using token from email
   * @param {string} token - Reset token from email
   * @param {string} password - New password
   * @returns {Promise} - { success: true, message: '...' }
   */
  resetPassword: async (token, password) => {
    return api.post('/auth/reset-password', { token, password });
  },
};

export default authService;
