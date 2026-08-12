import { useState, useEffect, useRef } from 'react';
import { X, Search, User, Calendar, Clock, CheckCircle, XCircle, Lock, Unlock, CalendarPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import patientService from '../../services/patientService';
import appointmentService from '../../services/appointmentService';
import doctorBlockService from '../../services/doctorBlockService';
import { APPOINTMENT_TYPES } from '../../constants/appointmentSlots';
import QuickRegisterForm from './QuickRegisterForm';

// ── Single booked appointment card (with optional cancel) ─────────────────────
const AppointmentCard = ({ appt, onCancelled }) => {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await appointmentService.cancel(appt.appointmentId);
      toast.success('Appointment cancelled');
      onCancelled();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-blue-800">
        <User className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold text-sm">{appt.patientName}</span>
        <span className="text-xs text-blue-500">({appt.patientUhid})</span>
      </div>
      <p className="text-xs text-gray-600 capitalize">
        <span className="font-medium">Type:</span> {appt.appointmentType}
      </p>
      {appt.reason && (
        <p className="text-xs text-gray-600">
          <span className="font-medium">Reason:</span> {appt.reason}
        </p>
      )}
      <p className="text-xs text-gray-400">#{appt.appointmentNumber}</p>
      {appt.status === 'scheduled' && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium disabled:opacity-50 mt-1"
        >
          <XCircle className="w-3 h-3" />
          {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
        </button>
      )}
    </div>
  );
};

// ── Full slot view (2 patients) ───────────────────────────────────────────────
const FullSlotView = ({ slot, date, doctorName, onCancelled, onClose }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-800">
      <Users className="w-4 h-4 flex-shrink-0" />
      <span>{date} at <strong>{slot.time}</strong> — {doctorName} · Slot Full</span>
    </div>
    <div className="space-y-3">
      {slot.appointments.map((appt, i) => (
        <AppointmentCard
          key={appt.appointmentId}
          appt={appt}
          onCancelled={() => { onCancelled(); onClose(); }}
        />
      ))}
    </div>
  </div>
);

