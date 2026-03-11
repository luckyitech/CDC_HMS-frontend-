import { createContext, useContext, useState, useCallback } from 'react';
import physicalExamService from '../services/physicalExamService';

const PhysicalExamContext = createContext();

export const usePhysicalExamContext = () => {
  const context = useContext(PhysicalExamContext);
  if (!context) {
    throw new Error('usePhysicalExamContext must be used within PhysicalExamProvider');
  }
  return context;
};

export const PhysicalExamProvider = ({ children }) => {
  const [examinations, setExaminations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH EXAMINATIONS FROM API
  // ============================================

  // Load all examinations from API
  const fetchExaminations = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await physicalExamService.getAll(params);
      if (response.success) {
        setExaminations(response.data.physicalExams || response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);


  // ============================================
  // PHYSICAL EXAM OPERATIONS (API)
  // ============================================

  // Save examination (via API)
  const saveExamination = async (examData) => {
    try {
      const response = await physicalExamService.create(examData);
      if (response.success) {
        const newExam = response.data.physicalExam || response.data;
        setExaminations(prev => [newExam, ...prev]);
        return newExam;
      }
      return null;
    } catch (err) {
      console.error('Save examination error:', err.message);
      return null;
    }
  };

  // Update existing examination (via API)
  const updateExamination = async (examId, updatedData) => {
    try {
      const response = await physicalExamService.update(examId, updatedData);
      if (response.success) {
        const updatedExam = response.data.physicalExam || response.data;
        setExaminations(prev =>
          prev.map(exam =>
            exam.id === examId ? updatedExam : exam
          )
        );
        return updatedExam;
      }
      return null;
    } catch (err) {
      console.error('Update examination error:', err.message);
      return null;
    }
  };

  // Get examinations by patient UHID (via API)
  const getExaminationsByPatient = async (uhid) => {
    try {
      const response = await physicalExamService.getByPatient(uhid);
      if (response.success) {
        return response.data.physicalExams || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get examinations by patient error:', err.message);
      return [];
    }
  };

  // Get latest examination for a patient (fetches list and returns first)
  const getLatestExamination = async (uhid) => {
    try {
      const response = await physicalExamService.getByPatient(uhid, { limit: 1 });
      if (response.success) {
        const exams = response.data.physicalExams || response.data;
        return exams[0] || null;
      }
      return null;
    } catch (err) {
      console.error('Get latest examination error:', err.message);
      return null;
    }
  };

  // Get examination by ID (via API)
  const getExaminationById = async (id) => {
    try {
      const response = await physicalExamService.getById(id);
      if (response.success) {
        return response.data.physicalExam || response.data;
      }
      return null;
    } catch (err) {
      console.error('Get examination by ID error:', err.message);
      return null;
    }
  };

  // Search examinations by patient UHID and search term (via API)
  const searchExaminations = async (uhid, searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      return getExaminationsByPatient(uhid);
    }

    try {
      const response = await physicalExamService.search(uhid, searchTerm);
      if (response.success) {
        return response.data.physicalExams || response.data;
      }
      return [];
    } catch (err) {
      console.error('Search examinations error:', err.message);
      return [];
    }
  };

  // Delete examination (via API)
  const deleteExamination = async (id) => {
    setLoading(true);
    try {
      const response = await physicalExamService.delete(id);
      if (response.success) {
        setExaminations(prev => prev.filter(exam => exam.id !== id));
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
    examinations,
    loading,
    error,

    // Functions
    fetchExaminations,
    saveExamination,
    updateExamination,
    getExaminationsByPatient,
    getLatestExamination,
    getExaminationById,
    searchExaminations,
    deleteExamination,
  };

  return (
    <PhysicalExamContext.Provider value={value}>
      {children}
    </PhysicalExamContext.Provider>
  );
};
