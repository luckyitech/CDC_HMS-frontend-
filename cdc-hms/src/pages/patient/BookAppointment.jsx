import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  UserSquare2, CalendarDays, Clock, FileText,
  RefreshCw, Stethoscope, ClipboardCheck, AlertTriangle,
  CheckCircle2, ChevronRight, ChevronLeft, Loader2,
} from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useAppointmentContext } from '../../contexts/AppointmentContext';
import api from '../../services/api';

const APPOINTMENT_TYPES = [
  {
    value: 'follow-up',
    label: 'Follow-up Visit',
    icon: RefreshCw,
    description: 'Regular checkup for an ongoing condition',
  },
  {
    value: 'consultation',
    label: 'New Consultation',
    icon: Stethoscope,
    description: 'First visit for a new health concern',
  },
  {
    value: 'check-up',
    label: 'Check-up / Lab Review',
    icon: ClipboardCheck,
    description: 'Routine check or review of lab results',
  },
  {
    value: 'emergency',
    label: 'Urgent / Emergency',
    icon: AlertTriangle,
    description: 'Urgent medical concern needing prompt attention',
  },
];

const BookAppointment = () => {
  const navigate = useNavigate();
  const { addAppointment, getAvailableSlots } = useAppointmentContext();

  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    doctor: '',
    date: '',
    timeSlot: '',
    appointmentType: '',
    reason: '',
    notes: '',
  });

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await api.get('/users/doctors');
        if (response.success) {
          setDoctors(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
        toast.error('Failed to load doctors. Please refresh.');
      } finally {
        setDoctorsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // Load available slots when doctor + date both set
  const loadSlots = useCallback(async (doctorId, date) => {
    if (!doctorId || !date) return;
    setSlotsLoading(true);
    setBookingData(prev => ({ ...prev, timeSlot: '' }));
    try {
      const slots = await getAvailableSlots(doctorId, date);
      setTimeSlots(slots);
    } catch (err) {
      console.error('Failed to load slots:', err);
      setTimeSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [getAvailableSlots]);

  const handleDoctorSelect = (doctorId) => {
    setBookingData(prev => ({ ...prev, doctor: doctorId.toString(), timeSlot: '' }));
    if (bookingData.date) loadSlots(doctorId, bookingData.date);
  };

  const handleDateChange = (date) => {
    setBookingData(prev => ({ ...prev, date, timeSlot: '' }));
    if (bookingData.doctor) loadSlots(parseInt(bookingData.doctor), date);
  };

  const handleNext = () => {
    if (step === 1 && !bookingData.doctor) {
      toast.error('Please select a doctor');
      return;
    }
    if (step === 2 && (!bookingData.date || !bookingData.timeSlot)) {
      toast.error('Please select a date and time slot');
      return;
    }
    if (step === 3) {
      if (!bookingData.appointmentType) {
        toast.error('Please select an appointment type');
        return;
      }
      if (!bookingData.reason.trim()) {
        toast.error('Please provide a reason for your visit');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await addAppointment({
        doctorId: parseInt(bookingData.doctor),
        date: bookingData.date,
        timeSlot: bookingData.timeSlot,
        appointmentType: bookingData.appointmentType,
        reason: bookingData.reason.trim(),
        notes: bookingData.notes.trim() || undefined,
      });

      if (result.success) {
        toast.success(
          `Appointment booked for ${new Date(bookingData.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
          })}!`,
          { duration: 5000, style: { background: '#10b981', color: '#fff' } }
        );
        navigate('/patient/dashboard');
      } else {
        toast.error(result.message || 'Failed to book appointment. Please try again.');
      }
    } catch {
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find(d => d.id === parseInt(bookingData.doctor));
  const selectedType = APPOINTMENT_TYPES.find(t => t.value === bookingData.appointmentType);

  const STEP_LABELS = ['Select Doctor', 'Date & Time', 'Type & Reason', 'Confirm'];

  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">Book Appointment</h2>

      {/* Progress Steps */}
      <div className="mb-8">
        {/* Mobile: compact step indicator */}
        <div className="sm:hidden flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-primary">Step {step} of 4</p>
          <p className="text-sm font-semibold text-gray-700">{STEP_LABELS[step - 1]}</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:hidden mb-6">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Desktop: full step indicator */}
        <div className="hidden sm:flex items-center justify-between max-w-3xl mx-auto">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition ${
                  step > s ? 'bg-green-500 text-white' : step === s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                <p className={`text-sm mt-2 font-semibold ${step >= s ? 'text-primary' : 'text-gray-400'}`}>
                  {STEP_LABELS[s - 1]}
                </p>
              </div>
              {s < 4 && (
                <div className={`h-1 flex-1 mx-2 rounded ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Doctor */}
      {step === 1 && (
        <Card title="Step 1: Select Your Doctor">
          {doctorsLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading doctors...</span>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserSquare2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No doctors available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => handleDoctorSelect(doctor.id)}
                  className={`p-4 sm:p-5 border-2 rounded-lg text-left transition hover:shadow-md ${
                    bookingData.doctor === doctor.id.toString()
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-primary'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {doctor.name.split(' ').filter(n => n !== 'Dr.').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800">{doctor.name}</p>
                      <p className="text-sm text-blue-600 font-medium mt-0.5">{doctor.specialty}</p>
                      <p className="text-xs text-gray-500 mt-1">Mon – Fri · 8AM – 5PM</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button onClick={handleNext} disabled={doctorsLoading} className="w-full sm:w-auto">
              Next: Date & Time <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <Card title="Step 2: Select Date & Time">
          {selectedDoctor && (
            <div className="mb-5 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {selectedDoctor.name.split(' ').filter(n => n !== 'Dr.').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{selectedDoctor.name}</p>
                <p className="text-xs text-blue-600">{selectedDoctor.specialty}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Date Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <CalendarDays className="w-4 h-4" />
                Select Date
              </label>
              <input
                type="date"
                value={bookingData.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary text-base"
              />
              {bookingData.date && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-sm text-gray-700">
                    <strong>Selected:</strong>{' '}
                    {new Date(bookingData.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Clock className="w-4 h-4" />
                Available Time Slots
              </label>

              {!bookingData.date ? (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
                  Select a date to see available slots
                </div>
              ) : slotsLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading slots...</span>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
                  No slots available on this date. Please try another date.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setBookingData(prev => ({ ...prev, timeSlot: slot }))}
                      className={`px-3 py-2.5 rounded-lg font-semibold transition text-sm border-2 ${
                        bookingData.timeSlot === slot
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-blue-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-6">
            <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={handleNext} className="w-full sm:w-auto">
              Next: Type & Reason <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Appointment Type & Reason */}
      {step === 3 && (
        <Card title="Step 3: Appointment Type & Reason">
          <div className="space-y-6">
            {/* Appointment Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Appointment Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {APPOINTMENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setBookingData(prev => ({ ...prev, appointmentType: type.value }))}
                      className={`p-4 border-2 rounded-lg text-left transition hover:shadow-md ${
                        bookingData.appointmentType === type.value
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 hover:border-primary'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                          bookingData.appointmentType === type.value ? 'text-primary' : 'text-gray-400'
                        }`} />
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{type.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason for Visit — required */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FileText className="w-4 h-4" />
                Reason for Visit *
              </label>
              <textarea
                value={bookingData.reason}
                onChange={(e) => setBookingData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Briefly describe the reason for this appointment"
                rows="3"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Additional Notes — optional */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Notes <span className="font-normal text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requirements or information for your doctor"
                rows="2"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-6">
            <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={handleNext} className="w-full sm:w-auto">
              Review & Confirm <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Review & Confirm */}
      {step === 4 && (
        <Card title="Step 4: Review & Confirm">
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 space-y-4">
              <h3 className="text-lg font-bold text-gray-800 border-b border-blue-200 pb-3">
                Appointment Summary
              </h3>

              <div className="flex items-start gap-3">
                <UserSquare2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Doctor</p>
                  <p className="font-bold text-gray-800">{selectedDoctor?.name}</p>
                  <p className="text-sm text-blue-600">{selectedDoctor?.specialty}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarDays className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Date & Time</p>
                  <p className="font-bold text-gray-800">
                    {new Date(bookingData.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                  <p className="font-semibold text-gray-700">{bookingData.timeSlot}</p>
                </div>
              </div>

              {selectedType && (
                <div className="flex items-start gap-3">
                  {(() => { const Icon = selectedType.icon; return <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />; })()}
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-bold text-gray-800">{selectedType.label}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="text-gray-800">{bookingData.reason}</p>
                </div>
              </div>

              {bookingData.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Additional Notes</p>
                    <p className="text-gray-700">{bookingData.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reminder */}
            <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
              <p className="text-sm text-gray-700">
                <strong>Reminder:</strong> Please arrive 15 minutes before your scheduled time.
                Bring any relevant medical records or test results to your appointment.
              </p>
            </div>

            {/* Cancellation Policy */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                <strong>Cancellation Policy:</strong> Appointments can be cancelled or rescheduled
                up to 24 hours in advance through your appointments page.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-6">
            <Button variant="outline" onClick={handleBack} disabled={submitting} className="w-full sm:w-auto">
              <ChevronLeft className="w-4 h-4" /> Back to Edit
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Appointment
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BookAppointment;
