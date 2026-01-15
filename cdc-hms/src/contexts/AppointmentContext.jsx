import { createContext, useContext, useState } from 'react';

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
  const [appointments, setAppointments] = useState([
    // Mock appointments for demo
    {
      id: 1,
      patientUHID: 'CDC001',
      patientName: 'John Doe',
      doctorId: 1,
      doctorName: 'Dr. Ahmed Hassan',
      date: new Date().toISOString().split('T')[0], // Today
      timeSlot: '10:00 AM',
      appointmentType: 'follow-up',
      reason: 'Diabetes checkup',
      notes: '',
      status: 'scheduled', // scheduled, checked-in, completed, cancelled
      bookedAt: new Date().toISOString(),
    }
  ]);

  // Add new appointment
  const addAppointment = (appointmentData) => {
    const newAppointment = {
      id: appointments.length + 1,
      ...appointmentData,
      status: 'scheduled',
      bookedAt: new Date().toISOString(),
    };
    setAppointments([...appointments, newAppointment]);
    return { success: true, appointment: newAppointment };
  };

  // Get all appointments
  const getAllAppointments = () => appointments;

  // Get appointments for specific patient
  const getPatientAppointments = (uhid) => {
    return appointments.filter(apt => apt.patientUHID === uhid);
  };

  // Get appointments for specific date
  const getAppointmentsByDate = (date) => {
    return appointments.filter(apt => apt.date === date);
  };

  // Get today's appointment for a patient
  const getTodayAppointment = (uhid) => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.find(
      apt => apt.patientUHID === uhid && 
             apt.date === today && 
             apt.status !== 'cancelled'
    );
  };

  // Get appointments by doctor
  const getDoctorAppointments = (doctorId, date = null) => {
    let filtered = appointments.filter(apt => apt.doctorId === doctorId);
    if (date) {
      filtered = filtered.filter(apt => apt.date === date);
    }
    return filtered;
  };

  // Update appointment status
  const updateAppointmentStatus = (appointmentId, newStatus) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(apt =>
        apt.id === appointmentId
          ? { ...apt, status: newStatus }
          : apt
      )
    );
    return { success: true };
  };

  // Check-in appointment (mark as checked-in)
  const checkInAppointment = (uhid) => {
    const appointment = getTodayAppointment(uhid);
    if (appointment) {
      updateAppointmentStatus(appointment.id, 'checked-in');
      return { success: true, appointment };
    }
    return { success: false, message: 'No appointment found for today' };
  };

  // Cancel appointment
  const cancelAppointment = (appointmentId) => {
    updateAppointmentStatus(appointmentId, 'cancelled');
    return { success: true };
  };

  // Complete appointment
  const completeAppointment = (appointmentId) => {
    updateAppointmentStatus(appointmentId, 'completed');
    return { success: true };
  };

  // Get appointment statistics
  const getAppointmentStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = getAppointmentsByDate(today);

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

    // Functions
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
    getAppointmentStats,
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};