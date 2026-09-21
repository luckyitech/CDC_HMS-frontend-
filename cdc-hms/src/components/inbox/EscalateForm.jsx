import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { useUserContext } from '../../contexts/UserContext';
import commsService from '../../services/commsService';

// Escalate a thread to a doctor. The escalation is an INTERNAL note — nothing is
// sent to the patient.
const EscalateForm = ({ isOpen, onClose, conversation, onDone }) => {
  const { getDoctors } = useUserContext();
  const doctors = getDoctors ? getDoctors() : [];
  const [toUserId, setToUserId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!note.trim()) { toast.error('Add a note for the doctor.'); return; }
    setSaving(true);
    try {
      await commsService.escalate(conversation.id, { toUserId: toUserId || undefined, note: note.trim() });
      toast.success('Escalated.');
      onDone?.();
      onClose();
    } catch (e) { toast.error(e.message || 'Could not escalate.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Escalate to a doctor">
      <div className="space-y-3 text-sm">
        <div>
          <label className="text-xs text-gray-500">To (optional)</label>
          <select value={toUserId} onChange={(e) => setToUserId(e.target.value)} className="w-full rounded border-gray-300">
            <option value="">Any doctor</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.firstName ? `Dr. ${d.firstName} ${d.lastName}` : d.name}</option>)}
          </select>
        </div>
        <div><label className="text-xs text-gray-500">Internal note (not sent to the patient)</label><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded border-gray-300" /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-gray-500">Cancel</button>
          <button type="button" disabled={saving} onClick={submit} className="rounded bg-amber-500 px-3 py-1.5 text-white disabled:opacity-40">{saving ? 'Escalating…' : 'Escalate'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default EscalateForm;
