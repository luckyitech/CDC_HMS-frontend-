import { Loader2, Lock, Users } from 'lucide-react';
import { SLOT_STATUS_STYLES } from '../../constants/appointmentSlots';

const STATUS_LABELS = {
  free:         'Available',
  scheduled:    'Scheduled',
  'checked-in': 'Checked In',
  completed:    'Completed',
  blocked:      'Blocked',
  full:         'Full (2/2)',
};

// canManageBlocks = true on doctor's MySchedule — allows clicking blocked slots to unblock
const SlotGrid = ({ slots, loading, error, onSlotClick, canManageBlocks = false }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading slots...
      </div>
    );
  }

  if (error) {
    return <p className="text-center py-10 text-red-500">{error}</p>;
  }

  if (!slots.length) {
    return <p className="text-center py-10 text-gray-400">Select a doctor and date to view slots.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {slots.map(slot => {
        const style      = SLOT_STATUS_STYLES[slot.status] || SLOT_STATUS_STYLES.free;
        const isBlocked   = slot.status === 'blocked';
        const isCompleted = slot.status === 'completed';
        const isFull      = slot.status === 'full';
        const appointments = slot.appointments || [];

        // Blocked slots are clickable only for the doctor (to unblock);
        // full slots are always clickable (to view / cancel patients)
        const isClickable = !isCompleted && (!isBlocked || canManageBlocks);

        return (
          <button
            key={slot.time}
            disabled={!isClickable}
            onClick={() => isClickable && onSlotClick(slot)}
            className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors ${style} ${!isClickable ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-sm">{slot.time}</span>
              {isBlocked && <Lock className="w-3 h-3 opacity-60 flex-shrink-0" />}
              {isFull    && <Users className="w-3 h-3 opacity-60 flex-shrink-0" />}
            </div>
            <span className="text-xs mt-0.5 opacity-75">{STATUS_LABELS[slot.status]}</span>
            {appointments.map((appt, i) => (
              <span key={i} className="text-xs mt-1 font-medium truncate w-full">
                {appt.patientName}
              </span>
            ))}
            {appointments[0]?.appointmentType && (
              <span className="text-xs opacity-60 capitalize">{appointments[0].appointmentType}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SlotGrid;
