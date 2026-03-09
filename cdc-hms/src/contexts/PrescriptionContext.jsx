import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import prescriptionService from '../services/prescriptionService';

// Create Context
const PrescriptionContext = createContext();

// Custom Hook to use PrescriptionContext
export const usePrescriptionContext = () => {
  const context = useContext(PrescriptionContext);
  if (!context) {
    throw new Error(
      'usePrescriptionContext must be used within PrescriptionProvider'
    );
  }
  return context;
};

// Provider Component
export const PrescriptionProvider = ({ children }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH PRESCRIPTIONS FROM API
  // ============================================

  // Load all prescriptions from API
  const fetchPrescriptions = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await prescriptionService.getAll(params);
      if (response.success) {
        setPrescriptions(response.data.prescriptions || response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load prescriptions on mount
  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // ============================================
  // PRESCRIPTION OPERATIONS (API)
  // ============================================

  // Get all prescriptions (from state)
  const getAllPrescriptions = () => prescriptions;

  // Get prescription by ID (via API for fresh data)
  const getPrescriptionById = async (id) => {
    try {
      const response = await prescriptionService.getById(id);
      if (response.success) {
        return response.data.prescription || response.data;
      }
      return null;
    } catch (err) {
      console.error('Get prescription error:', err.message);
      return null;
    }
  };

  // Get prescriptions by patient UHID (via API)
  const getPrescriptionsByPatient = async (uhid) => {
    try {
      const response = await prescriptionService.getByPatient(uhid);
      if (response.success) {
        return response.data.prescriptions || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get prescriptions by patient error:', err.message);
      return [];
    }
  };

  // Get prescriptions by doctor (local filter)
  const getPrescriptionsByDoctor = (doctorName) => {
    return prescriptions.filter(
      prescription => prescription.doctorName === doctorName
    );
  };

  // Get prescriptions by status (local filter)
  const getPrescriptionsByStatus = (status) => {
    return prescriptions.filter(
      prescription => prescription.status === status
    );
  };

  // Get active prescriptions for a patient (via API)
  const getActivePrescriptions = async (uhid) => {
    try {
      const response = await prescriptionService.getActive(uhid);
      if (response.success) {
        return response.data.prescriptions || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get active prescriptions error:', err.message);
      return [];
    }
  };

  // Get past prescriptions for a patient (via API)
  const getPastPrescriptions = async (uhid) => {
    try {
      const response = await prescriptionService.getByPatient(uhid, { status: 'Completed,Expired' });
      if (response.success) {
        return response.data.prescriptions || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get past prescriptions error:', err.message);
      return [];
    }
  };

  // Add new prescription (via API)
  const addPrescription = async (prescriptionData) => {
    setLoading(true);
    try {
      const response = await prescriptionService.create(prescriptionData);
      if (response.success) {
        await fetchPrescriptions();
        return response.data.prescription || response.data;
      }
      return null;
    } catch (err) {
      console.error('Add prescription error:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update prescription (via API)
  const updatePrescription = async (id, updatedData) => {
    setLoading(true);
    try {
      const response = await prescriptionService.update(id, updatedData);
      if (response.success) {
        // Update local state
        setPrescriptions(prev =>
          prev.map(p => p.id === id ? { ...p, ...response.data.prescription || response.data } : p)
        );
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update prescription status (via API - uses update endpoint)
  const updatePrescriptionStatus = async (id, status) => {
    setLoading(true);
    try {
      const response = await prescriptionService.update(id, { status });
      if (response.success) {
        // Update local state
        setPrescriptions(prev =>
          prev.map(p => p.id === id ? { ...p, status } : p)
        );
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete prescription (via API)
  const deletePrescription = async (id) => {
    setLoading(true);
    try {
      const response = await prescriptionService.delete(id);
      if (response.success) {
        setPrescriptions(prev => prev.filter(p => p.id !== id));
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Get prescription statistics (via API)
  const getPrescriptionStats = async () => {
    try {
      const response = await prescriptionService.getStats();
      if (response.success) {
        return response.data;
      }
      // Fallback to local calculation
      return getLocalPrescriptionStats();
    } catch (err) {
      console.error('Get prescription stats error:', err.message);
      return getLocalPrescriptionStats();
    }
  };

  // Local stats calculation (synchronous fallback)
  const getLocalPrescriptionStats = () => {
    return {
      total: prescriptions.length,
      active: prescriptions.filter(p => p.status === 'Active').length,
      completed: prescriptions.filter(p => p.status === 'Completed').length,
      expired: prescriptions.filter(p => p.status === 'Expired').length,
    };
  };

  const value = {
    // State
    prescriptions,
    loading,
    error,

    // Functions
    fetchPrescriptions,
    getAllPrescriptions,
    getPrescriptionById,
    getPrescriptionsByPatient,
    getPrescriptionsByDoctor,
    getPrescriptionsByStatus,
    getActivePrescriptions,
    getPastPrescriptions,
    addPrescription,
    updatePrescription,
    updatePrescriptionStatus,
    deletePrescription,
    getPrescriptionStats,
    getLocalPrescriptionStats,
  };

  return (
    <PrescriptionContext.Provider value={value}>
      {children}
    </PrescriptionContext.Provider>
  );
};
