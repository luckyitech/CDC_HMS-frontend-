import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import labService from '../services/labService';

const LabContext = createContext();

export const useLabContext = () => {
  const context = useContext(LabContext);
  if (!context) {
    throw new Error('useLabContext must be used within LabProvider');
  }
  return context;
};

export const LabProvider = ({ children }) => {
  const [labTests, setLabTests] = useState([]);
  const [pendingTests, setPendingTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH LAB TESTS FROM API
  // ============================================

  // Load all lab tests from API
  const fetchLabTests = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await labService.getAll(params);
      if (response.success) {
        const tests = response.data.labTests || response.data;
        setLabTests(tests);
        // Separate pending tests
        setPendingTests(tests.filter(t => t.status === 'Sample Collected' || t.status === 'Pending'));
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load lab tests on mount
  useEffect(() => {
    fetchLabTests();
  }, [fetchLabTests]);

  // ============================================
  // LAB TEST OPERATIONS (API)
  // ============================================

  // Add new lab test (order test)
  const addLabTest = async (testData) => {
    setLoading(true);
    try {
      const response = await labService.order(testData);
      if (response.success) {
        await fetchLabTests();
        return response.data.labTest || response.data;
      }
      return null;
    } catch (err) {
      console.error('Add lab test error:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Enter lab test results (lab tech) - uses update endpoint
  const enterResults = async (testId, resultsData) => {
    setLoading(true);
    try {
      const response = await labService.update(testId, resultsData);
      if (response.success) {
        await fetchLabTests();
        return { success: true, labTest: response.data.labTest || response.data };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Get all tests for a patient (via API)
  const getTestsByPatient = async (uhid) => {
    try {
      const response = await labService.getByPatient(uhid);
      if (response.success) {
        const tests = response.data.labTests || response.data;
        return tests.sort((a, b) => new Date(b.completedDate || b.orderedDate) - new Date(a.completedDate || a.orderedDate));
      }
      return [];
    } catch (err) {
      console.error('Get tests by patient error:', err.message);
      return [];
    }
  };

  // Get latest test of a specific type for a patient
  // Fetches all tests for patient and filters client-side
  const getLatestTestByType = async (uhid, testType) => {
    try {
      const response = await labService.getByPatient(uhid, { testType, status: 'Completed' });
      if (response.success) {
        const tests = response.data.labTests || response.data;
        // Sort by completedDate descending and return first
        const sorted = tests.sort((a, b) =>
          new Date(b.completedDate || b.orderedDate) - new Date(a.completedDate || a.orderedDate)
        );
        return sorted[0] || null;
      }
      return null;
    } catch (err) {
      console.error('Get latest test error:', err.message);
      return null;
    }
  };

  // Get all critical results (via API)
  const getCriticalTests = async () => {
    try {
      const response = await labService.getCritical();
      if (response.success) {
        return response.data.labTests || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get critical tests error:', err.message);
      return [];
    }
  };

  // Get pending tests (local filter from state)
  const getPendingTests = () => pendingTests;

  // Remove test from pending (update status via API)
  const removePendingTest = async (testId) => {
    // This is handled by enterResults - when results are entered, test moves from pending
    setPendingTests(prev => prev.filter(test => test.id !== testId));
  };

  // Add pending test (when doctor orders a test)
  const addPendingTest = async (testOrder) => {
    const result = await addLabTest(testOrder);
    return result;
  };

  // Get statistics (via API)
  const getLabStats = async () => {
    try {
      const response = await labService.getStats();
      if (response.success) {
        return response.data;
      }
      // Fallback to local calculation
      return getLocalLabStats();
    } catch (err) {
      console.error('Get lab stats error:', err.message);
      return getLocalLabStats();
    }
  };

  // Local stats calculation (synchronous fallback)
  const getLocalLabStats = () => {
    const completed = labTests.filter(t => t.status === 'Completed').length;
    const pending = pendingTests.length;
    const critical = labTests.filter(t => t.isCritical).length;
    const normal = labTests.filter(t => t.interpretation === 'Normal').length;
    const abnormal = labTests.filter(t => t.interpretation === 'Abnormal').length;

    return {
      totalTests: labTests.length,
      completed,
      pending,
      critical,
      normal,
      abnormal,
    };
  };

  // Update lab test status - uses update endpoint
  const updateLabTestStatus = async (testId, status) => {
    setLoading(true);
    try {
      const response = await labService.update(testId, { status });
      if (response.success) {
        await fetchLabTests();
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
    labTests,
    pendingTests,
    loading,
    error,

    // Functions
    fetchLabTests,
    addLabTest,
    enterResults,
    addPendingTest,
    getTestsByPatient,
    getLatestTestByType,
    getCriticalTests,
    getPendingTests,
    removePendingTest,
    getLabStats,
    getLocalLabStats,
    updateLabTestStatus,
  };

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
};
