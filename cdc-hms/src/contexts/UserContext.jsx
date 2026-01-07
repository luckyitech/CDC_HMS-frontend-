import { createContext, useContext, useState, useEffect } from 'react';
import { mockUsers } from '../data/mockData';
import { mockPatients } from '../data/mockData';

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
  const [currentUser, setCurrentUser] = useState(null);
  const [doctors] = useState(mockUsers.doctors);
  const [staff] = useState(mockUsers.staff);
  const [labTechs] = useState(mockUsers.labTechs);
  const [admins] = useState(mockUsers.admins);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

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

  // Login function (mock)
  const login = (email, password, role) => {
    // Mock login - in real app, this would call API
    if (!email || !password) {
      return { success: false, message: 'Email and password are required' };
    }

    // Check if it's a patient login
    if (role === 'Patient') {
      const patient = getPatientByEmail(email);
      if (patient) {
        const userWithRole = { ...patient, role: 'Patient' };
        setCurrentUser(userWithRole);
        localStorage.setItem('currentUser', JSON.stringify(userWithRole));
        return { success: true, user: userWithRole };
      }
      return { success: false, message: 'User not found' };
    }

    // For other roles (Doctor, Staff, Lab, Admin)
    const user = getUserByEmail(email);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    if (user.role !== role) {
      return { success: false, message: 'Invalid role for this user' };
    }

    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    return { success: true, user };
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
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
    doctors,
    staff,
    labTechs,
    admins,
    
    // Authentication Functions
    login,
    logout,
    isAuthenticated,
    hasRole,
    
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