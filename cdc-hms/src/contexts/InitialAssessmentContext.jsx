import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import assessmentService from '../services/assessmentService';

const InitialAssessmentContext = createContext();

export const useInitialAssessmentContext = () => {
  const context = useContext(InitialAssessmentContext);
  if (!context) {
    throw new Error('useInitialAssessmentContext must be used within InitialAssessmentProvider');
  }
  return context;
};

export const InitialAssessmentProvider = ({ children }) => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH ASSESSMENTS FROM API
  // ============================================

  // Load all assessments from API
  const fetchAssessments = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await assessmentService.getAll(params);
      if (response.success) {
        setAssessments(response.data.assessments || response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load assessments on mount
  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // ============================================
  // ASSESSMENT OPERATIONS (API)
  // ============================================

  // Save assessment (via API)
  const saveAssessment = async (assessmentData) => {
    setLoading(true);
    try {
      const response = await assessmentService.create(assessmentData);
      if (response.success) {
        const newAssessment = response.data.assessment || response.data;
        setAssessments(prev => [newAssessment, ...prev]);
        return newAssessment;
      }
      return null;
    } catch (err) {
      console.error('Save assessment error:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get assessments by patient UHID (via API)
  const getAssessmentsByPatient = async (uhid) => {
    try {
      const response = await assessmentService.getByPatient(uhid);
      if (response.success) {
        return response.data.assessments || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get assessments by patient error:', err.message);
      return [];
    }
  };

  // Get latest assessment for a patient (fetches list and returns first)
  const getLatestAssessment = async (uhid) => {
    try {
      const response = await assessmentService.getByPatient(uhid, { limit: 1 });
      if (response.success) {
        const assessments = response.data.assessments || response.data;
        return assessments[0] || null;
      }
      return null;
    } catch (err) {
      console.error('Get latest assessment error:', err.message);
      return null;
    }
  };

  // Get assessment by ID (via API)
  const getAssessmentById = async (id) => {
    try {
      const response = await assessmentService.getById(id);
      if (response.success) {
        return response.data.assessment || response.data;
      }
      return null;
    } catch (err) {
      console.error('Get assessment by ID error:', err.message);
      return null;
    }
  };

  // Update assessment (via API)
  const updateAssessment = async (id, updatedData) => {
    setLoading(true);
    try {
      const response = await assessmentService.update(id, updatedData);
      if (response.success) {
        const updatedAssessment = response.data.assessment || response.data;
        setAssessments(prev =>
          prev.map(assessment =>
            assessment.id === id ? updatedAssessment : assessment
          )
        );
        return { success: true, assessment: updatedAssessment };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete assessment (via API)
  const deleteAssessment = async (id) => {
    setLoading(true);
    try {
      const response = await assessmentService.delete(id);
      if (response.success) {
        setAssessments(prev => prev.filter(assessment => assessment.id !== id));
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    // State
    assessments,
    loading,
    error,

    // Functions
    fetchAssessments,
    saveAssessment,
    getAssessmentsByPatient,
    getLatestAssessment,
    getAssessmentById,
    updateAssessment,
    deleteAssessment,
  };

  return (
    <InitialAssessmentContext.Provider value={value}>
      {children}
    </InitialAssessmentContext.Provider>
  );
};
