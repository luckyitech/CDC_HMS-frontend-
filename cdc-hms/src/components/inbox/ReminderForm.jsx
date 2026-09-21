import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { useUserContext } from '../../contexts/UserContext';
import commsService from '../../services/commsService';

// Set a follow-up reminder on a thread, for yourself or a colleague. There is no
// background scheduler — a reminder is "due" once its time passes and it shows in
// the Reminders tab and the badge.
const ReminderForm = ({ isOpen, onClose, conversation, onDone }) => {
  const { getDoctors, currentUser } = useUserContext();
  const colleagues = getDoctors ? getDoctors() : [];
  const [remindAt, setRemindAt] = useState('');
  const [note, setNote] = useState('');
  const [forUserId, setForUserId] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!remindAt) { toast.error('Pick a time.'); return; }
    setSaving(true);
    try {
      await commsService.createReminder(conversation.id, { remindAt: new Date(remindAt).toISOString(), note, forUserId: forUserId || undefined });
      toast.success('Reminder set.');
      onDone?.();
      onClose();
    } catch (e) { toast.error(e.message || 'Could not set the reminder.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set a reminder">
      <div className="space-y-3 text-sm">
        <div><label className="text-xs text-gray-500">Remind at</label><input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} className="w-full rounded border-gray-300" /></div>
        <div><label className="text-xs text-gray-500">Note</label><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded border-gray-300" placeholder="e.g. check results are back" /></div>
        <div>
          <label className="text-xs text-gray-500">For</label>
          <select value={forUserId} onChange={(e) => setForUserId(e.target.value)} className="w-full rounded border-gray-300">
            <option value="">Me{currentUser?.firstName ? ` (${currentUser.firstName})` : ''}</option>
            {colleagues.map((d) => <option key={d.id} value={d.id}>{d.firstName ? `Dr. ${d.firstName} ${d.lastName}` : d.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-gray-500">Cancel</button>
          <button type="button" disabled={saving} onClick={submit} className="rounded bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-40">{saving ? 'Saving…' : 'Set reminder'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default ReminderForm;
