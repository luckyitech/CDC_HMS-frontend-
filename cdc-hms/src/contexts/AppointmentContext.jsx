import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import appointmentService from '../services/appointmentService';

// Create Context
const AppointmentContext = createContext();

// Custom Hook to use AppointmentContext
export const useAppointmentContext = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointmentContext must be used within AppointmentProvider');
  }
  return context;
};

// Provider Component
export const AppointmentProvider = ({ children }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH APPOINTMENTS FROM API
  // ============================================

  // Load all appointments from API
  const fetchAppointments = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await appointmentService.getAll(params);
      if (response.success) {
        setAppointments(response.data.appointments || response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load appointments on mount
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ============================================
  // APPOINTMENT OPERATIONS (API)
  // ============================================

  // Add new appointment (via API)
  const addAppointment = async (appointmentData) => {
    setLoading(true);
    try {
      const response = await appointmentService.book(appointmentData);
      if (response.success) {
        await fetchAppointments();
        return { success: true, appointment: response.data.appointment || response.data };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Get all appointments (from state)
  const getAllAppointments = () => appointments;

  // Get appointments for specific patient (via API)
  const getPatientAppointments = async (uhid) => {
    try {
      const response = await appointmentService.getByPatient(uhid);
      if (response.success) {
        return response.data.appointments || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get patient appointments error:', err.message);
      return [];
    }
  };

  // Get appointments for specific date (via API)
  const getAppointmentsByDate = async (date) => {
    try {
      const response = await appointmentService.getByDate(date);
      if (response.success) {
        return response.data.appointments || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get appointments by date error:', err.message);
      return [];
    }
  };

  // Get today's appointment for a patient (local filter)
  // Uses local date (not UTC) so timezone offset does not cause a mismatch
  const getTodayAppointment = (uhid) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return appointments.find(
      apt => apt.uhid === uhid &&
             apt.date === today &&
             apt.status !== 'cancelled'
    );
  };

  // Get appointments by doctor (via API)
  const getDoctorAppointments = async (doctorId, date = null) => {
    try {
      const params = date ? { date } : {};
      const response = await appointmentService.getByDoctor(doctorId, params);
      if (response.success) {
        return response.data.appointments || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get doctor appointments error:', err.message);
      return [];
    }
  };

  // Update appointment status (via API)
  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    setLoading(true);
    try {
      const response = await appointmentService.updateStatus(appointmentId, { status: newStatus });
      if (response.success) {
        // Update local state
        setAppointments(prev =>
          prev.map(apt =>
            apt.id === appointmentId
              ? { ...apt, status: newStatus }
              : apt
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

  // Check-in appointment (via API)
  const checkInAppointment = async (uhid) => {
    const appointment = getTodayAppointment(uhid);
    if (appointment) {
      try {
        const response = await appointmentService.checkIn(appointment.id);
        if (response.success) {
          // Update local state
          setAppointments(prev =>
            prev.map(apt =>
              apt.id === appointment.id
                ? { ...apt, status: 'checked-in' }
                : apt
            )
          );
          return { success: true, appointment };
        }
        return { success: false, message: response.message };
      } catch (err) {
        return { success: false, message: err.message };
      }
    }
    return { success: false, message: 'No appointment found for today' };
  };

  // Cancel appointment (via API)
  const cancelAppointment = async (appointmentId) => {
    setLoading(true);
    try {
      const response = await appointmentService.cancel(appointmentId);
      if (response.success) {
        // Update local state
        setAppointments(prev =>
          prev.map(apt =>
            apt.id === appointmentId
              ? { ...apt, status: 'cancelled' }
              : apt
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

  // Complete appointment (via API)
  const completeAppointment = async (appointmentId) => {
    setLoading(true);
    try {
      const response = await appointmentService.complete(appointmentId);
      if (response.success) {
        // Update local state
        setAppointments(prev =>
          prev.map(apt =>
            apt.id === appointmentId
              ? { ...apt, status: 'completed' }
              : apt
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

  // Get available time slots (client-side calculation)
  // Generates standard slots and excludes already booked ones
  const getAvailableSlots = async (doctorId, date) => {
    try {
      // Standard clinic time slots
      const allSlots = [
        '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
        '11:00 AM', '11:30 AM', '12:00 PM', '2:00 PM', '2:30 PM', '3:00 PM',
        '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
      ];

      // Fetch existing appointments for this doctor on this date
      const response = await appointmentService.getByDoctor(doctorId, { date });
      if (response.success) {
        const booked = (response.data.appointments || response.data)
          .filter(a => a.status !== 'cancelled')
          .map(a => a.timeSlot);

        // Return slots that are not booked
        return allSlots.filter(slot => !booked.includes(slot));
      }
      return allSlots;
    } catch (err) {
      console.error('Get available slots error:', err.message);
      // Return all slots if there's an error
      return [
        '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
        '11:00 AM', '11:30 AM', '12:00 PM', '2:00 PM', '2:30 PM', '3:00 PM',
        '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
      ];
    }
  };

  // Get appointment statistics (via API)
  const getAppointmentStats = async () => {
    try {
      const response = await appointmentService.getStats();
      if (response.success) {
        return response.data;
      }
      // Fallback to local calculation
      return getLocalAppointmentStats();
    } catch (err) {
      console.error('Get appointment stats error:', err.message);
      return getLocalAppointmentStats();
    }
  };

  // Local stats calculation (synchronous fallback)
  const getLocalAppointmentStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date === today);

    return {
      total: appointments.length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      checkedIn: appointments.filter(a => a.status === 'checked-in').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      today: todayAppointments.length,
      todayScheduled: todayAppointments.filter(a => a.status === 'scheduled').length,
      todayCheckedIn: todayAppointments.filter(a => a.status === 'checked-in').length,
    };
  };

  const value = {
    // State
    appointments,
    loading,
    error,

    // Functions
    fetchAppointments,
    addAppointment,
    getAllAppointments,
    getPatientAppointments,
    getAppointmentsByDate,
    getTodayAppointment,
    getDoctorAppointments,
    updateAppointmentStatus,
    checkInAppointment,
    cancelAppointment,
    completeAppointment,
    getAvailableSlots,
    getAppointmentStats,
    getLocalAppointmentStats,
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};
