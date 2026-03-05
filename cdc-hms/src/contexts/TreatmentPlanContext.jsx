import { createContext, useContext, useState, useCallback } from 'react';
import treatmentPlanService from '../services/treatmentPlanService';

const TreatmentPlanContext = createContext();

export const useTreatmentPlanContext = () => {
  const context = useContext(TreatmentPlanContext);
  if (!context) {
    throw new Error('useTreatmentPlanContext must be used within TreatmentPlanProvider');
  }
  return context;
};

export const TreatmentPlanProvider = ({ children }) => {
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH TREATMENT PLANS FROM API
  // ============================================

  // Load all treatment plans from API
  const fetchTreatmentPlans = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await treatmentPlanService.getAll(params);
      if (response.success) {
        setTreatmentPlans(response.data.treatmentPlans || response.data);
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
  // TREATMENT PLAN OPERATIONS (API)
  // ============================================

  // Add new treatment plan (via API)
  // Note: Creating a new plan auto-completes previous Active plans for same patient
  const addTreatmentPlan = async (planData) => {
    setLoading(true);
    try {
      const response = await treatmentPlanService.create(planData);
      if (response.success) {
        // Refresh to get updated statuses (previous plans marked as Completed)
        await fetchTreatmentPlans();
        return response.data.treatmentPlan || response.data;
      }
      return null;
    } catch (err) {
      console.error('Add treatment plan error:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get all plans for a patient (via API)
  const getPlansByPatient = async (uhid) => {
    try {
      const response = await treatmentPlanService.getByPatient(uhid);
      if (response.success) {
        const plans = response.data.treatmentPlans || response.data;
        return plans.sort((a, b) => new Date(b.date) - new Date(a.date));
      }
      return [];
    } catch (err) {
      console.error('Get plans by patient error:', err.message);
      return [];
    }
  };

  // Get latest plan for a patient (fetches list and returns first)
  const getLatestPlan = async (uhid) => {
    try {
      const response = await treatmentPlanService.getByPatient(uhid, { limit: 1 });
      if (response.success) {
        const plans = response.data.treatmentPlans || response.data;
        return plans[0] || null;
      }
      return null;
    } catch (err) {
      console.error('Get latest plan error:', err.message);
      return null;
    }
  };

  // Get active plan for a patient
  const getActivePlan = async (uhid) => {
    try {
      const response = await treatmentPlanService.getActive(uhid);
      if (response.success) {
        const plans = response.data.treatmentPlans || response.data;
        return plans[0] || null;
      }
      return null;
    } catch (err) {
      console.error('Get active plan error:', err.message);
      return null;
    }
  };

  // Update plan status (via API)
  const updatePlanStatus = async (planId, newStatus) => {
    setLoading(true);
    try {
      const response = await treatmentPlanService.updateStatus(planId, { status: newStatus });
      if (response.success) {
        // Update local state
        setTreatmentPlans(prev =>
          prev.map(plan =>
            plan.id === planId ? { ...plan, status: newStatus } : plan
          )
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

  // Update treatment plan (via API)
  const updateTreatmentPlan = async (planId, updatedData) => {
    setLoading(true);
    try {
      const response = await treatmentPlanService.update(planId, updatedData);
      if (response.success) {
        const updatedPlan = response.data.treatmentPlan || response.data;
        setTreatmentPlans(prev =>
          prev.map(plan =>
            plan.id === planId ? updatedPlan : plan
          )
        );
        return { success: true, treatmentPlan: updatedPlan };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete treatment plan (via API)
  const deleteTreatmentPlan = async (planId) => {
    setLoading(true);
    try {
      const response = await treatmentPlanService.delete(planId);
      if (response.success) {
        setTreatmentPlans(prev => prev.filter(plan => plan.id !== planId));
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Get statistics (via API)
  const getPlanStats = async () => {
    try {
      const response = await treatmentPlanService.getStats();
      if (response.success) {
        return response.data;
      }
      // Fallback to local calculation
      return getLocalPlanStats();
    } catch (err) {
      console.error('Get plan stats error:', err.message);
      return getLocalPlanStats();
    }
  };

  // Local stats calculation (synchronous fallback)
  const getLocalPlanStats = () => {
    const active = treatmentPlans.filter(p => p.status === 'Active').length;
    const completed = treatmentPlans.filter(p => p.status === 'Completed').length;

    return {
      total: treatmentPlans.length,
      active,
      completed
    };
  };

  const value = {
    // State
    treatmentPlans,
    loading,
    error,

    // Functions
    fetchTreatmentPlans,
    addTreatmentPlan,
    getPlansByPatient,
    getLatestPlan,
    getActivePlan,
    updatePlanStatus,
    updateTreatmentPlan,
    deleteTreatmentPlan,
    getPlanStats,
    getLocalPlanStats,
  };

  return (
    <TreatmentPlanContext.Provider value={value}>
      {children}
    </TreatmentPlanContext.Provider>
  );
};
