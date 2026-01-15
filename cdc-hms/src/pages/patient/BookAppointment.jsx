import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { UserSquare2, Calendar as CalendarIcon, Clock, FileText, CheckCircle2 } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useAppointmentContext } from '../../contexts/AppointmentContext';
import { useUserContext } from '../../contexts/UserContext';

const BookAppointment = () => {
  const { addAppointment } = useAppointmentContext();
  const { getDoctors } = useUserContext();
  
  // TODO: Get from logged-in patient - For demo: CDC001 (John Doe)
  const currentPatientUHID = "CDC001";
  const currentPatientName = "John Doe";
  
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    doctor: '',
    date: '',
    timeSlot: '',
    appointmentType: '',
    reason: '',
    notes: '',
  });

  // Get doctors from UserContext
  const allDoctors = getDoctors();
  const doctors = allDoctors.map(doctor => ({
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty || 'General Physician',
    availability: 'Mon-Fri: 9AM-5PM',
    photo: null
  }));

  const appointmentTypes = [
    { value: 'follow-up', label: 'Follow-up Visit', icon: '🔄', description: 'Regular checkup with your doctor' },
    { value: 'new-issue', label: 'New Health Issue', icon: '⚠️', description: 'Discuss a new concern or symptom' },
    { value: 'lab-review', label: 'Lab Results Review', icon: '🔬', description: 'Review recent laboratory results' },
    { value: 'medication', label: 'Medication Review', icon: '💊', description: 'Discuss current medications' },
  ];

  // Generate available time slots
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 16; hour++) {
      slots.push(`${hour}:00 AM`);
      if (hour < 16) slots.push(`${hour}:30 AM`);
    }
    return slots.map(slot => {
      const isPM = parseInt(slot) >= 12;
      const formattedSlot = isPM ? slot.replace('AM', 'PM') : slot;
      return formattedSlot;
    });
  };

  const timeSlots = getTimeSlots();

  const handleNext = () => {
    if (step === 1 && !bookingData.doctor) {
      alert('Please select a doctor');
      return;
    }
    if (step === 2 && (!bookingData.date || !bookingData.timeSlot)) {
      alert('Please select date and time');
      return;
    }
    if (step === 3 && !bookingData.appointmentType) {
      alert('Please select appointment type');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    const appointmentData = {
      patientUHID: currentPatientUHID,
      patientName: currentPatientName,
      doctorId: parseInt(bookingData.doctor),
      doctorName: selectedDoctor.name,
      date: bookingData.date,
      timeSlot: bookingData.timeSlot,
      appointmentType: bookingData.appointmentType,
      reason: bookingData.reason,
      notes: bookingData.notes,
    };

    const result = addAppointment(appointmentData);

    if (result.success) {
      toast.success(
        `Appointment booked for ${new Date(bookingData.date).toLocaleDateString()}!`,
        {
          duration: 4000,
          style: { background: '#10b981', color: '#fff' }
        }
      );

      toast('You will receive confirmation SMS and email', {
        duration: 3000,
        icon: '📧',
      });

      setBookingData({
        doctor: '',
        date: '',
        timeSlot: '',
        appointmentType: '',
        reason: '',
        notes: '',
      });
      setStep(1);
    }
  };

  const selectedDoctor = doctors.find(d => d.id === parseInt(bookingData.doctor));
  const selectedType = appointmentTypes.find(t => t.value === bookingData.appointmentType);

  return (
    <div>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#374151',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderRadius: '0.5rem',
            padding: '16px',
          },
        }}
      />
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">Book Appointment</h2>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold transition ${
                  step >= s 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {s}
                </div>
                <p className={`text-xs sm:text-sm mt-2 font-semibold hidden sm:block ${
                  step >= s ? 'text-primary' : 'text-gray-500'
                }`}>
                  {s === 1 && 'Select Doctor'}
                  {s === 2 && 'Date & Time'}
                  {s === 3 && 'Type & Reason'}
                  {s === 4 && 'Confirm'}
                </p>
              </div>
              {s < 4 && (
                <div className={`h-1 flex-1 mx-2 ${
                  step > s ? 'bg-primary' : 'bg-gray-300'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Doctor */}
      {step === 1 && (
        <Card title="Step 1: Select Your Doctor">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => setBookingData({ ...bookingData, doctor: doctor.id.toString() })}
                className={`p-4 sm:p-6 border-2 rounded-lg text-left transition hover:shadow-lg ${
                  bookingData.doctor === doctor.id.toString()
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-200 hover:border-primary'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {doctor.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-lg">{doctor.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{doctor.specialty}</p>
                    <p className="text-xs text-gray-500 mt-2">📅 {doctor.availability}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleNext}>
              Next: Select Date & Time →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Select Date & Time */}
      {step === 2 && (
        <Card title="Step 2: Select Date & Time">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Date
              </label>
              <input
                type="date"
                value={bookingData.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary text-lg"
              />
              
              {bookingData.date && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-gray-700">
                    <strong>Selected:</strong> {new Date(bookingData.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Time Slot
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto p-2 border-2 border-gray-200 rounded-lg">
                {timeSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setBookingData({ ...bookingData, timeSlot: slot })}
                    className={`px-4 py-3 rounded-lg font-semibold transition text-sm ${
                      bookingData.timeSlot === slot
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedDoctor && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Booking with:</strong> {selectedDoctor.name} ({selectedDoctor.specialty})
              </p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleBack}>
              ← Back
            </Button>
            <Button onClick={handleNext}>
              Next: Select Type →
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
                Select Appointment Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {appointmentTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setBookingData({ ...bookingData, appointmentType: type.value })}
                    className={`p-4 border-2 rounded-lg text-left transition hover:shadow-md ${
                      bookingData.appointmentType === type.value
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{type.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{type.label}</p>
                        <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason for Visit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Visit (Optional)
              </label>
              <textarea
                value={bookingData.reason}
                onChange={(e) => setBookingData({ ...bookingData, reason: e.target.value })}
                placeholder="Briefly describe your reason for this appointment"
                rows="3"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                placeholder="Any special requirements or information for your doctor"
                rows="3"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleBack}>
              ← Back
            </Button>
            <Button onClick={handleNext}>
              Next: Review & Confirm →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Review & Confirm */}
      {step === 4 && (
        <Card title="Step 4: Review & Confirm Your Appointment">
          <div className="space-y-6">
            {/* Appointment Summary */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Appointment Summary</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👨‍⚕️</span>
                  <div>
                    <p className="text-sm text-gray-600">Doctor</p>
                    <p className="font-bold text-gray-800">{selectedDoctor?.name}</p>
                    <p className="text-sm text-gray-600">{selectedDoctor?.specialty}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-bold text-gray-800">
                      {new Date(bookingData.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="font-bold text-gray-800">{bookingData.timeSlot}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">{selectedType?.icon}</span>
                  <div>
                    <p className="text-sm text-gray-600">Appointment Type</p>
                    <p className="font-bold text-gray-800">{selectedType?.label}</p>
                  </div>
                </div>

                {bookingData.reason && (
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="text-sm text-gray-600">Reason</p>
                      <p className="text-gray-800">{bookingData.reason}</p>
                    </div>
                  </div>
                )}

                {bookingData.notes && (
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <p className="text-sm text-gray-600">Additional Notes</p>
                      <p className="text-gray-800">{bookingData.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Important Information */}
            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm text-gray-700">
                <strong>⚠️ Important:</strong> Please arrive 15 minutes before your scheduled time. 
                You will receive a confirmation SMS and email shortly after booking.
              </p>
            </div>

            {/* Cancellation Policy */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Cancellation Policy:</strong> You can cancel or reschedule your appointment 
                up to 24 hours before the scheduled time through your profile or by calling our office.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
            <Button variant="outline" onClick={handleBack}>
              ← Back to Edit
            </Button>
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              ✓ Confirm Appointment
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BookAppointment;