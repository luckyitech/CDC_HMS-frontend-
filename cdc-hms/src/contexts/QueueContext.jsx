import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import queueService from '../services/queueService';

// Create Context
const QueueContext = createContext();

// Custom Hook to use QueueContext
export const useQueueContext = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueContext must be used within QueueProvider');
  }
  return context;
};

// Provider Component
export const QueueProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH QUEUE FROM API
  // ============================================

  // Load queue from API
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await queueService.getAll();
      if (response.success) {
        setQueue(response.data.queue || response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load queue on mount and subscribe to live updates via SSE
  useEffect(() => {
    fetchQueue();

    const SSE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse`;
    const source = new EventSource(SSE_URL);

    source.addEventListener('queue_updated', () => {
      fetchQueue();
    });

    // EventSource auto-reconnects on error — no manual handling needed
    return () => source.close();
  }, [fetchQueue]);

  // ============================================
  // QUEUE OPERATIONS (API)
  // ============================================

  // Add patient to queue
  const addToQueue = async (patient, priority = 'Normal', reason = '', assignedDoctorId = null) => {
    setLoading(true);
    try {
      const response = await queueService.add({
        uhid: patient.uhid,
        priority,
        reason: reason || 'Routine checkup',
        assignedDoctorId,
      });

      if (response.success) {
        // Refresh queue
        await fetchQueue();
        return {
          success: true,
          message: `${patient.name} added to queue`,
          queueItem: response.data
        };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update queue item status
  const updateQueueStatus = async (queueId, newStatus, assignedDoctorId = null) => {
    setLoading(true);
    try {
      const updateData = { status: newStatus };
      if (assignedDoctorId) {
        updateData.assignedDoctorId = assignedDoctorId;
      }

      const response = await queueService.update(queueId, updateData);

      if (response.success) {
        // Update local state
        setQueue(prev =>
          prev.map(item =>
            item.id === queueId
              ? { ...item, ...response.data.queue || response.data }
              : item
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

  // Start consultation - update status to "With Doctor"
  const startConsultation = async (queueId) => {
    return updateQueueStatus(queueId, 'With Doctor');
  };

  // Remove patient from queue
  const removeFromQueue = async (queueId) => {
    setLoading(true);
    try {
      const response = await queueService.remove(queueId);

      if (response.success) {
        setQueue(prev => prev.filter(item => item.id !== queueId));
        return { success: true, message: 'Patient removed from queue' };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Get next patient in queue (first with status 'Waiting')
  const getNextPatient = () => {
    return queue.find(item => item.status === 'Waiting');
  };

  // Get queue by status (local filter)
  const getQueueByStatus = (status) => {
    return queue.filter(item => item.status === status);
  };

  // Get patient position in queue
  const getPatientPosition = (uhid) => {
    const waitingQueue = queue.filter(q => q.status === 'Waiting');
    const position = waitingQueue.findIndex(item => item.uhid === uhid);
    return position !== -1 ? position + 1 : null;
  };

  // Get queue statistics (via API)
  const getQueueStats = async () => {
    try {
      const response = await queueService.getStats();
      if (response.success) {
        return response.data;
      }
      // Fallback to local calculation
      return {
        total: queue.length,
        waiting: queue.filter(q => q.status === 'Waiting').length,
        inTriage: queue.filter(q => q.status === 'In Triage').length,
        withDoctor: queue.filter(q => q.status === 'With Doctor').length,
        completed: queue.filter(q => q.status === 'Completed').length,
        urgent: queue.filter(q => q.priority === 'Urgent').length,
      };
    } catch (err) {
      console.error('Get queue stats error:', err.message);
      return null;
    }
  };

  // Local queue stats — memoized, only recomputes when queue changes
  const localQueueStats = useMemo(() => ({
    total: queue.length,
    waiting: queue.filter(q => q.status === 'Waiting').length,
    inTriage: queue.filter(q => q.status === 'In Triage').length,
    withDoctor: queue.filter(q => q.status === 'With Doctor').length,
    pendingBilling: queue.filter(q => q.status === 'Pending Billing').length,
    completed: queue.filter(q => q.status === 'Completed').length,
    urgent: queue.filter(q => q.priority === 'Urgent').length,
  }), [queue]);

  const getLocalQueueStats = () => localQueueStats;

  // Check if patient is actively in queue (excludes Completed/discharged)
  const isInQueue = (uhid) => {
    return queue.some(item => item.uhid === uhid && item.status !== 'Completed');
  };

  // Call next patient (via API)
  const callNextPatient = async () => {
    setLoading(true);
    try {
      const response = await queueService.callNext();

      if (response.success) {
        // Refresh queue
        await fetchQueue();
        return { success: true, patient: response.data };
      }
      return { success: false, message: response.message || 'No patients waiting' };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Assign doctor to queue item
  const assignDoctorToQueue = async (queueId, doctorId) => {
    return updateQueueStatus(queueId, null, doctorId);
  };

  // Doctor completes consultation — sends charges checklist and moves to Pending Billing
  const sendToBilling = async (queueId, selectedCharges, selectedProcedures) => {
    setLoading(true);
    try {
      const response = await queueService.update(queueId, {
        status: 'Pending Billing',
        selectedCharges,
        selectedProcedures,
      });
      if (response.success) {
        setQueue(prev =>
          prev.map(item =>
            item.id === queueId
              ? { ...item, ...response.data.queue || response.data }
              : item
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

  // Get queue by doctor (local filter)
  const getQueueByDoctor = (doctorId) => {
    return queue.filter(item => item.assignedDoctorId === doctorId);
  };

  const value = {
    // State
    queue,
    loading,
    error,

    // Functions
    fetchQueue,
    addToQueue,
    updateQueueStatus,
    startConsultation,
    removeFromQueue,
    getNextPatient,
    getQueueByStatus,
    getPatientPosition,
    getQueueStats,
    getLocalQueueStats,
    isInQueue,
    callNextPatient,
    assignDoctorToQueue,
    getQueueByDoctor,
    sendToBilling,
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
};
