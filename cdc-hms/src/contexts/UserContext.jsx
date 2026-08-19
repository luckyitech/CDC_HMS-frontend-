import { createContext, useContext, useState, useEffect } from 'react';
import { mockUsers } from '../data/mockData';
import { mockPatients } from '../data/mockData';
import authService from '../services/authService';
import api from '../services/api';

// Create Context
const UserContext = createContext();

// Custom Hook to use UserContext
export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within UserProvider');
  }
  return context;
};

// Provider Component
export const UserProvider = ({ children }) => {
  // Initialise synchronously from sessionStorage so ProtectedRoute never sees a
  // false null on the first render (prevents flash-redirect on page refresh).
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      sessionStorage.removeItem('currentUser');
      return null;
    }
  });
  const [loading, setLoading] = useState(false);  // NEW: loading state for async operations
  const [doctors, setDoctors] = useState([]);
  const [staff] = useState(mockUsers.staff);
  const [labTechs] = useState(mockUsers.labTechs);
  const [admins] = useState(mockUsers.admins);


  // Re-read the signed-in user from the server once on load.
  //
  // The cached copy is written at login and never again, so anything an admin
  // changes afterwards — a portal granted, a capability withdrawn — stayed
  // invisible until that person logged out. It was worse than stale: the cached
  // `portals` list is authoritative in canOpenPortal, so a session predating a
  // NEW portal could never see it at all, because the role-defaults fallback
  // only runs when the key is missing entirely.
  //
  // The API has always enforced live (authenticate re-reads role and permissions
  // from the database on every request), so this was never a hole — the screens
  // simply disagreed with the server until the next login. One call on mount
  // closes that, and a refresh is now enough to pick up a change.
  useEffect(() => {
    if (!currentUser || currentUser.mustChangePassword) return;
    let cancelled = false;
    authService.getMe()
      .then((res) => {
        if (cancelled || !res?.success || !res.data) return;
        // Replace rather than merge: a withdrawn capability has to be able to
        // disappear, and merging would keep it forever.
        setCurrentUser((prev) => {
          const next = { ...res.data, mustChangePassword: prev?.mustChangePassword ?? false };
          sessionStorage.setItem('currentUser', JSON.stringify(next));
          return next;
        });
      })
      .catch(() => {
        // A failure here is not worth acting on: a dead token is already handled
        // by the 401 path in the api interceptor, and anything else leaves the
        // cached user in place, which is exactly the old behaviour.
      });
    return () => { cancelled = true; };
    // Deliberately once per mount, not on every currentUser change — this sets
    // currentUser, so depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch doctors whenever a user logs in (requires valid token).
  // Skipped while a password change is being forced — every API call except
  // change-password is rejected with 403 until then, so this would only make
  // noise.
  useEffect(() => {
    if (!currentUser || currentUser.mustChangePassword) return;
    api.get('/users/doctors')
      .then(res => { if (res.success) setDoctors(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {});
  }, [currentUser]);

  // Merge fields into the signed-in user, keeping sessionStorage in step so a
  // refresh does not resurrect the old value. Used to drop mustChangePassword
  // the moment a new password is accepted.
  const patchCurrentUser = (fields) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...fields };
      sessionStorage.setItem('currentUser', JSON.stringify(next));
      return next;
    });
  };

  // Get all users combined
  const getAllUsers = () => {
    return [
      ...doctors.map(d => ({ ...d, role: 'Doctor' })),
      ...staff.map(s => ({ ...s, role: 'Staff' })),
      ...labTechs.map(l => ({ ...l, role: 'Lab' })),
      ...admins.map(a => ({ ...a, role: 'Admin' })),
    ];
  };

  // Get user by email
  const getUserByEmail = (email) => {
    const allUsers = getAllUsers();
    return allUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
  };

  // Get patient by email
  const getPatientByEmail = (email) => {
    return mockPatients.find(patient => patient.email.toLowerCase() === email.toLowerCase());
  };

  // Get user by ID and role
  const getUserById = (id, role) => {
    switch (role) {
      case 'Doctor':
        return doctors.find(d => d.id === id);
      case 'Staff':
        return staff.find(s => s.id === id);
      case 'Lab':
        return labTechs.find(l => l.id === id);
      case 'Admin':
        return admins.find(a => a.id === id);
      default:
        return null;
    }
  };

  // Login function - NOW USES REAL API
  const login = async (email, password) => {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required' };
    }

    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.success) {
        setCurrentUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // Logout function - NOW USES REAL API
  const logout = async () => {
    setLoading(true);
    try {
      // Call backend to invalidate token
      await authService.logout();
    } catch (error) {
      // Even if API fails, still clear local state
      console.warn('Logout API error:', error.message);
    } finally {
      // Always clear user state
      setCurrentUser(null);
      setLoading(false);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return currentUser !== null;
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return currentUser?.role === role;
  };

  // Get doctors list
  const getDoctors = () => doctors;

  // Get staff list
  const getStaff = () => staff;

  // Get lab techs list
  const getLabTechs = () => labTechs;

  // Get admins list
  const getAdmins = () => admins;

  // Get users by role
  const getUsersByRole = (role) => {
    switch (role) {
      case 'Doctor':
        return doctors;
      case 'Staff':
        return staff;
      case 'Lab':
        return labTechs;
      case 'Admin':
        return admins;
      default:
        return [];
    }
  };

  // Add new user (for admin functionality)
  const addUser = (userData, role) => {
    // In a real app, this would call an API
    return { success: true, message: 'User created successfully' };
  };

  // Update user
  const updateUser = (userId, userData, role) => {
    // In a real app, this would call an API
    return { success: true, message: 'User updated successfully' };
  };

  // Delete user
  const deleteUser = (userId, role) => {
    // In a real app, this would call an API
    return { success: true, message: 'User deleted successfully' };
  };

  const value = {
    // State
    currentUser,
    loading,  // NEW: loading state for UI feedback
    doctors,
    staff,
    labTechs,
    admins,

    // Authentication Functions
    login,
    logout,
    isAuthenticated,
    hasRole,
    patchCurrentUser,
    
    // User Query Functions
    getAllUsers,
    getUserByEmail,
    getPatientByEmail,
    getUserById,
    getDoctors,
    getStaff,
    getLabTechs,
    getAdmins,
    getUsersByRole,
    
    // User Management Functions (for admin)
    addUser,
    updateUser,
    deleteUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};