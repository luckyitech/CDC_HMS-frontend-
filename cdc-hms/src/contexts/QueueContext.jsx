import { createContext, useContext, useState } from 'react';

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

  // Calculate estimated wait time based on queue position
  const calculateWait = (position) => {
    // Assume 15 minutes per patient
    const minutesPerPatient = 15;
    const waitMinutes = position * minutesPerPatient;
    return `${waitMinutes} min`;
  };

  // Add patient to queue
  const addToQueue = (patient, priority = 'Normal', reason = '') => {
    // Check if patient already in queue
    const existingIndex = queue.findIndex(item => item.uhid === patient.uhid);
    if (existingIndex !== -1) {
      return { 
        success: false, 
        message: 'Patient is already in the queue' 
      };
    }

    const now = new Date();
    const queueItem = {
      id: Date.now(),
      uhid: patient.uhid,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      arrivalTime: now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      priority: priority,
      status: 'Waiting',
      reason: reason || 'Routine checkup',
      estimatedWait: calculateWait(queue.filter(q => q.status === 'Waiting').length),
      assignedDoctorId: null,
      assignedDoctorName: null
    };

    // If urgent, add to front (after any other urgent cases)
    if (priority === 'Urgent') {
      const urgentCount = queue.filter(q => q.priority === 'Urgent').length;
      const newQueue = [...queue];
      newQueue.splice(urgentCount, 0, queueItem);
      setQueue(newQueue);
    } else {
      // Normal priority - add to end
      setQueue([...queue, queueItem]);
    }

    return { 
      success: true, 
      message: `${patient.name} added to queue`,
      queueItem 
    };
  };

  // Update queue item status
  const updateQueueStatus = (uhid, newStatus) => {
    setQueue(prevQueue => 
      prevQueue.map(item => 
        item.uhid === uhid 
          ? { ...item, status: newStatus }
          : item
      )
    );
  };

  // Remove patient from queue
  const removeFromQueue = (uhid) => {
    setQueue(prevQueue => prevQueue.filter(item => item.uhid !== uhid));
    return { success: true, message: 'Patient removed from queue' };
  };

  // Get next patient in queue (first with status 'Waiting')
  const getNextPatient = () => {
    return queue.find(item => item.status === 'Waiting');
  };

  // Get queue by status
  const getQueueByStatus = (status) => {
    return queue.filter(item => item.status === status);
  };

  // Get patient position in queue
  const getPatientPosition = (uhid) => {
    const waitingQueue = queue.filter(q => q.status === 'Waiting');
    const position = waitingQueue.findIndex(item => item.uhid === uhid);
    return position !== -1 ? position + 1 : null;
  };

  // Get queue statistics
  const getQueueStats = () => {
    return {
      total: queue.length,
      waiting: queue.filter(q => q.status === 'Waiting').length,
      inTriage: queue.filter(q => q.status === 'In Triage').length,
      withDoctor: queue.filter(q => q.status === 'With Doctor').length,
      completed: queue.filter(q => q.status === 'Completed').length,
      urgent: queue.filter(q => q.priority === 'Urgent').length,
    };
  };

  // Check if patient is in queue
  const isInQueue = (uhid) => {
    return queue.some(item => item.uhid === uhid);
  };

  // Call next patient (move from Waiting to In Triage)
  const callNextPatient = () => {
    const nextPatient = getNextPatient();
    if (nextPatient) {
      updateQueueStatus(nextPatient.uhid, 'In Triage');
      return { success: true, patient: nextPatient };
    }
    return { success: false, message: 'No patients waiting' };
  };

  // Assign doctor to queue item
  const assignDoctorToQueue = (uhid, doctorId, doctorName) => {
    setQueue(prevQueue => 
      prevQueue.map(item => 
        item.uhid === uhid 
          ? { ...item, assignedDoctorId: doctorId, assignedDoctorName: doctorName }
          : item
      )
    );
  };

  // Get queue by doctor
  const getQueueByDoctor = (doctorId) => {
    return queue.filter(item => item.assignedDoctorId === doctorId);
  };

  const value = {
    // State
    queue,
    
    // Functions
    addToQueue,
    updateQueueStatus,
    removeFromQueue,
    getNextPatient,
    getQueueByStatus,
    getPatientPosition,
    getQueueStats,
    isInQueue,
    callNextPatient,
    assignDoctorToQueue,
    getQueueByDoctor,
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
};