// ── Partial slot view (1 patient, 1 seat still open) ─────────────────────────
const PartialSlotView = ({ slot, date, doctorName, doctorId, onBooked, onClose, canBook }) => {
  const [bookingSecond, setBookingSecond] = useState(false);
  const appt = slot.appointments[0];

  if (bookingSecond) {
    return (
      <NewBookingForm
        slot={slot}
        doctorId={doctorId}
        doctorName={doctorName}
        date={date}
        onBooked={onBooked}
        onClose={onClose}
        onBack={() => setBookingSecond(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span>{date} at <strong>{slot.time}</strong> — {doctorName}</span>
      </div>
      <AppointmentCard
        appt={appt}
        onCancelled={() => { onBooked(); onClose(); }}
      />
      {canBook && (
        <button
          onClick={() => setBookingSecond(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          Book Second Patient
        </button>
      )}
    </div>
  );
};

// ── Blocked slot view (doctor only) ──────────────────────────────────────────
const BlockedSlotView = ({ slot, date, onUnblocked, onClose }) => {
  const [unblocking, setUnblocking] = useState(false);

  const handleUnblock = async () => {
    setUnblocking(true);
    try {
      await doctorBlockService.unblock(date, slot.time);
      toast.success(`Slot ${slot.time} is now available for booking`);
      onUnblocked();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to unblock slot');
    } finally {
      setUnblocking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-700">
          <Lock className="w-4 h-4" />
          <span className="font-semibold">Slot Blocked</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{date}</span>
          <Clock className="w-4 h-4 ml-2" />
          <span>{slot.time}</span>
        </div>
        <p className="text-sm text-gray-500">
          This time slot is currently blocked. No appointments can be booked during this time.
        </p>
      </div>

      <button
        onClick={handleUnblock}
        disabled={unblocking}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium disabled:opacity-50"
      >
        <Unlock className="w-4 h-4" />
        {unblocking ? 'Unblocking...' : 'Unblock This Slot'}
      </button>
    </div>
  );
};

// ── Free slot — doctor chooses: book or block ─────────────────────────────────
const FreeSlotChoiceView = ({ slot, date, doctorName, doctorId, onBooked, onBlocked, onClose }) => {
  const [view, setView] = useState(null); // null | 'book' | 'block'
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  if (view === 'book') {
    return (
      <NewBookingForm
        slot={slot}
        doctorId={doctorId}
        doctorName={doctorName}
        date={date}
        onBooked={onBooked}
        onClose={onClose}
        onBack={() => setView(null)}
      />
    );
  }

  const handleBlock = async () => {
    setBlocking(true);
    try {
      await doctorBlockService.block(date, slot.time, blockReason.trim() || undefined);
      toast.success(`Slot ${slot.time} has been blocked`);
      onBlocked();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to block slot');
    } finally {
      setBlocking(false);
    }
  };

  if (view === 'block') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView(null)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg text-sm text-red-800">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>Block <strong>{date}</strong> at <strong>{slot.time}</strong></span>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Reason <span className="font-normal text-gray-400">(optional · private)</span>
          </label>
          <textarea
            value={blockReason}
            onChange={e => setBlockReason(e.target.value)}
            rows={2}
            placeholder="e.g. Personal appointment — not visible to patients or staff"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Only visible to you and admins</p>
        </div>
        <button
          onClick={handleBlock}
          disabled={blocking}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <Lock className="w-4 h-4" />
          {blocking ? 'Blocking...' : 'Confirm Block'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg text-sm text-green-800">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span>{date} at <strong>{slot.time}</strong></span>
      </div>

      <p className="text-sm text-gray-500">What would you like to do with this slot?</p>

      <button
        onClick={() => setView('book')}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        <CalendarPlus className="w-4 h-4" />
        Book Appointment for Patient
      </button>

      <button
        onClick={() => setView('block')}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
      >
        <Lock className="w-4 h-4" />
        Block This Slot
      </button>
    </div>
  );
};

// ── New booking form ──────────────────────────────────────────────────────────
const NewBookingForm = ({ slot, doctorId, doctorName, date, onBooked, onClose, onBack }) => {
  const [search, setSearch]         = useState('');
  const [patients, setPatients]     = useState([]);
  const [searching, setSearching]   = useState(false);
  const [selected, setSelected]     = useState(null);
  const [type, setType]             = useState('follow-up');
  const [reason, setReason]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!search.trim()) { setPatients([]); setSearching(false); return; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patientService.getAll({ search, limit: 8 })
        .then(res => setPatients(res.data.patients || []))
        .catch(() => setPatients([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleBook = async () => {
    if (!selected) return toast.error('Please select a patient');
    if (!reason.trim()) return toast.error('Please enter a reason for the appointment');
    setSubmitting(true);
    try {
      await appointmentService.book({
        doctorId: parseInt(doctorId),
        date,
        timeSlot: slot.time,
        appointmentType: type,
        reason,
        uhid: selected.uhid,
      });
      toast.success('Appointment booked successfully');
      onBooked();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {onBack && (
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          ← Back
        </button>
      )}

      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg text-sm text-green-800">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span>{date} at <strong>{slot.time}</strong> — {doctorName}</span>
      </div>

      {/* Patient search */}
      {!selected ? (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Search Patient</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name or UHID..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
          {patients.length > 0 && (
            <ul className="mt-1 border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
              {patients.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => { setSelected(p); setSearch(''); setPatients([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-400 ml-2 text-xs">{p.uhid}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <QuickRegisterForm onRegistered={p => setSelected(p)} />
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{selected.name}</span>
            <span className="text-xs text-gray-400">{selected.uhid}</span>
          </div>
          <button onClick={() => setSelected(null)} className="text-xs text-red-500 hover:underline">Change</button>
        </div>
      )}

      {/* Appointment type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Appointment Type</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          {APPOINTMENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          placeholder="Reason for appointment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
        />
      </div>

      <button
        onClick={handleBook}
        disabled={submitting || !selected}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <CheckCircle className="w-4 h-4" />
        {submitting ? 'Booking...' : 'Confirm Booking'}
      </button>
    </div>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────
// canManageBlocks = true for doctor's My Schedule (can block/unblock)
// canManageBlocks = false for staff (free slots go straight to booking form)
const BookingModal = ({ slot, doctorId, doctorName, date, onBooked, onClose, canManageBlocks = false }) => {
  if (!slot) return null;

  const isBlocked  = slot.status === 'blocked';
  const isFree     = slot.status === 'free';
  const isFull     = slot.status === 'full';
  const isPartial  = !isFree && !isBlocked && !isFull; // 1 appointment, seat still open

  let title = 'Book Appointment';
  if (isBlocked) title = 'Blocked Slot';
  else if (isFull)    title = 'Appointment Details';
  else if (isPartial) title = 'Appointment Details';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          {isBlocked && (
            <BlockedSlotView
              slot={slot}
              date={date}
              onUnblocked={onBooked}
              onClose={onClose}
            />
          )}
          {isFull && (
            <FullSlotView
              slot={slot}
              date={date}
              doctorName={doctorName}
              onCancelled={onBooked}
              onClose={onClose}
            />
          )}
          {isPartial && (
            <PartialSlotView
              slot={slot}
              date={date}
              doctorName={doctorName}
              doctorId={doctorId}
              onBooked={onBooked}
              onClose={onClose}
              canBook={true}
            />
          )}
          {isFree && canManageBlocks && (
            <FreeSlotChoiceView
              slot={slot}
              date={date}
              doctorName={doctorName}
              doctorId={doctorId}
              onBooked={onBooked}
              onBlocked={onBooked}
              onClose={onClose}
            />
          )}
          {isFree && !canManageBlocks && (
            <NewBookingForm
              slot={slot}
              doctorId={doctorId}
              doctorName={doctorName}
              date={date}
              onBooked={onBooked}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
