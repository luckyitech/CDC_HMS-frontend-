import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Lock } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import useSlots from '../../hooks/useSlots';
import SlotGrid from '../../components/appointments/SlotGrid';
import BookingModal from '../../components/appointments/BookingModal';
import BlockAvailabilityModal from '../../components/appointments/BlockAvailabilityModal';

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

const MySchedule = () => {
  const { currentUser } = useUserContext();
  const [date, setDate]                   = useState(toDateString(new Date()));
  const [activeSlot, setActiveSlot]       = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const doctorId   = currentUser?.id;
  const doctorName = currentUser?.name ? `Dr. ${currentUser.name}` : '';

  const { slots, dayBlocked, loading, error, refreshSlots } = useSlots(doctorId, date);

  const shiftDate = (days) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(toDateString(d));
  };

  const freeCount    = slots.filter(s => s.status === 'free').length;
  const bookedCount  = slots.filter(s => s.status !== 'free' && s.status !== 'blocked').length;
  const blockedCount = slots.filter(s => s.status === 'blocked').length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">My Schedule</h1>
            <p className="text-sm text-gray-400">{doctorName}</p>
          </div>
        </div>

        <button
          onClick={() => setShowBlockModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          <Lock className="w-4 h-4" />
          Block Availability
        </button>
      </div>

      {/* Date navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
        <div className="flex items-center gap-2 max-w-xs">
          <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
          />
          <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slot grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
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
              {blockedCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                  {blockedCount} blocked
                </span>
              )}
            </div>
          )}
        </div>

        {dayBlocked && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <Lock className="w-4 h-4 flex-shrink-0" />
            Full day is blocked — no appointments can be booked for this date.
          </div>
        )}

        <SlotGrid
          slots={slots}
          loading={loading}
          error={error}
          onSlotClick={setActiveSlot}
          canManageBlocks={true}
        />

        {slots.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> Scheduled</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" /> Checked In</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block" /> Completed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> Blocked</span>
          </div>
        )}
      </div>

      {/* Slot-level booking / block modal */}
      <BookingModal
        slot={activeSlot}
        doctorId={doctorId}
        doctorName={doctorName}
        date={date}
        onBooked={refreshSlots}
        onClose={() => setActiveSlot(null)}
        canManageBlocks={true}
      />

      {/* Block availability modal */}
      {showBlockModal && (
        <BlockAvailabilityModal
          onClose={() => setShowBlockModal(false)}
          onDone={refreshSlots}
        />
      )}
    </div>
  );
};

export default MySchedule;
