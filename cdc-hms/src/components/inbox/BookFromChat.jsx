import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { useUserContext } from '../../contexts/UserContext';
import appointmentService from '../../services/appointmentService';
import commsService from '../../services/commsService';

// Book an appointment from a chat, reusing the clinic's booking rules on the
// server. An auto-confirmation is offered (free-form if the window is open,
// otherwise the approved template).
const BookFromChat = ({ isOpen, onClose, conversation, onBooked }) => {
  const { getDoctors } = useUserContext();
  const doctors = getDoctors ? getDoctors() : [];
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [timeSlot, setTimeSlot] = useState('');
  const [reason, setReason] = useState('');
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctorId || !date) { setSlots([]); return; }
    appointmentService.getSlots(doctorId, date)
      .then((r) => setSlots((r.data?.slots || r.data || []).filter((s) => (s.status || 'available') === 'available')))
      .catch(() => setSlots([]));
  }, [doctorId, date]);

  const submit = async () => {
    if (!doctorId || !date || !timeSlot) { toast.error('Pick a doctor, date and time.'); return; }
    setSaving(true);
    try {
      const r = await commsService.book(conversation.id, { doctorId, date, timeSlot, appointmentType: 'Follow-up', reason, sendConfirmation });
      toast.success(`Booked${r.data?.confirmationSent ? ' — confirmation sent' : ''}.`);
      onBooked?.(r.data);
      onClose();
    } catch (e) { toast.error(e.message || 'Could not book.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book appointment from chat">
      <div className="space-y-3 text-sm">
        <div>
          <label className="text-xs text-gray-500">Doctor</label>
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-full rounded border-gray-300">
            <option value="">Select…</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.firstName ? `Dr. ${d.firstName} ${d.lastName}` : d.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-gray-500">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border-gray-300" /></div>
          <div>
            <label className="text-xs text-gray-500">Time</label>
            <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full rounded border-gray-300" disabled={!slots.length}>
              <option value="">{slots.length ? 'Select…' : 'Pick doctor + date'}</option>
              {slots.map((s) => <option key={s.time} value={s.time}>{s.time}</option>)}
            </select>
          </div>
        </div>
        <div><label className="text-xs text-gray-500">Reason</label><input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded border-gray-300" /></div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={sendConfirmation} onChange={(e) => setSendConfirmation(e.target.checked)} /> Send the patient a confirmation on WhatsApp</label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-gray-500">Cancel</button>
          <button type="button" disabled={saving} onClick={submit} className="rounded bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-40">{saving ? 'Booking…' : 'Book'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default BookFromChat;
