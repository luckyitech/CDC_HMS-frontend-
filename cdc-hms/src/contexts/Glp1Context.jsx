import { createContext, useContext, useState, useCallback } from 'react';
import glp1Service from '../services/glp1Service';

const Glp1Context = createContext();

export const useGlp1Context = () => {
  const context = useContext(Glp1Context);
  if (!context) {
    throw new Error('useGlp1Context must be used within Glp1Provider');
  }
  return context;
};

export const Glp1Provider = ({ children }) => {
  // The formulary and the symptom catalogue are clinic-wide and change rarely,
  // so they are cached here rather than refetched for every patient.
  const [medications, setMedications] = useState([]);
  const [symptoms, setSymptoms]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  // ============================================
  // FORMULARY AND CATALOGUE
  // ============================================

  const fetchMedications = useCallback(async (params = {}) => {
    try {
      const response = await glp1Service.getMedications(params);
      if (response.success) {
        const list = response.data.medications || [];
        setMedications(list);
        return list;
      }
      return [];
    } catch (err) {
      console.error('Fetch GLP-1 medications error:', err.message);
      setError(err.message);
      return [];
    }
  }, []);

  const fetchSymptoms = useCallback(async (params = {}) => {
    try {
      const response = await glp1Service.getSymptoms(params);
      if (response.success) {
        const list = response.data.symptoms || [];
        setSymptoms(list);
        return list;
      }
      return [];
    } catch (err) {
      console.error('Fetch GLP-1 symptoms error:', err.message);
      return [];
    }
  }, []);

  // Adds a symptom clinic-wide and keeps the cached catalogue in step
  const addSymptom = useCallback(async (name) => {
    try {
      const response = await glp1Service.createSymptom(name);
      if (response.success) {
        const symptom = response.data;
        setSymptoms(prev => {
          const without = prev.filter(s => s.id !== symptom.id);
          return [...without, symptom].sort((a, b) => a.sortOrder - b.sortOrder);
        });
        return { success: true, symptom };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  // ============================================
  // THERAPIES
  // ============================================

  const getTherapiesByPatient = useCallback(async (uhid, params = {}) => {
    try {
      const response = await glp1Service.getTherapies(uhid, params);
      if (response.success) return response.data.therapies || [];
      return [];
    } catch (err) {
      console.error('Get GLP-1 therapies error:', err.message);
      return [];
    }
  }, []);

  /**
   * The single-request load: therapy, reviews and weekly summary together.
   * Returns null on failure — the caller decides what to show.
   */
  const getFullTherapy = useCallback(async (id) => {
    try {
      const response = await glp1Service.getFull(id);
      if (response.success) return response.data;
      return null;
    } catch (err) {
      console.error('Get GLP-1 therapy error:', err.message);
      return null;
    }
  }, []);

  /**
   * Starts a course. A 422 here is the safety screen refusing, and its message
   * names the finding — it is meant to be shown to the doctor verbatim.
   */
  const startTherapy = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await glp1Service.startTherapy(data);
      if (response.success) return { success: true, therapy: response.data };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message, status: err.status };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTherapy = useCallback(async (id, data) => {
    try {
      const response = await glp1Service.updateTherapy(id, data);
      if (response.success) return { success: true, therapy: response.data };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  const updateSchedule = useCallback(async (id, doseSchedule) => {
    try {
      const response = await glp1Service.updateSchedule(id, doseSchedule);
      // warnings lists any dose the server carried forward to close a gap
      if (response.success) {
        return { success: true, therapy: response.data, warnings: response.data?.warnings || [] };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  const addReviewWeek = useCallback(async (id, week) => {
    try {
      const response = await glp1Service.addReviewWeek(id, week);
      if (response.success) return { success: true, therapy: response.data };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  const stopTherapy = useCallback(async (id, reason) => {
    try {
      const response = await glp1Service.stopTherapy(id, reason);
      if (response.success) return { success: true, therapy: response.data };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  // Stops this course and starts the new agent linked to it, in one call
  const switchMedication = useCallback(async (id, data) => {
    try {
      const response = await glp1Service.switchMedication(id, data);
      if (response.success) return { success: true, therapy: response.data };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  // ============================================
  // WEEKLY INJECTIONS
  // ============================================

  const getAdministrations = useCallback(async (params) => {
    try {
      const response = await glp1Service.getAdministrations(params);
      if (response.success) return response.data.administrations || [];
      return [];
    } catch (err) {
      console.error('Get GLP-1 administrations error:', err.message);
      return [];
    }
  }, []);

  const recordAdministration = useCallback(async (data) => {
    try {
      const response = await glp1Service.recordAdministration(data);
      if (response.success) return { success: true, administration: response.data };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  const removeAdministration = useCallback(async (id) => {
    try {
      const response = await glp1Service.removeAdministration(id);
      if (response.success) return { success: true };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  // ============================================
  // REVIEWS
  // ============================================

  const addReview = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await glp1Service.createReview(data);
      if (response.success) return { success: true, review: response.data };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // amendmentReason is required by the API on every amendment
  const amendReview = useCallback(async (id, data) => {
    try {
      const response = await glp1Service.amendReview(id, data);
      if (response.success) return { success: true, review: response.data };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  const removeReview = useCallback(async (id, reason) => {
    try {
      const response = await glp1Service.removeReview(id, reason);
      if (response.success) return { success: true };
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  const value = {
    // State
    medications,
    symptoms,
    loading,
    error,

    // Agents (from the clinic catalogue) and symptom catalogue
    fetchMedications,
    fetchSymptoms,
    addSymptom,

    // Therapies
    getTherapiesByPatient,
    getFullTherapy,
    startTherapy,
    updateTherapy,
    updateSchedule,
    addReviewWeek,
    stopTherapy,
    switchMedication,

    // Weekly injections
    getAdministrations,
    recordAdministration,
    removeAdministration,

    // Reviews
    addReview,
    amendReview,
    removeReview,
  };

  return (
    <Glp1Context.Provider value={value}>
      {children}
    </Glp1Context.Provider>
  );
};
