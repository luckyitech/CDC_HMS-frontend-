import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import useSlots from '../../hooks/useSlots';
import DoctorSelector from '../../components/appointments/DoctorSelector';
import SlotGrid from '../../components/appointments/SlotGrid';
import BookingModal from '../../components/appointments/BookingModal';

const toDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

const BookAppointment = () => {
  const { getDoctors } = useUserContext();
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate]         = useState(toDateString(new Date()));
  const [activeSlot, setActiveSlot] = useState(null);

  const selectedDoctor = getDoctors().find(d => String(d.id) === String(doctorId));
  const doctorName = selectedDoctor?.name || '';

  const { slots, loading, error, refreshSlots } = useSlots(doctorId, date);

  const shiftDate = (days) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(toDateString(d));
  };

  const freeCount   = slots.filter(s => s.status === 'free').length;
  const bookedCount = slots.filter(s => s.status !== 'free').length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-gray-800">Book Appointment</h1>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Doctor picker */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Doctor</label>
            <DoctorSelector value={doctorId} onChange={setDoctorId} />
          </div>

          {/* Date picker */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
            <div className="flex items-center gap-2">
              <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 text-gray-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
              <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 text-gray-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slot summary + grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {doctorId && date && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-sm font-semibold text-gray-700">{formatDisplayDate(date)}</p>
            {slots.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                  {freeCount} available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                  {bookedCount} booked
                </span>
              </div>
            )}
          </div>
        )}

        <SlotGrid
          slots={slots}
          loading={loading}
          error={error}
          onSlotClick={setActiveSlot}
        />

        {/* Legend */}
        {slots.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> Scheduled</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" /> Checked In</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block" /> Completed</span>
          </div>
        )}
      </div>

      {/* Modal */}
      <BookingModal
        slot={activeSlot}
        doctorId={doctorId}
        doctorName={doctorName}
        date={date}
        onBooked={refreshSlots}
        onClose={() => setActiveSlot(null)}
      />
    </div>
  );
};

export default BookAppointment;
