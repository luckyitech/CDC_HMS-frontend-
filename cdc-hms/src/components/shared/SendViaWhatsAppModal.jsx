import { useState } from 'react';
import toast from 'react-hot-toast';
import { Send, ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import commsService from '../../services/commsService';

// Send a generated letterhead PDF (a prescription, lab request, treatment plan,
// glucose report, or a Diagnostics document) to a patient over WhatsApp. Finds
// or starts the patient's thread, then uploads the exact bytes. Free-form media
// only sends inside the 24-hour window; if it is closed the patient must message
// first (surfaced as a clear error).
const SendViaWhatsAppModal = ({ isOpen, onClose, patient, getPdf, defaultCaption = '', label = 'document', onSent }) => {
  const [caption, setCaption] = useState(defaultCaption);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!patient?.uhid) { toast.error('No patient on this document.'); return; }
    if (!confirmed) { toast.error('Confirm the number belongs to this patient first.'); return; }
    setSending(true);
    try {
      const started = await commsService.startForPatient(patient.uhid);
      const conv = started.data.conversation;
      if (!started.data.windowOpen && !conv.windowOpen) {
        toast.error('This patient\'s 24-hour window is closed — ask them to message the clinic first, then resend.');
        setSending(false);
        return;
      }
      const file = await getPdf(`${label}-${patient.uhid}.pdf`);
      const fd = new FormData();
      fd.append('file', file);
      if (caption) fd.append('caption', caption);
      await commsService.sendMedia(conv.id, fd);
      toast.success('Sent on WhatsApp.');
      onSent?.();
      onClose();
    } catch (e) {
      if (e?.data?.code === 'windowClosed') toast.error('The 24-hour window is closed — the patient must message first.');
      else toast.error(e.message || 'Could not send on WhatsApp.');
    } finally { setSending(false); }
  };

  const name = patient ? `${patient.firstName || patient.name || ''} ${patient.lastName || ''}`.trim() : '';
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send via WhatsApp">
      <div className="space-y-3 text-sm">
        <div className="rounded border bg-gray-50 p-2">
          <div className="font-medium text-gray-800">{name || 'Patient'}</div>
          <div className="text-xs text-gray-500">{patient?.uhid} · {patient?.phone || 'no number on file'}</div>
        </div>
        <div><label className="text-xs text-gray-500">Caption (optional)</label><input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full rounded border-gray-300" placeholder={`Your ${label} from the clinic`} /></div>
        <label className="flex items-start gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          <span><ShieldCheck size={13} className="mr-1 inline text-emerald-600" />I confirm this WhatsApp number belongs to the patient and they consent to receiving their {label} here.</span>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-gray-500">Cancel</button>
          <button type="button" disabled={sending || !confirmed} onClick={send} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-40"><Send size={15} /> {sending ? 'Sending…' : 'Send'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default SendViaWhatsAppModal;
