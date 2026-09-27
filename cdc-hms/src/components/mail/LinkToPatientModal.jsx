import { useState, useEffect } from 'react';
import { Loader2, Link2 } from 'lucide-react';
import Modal from '../shared/Modal';
import PatientSearchInput from '../shared/PatientSearchInput';
import mailService from '../../services/mailService';
import { notify } from '../../utils/notify';
import SaveEmailAttachmentDialog from '../shared/SaveEmailAttachmentDialog';

const searchPatients = async (q) => (await mailService.patients(q)).data.patients || [];

/**
 * "Link to patient" (Staff Email phase 5). Puts this message — or its whole
 * conversation (this folder, Inbox and Sent) — on the patient's Communications
 * trail: the text, from/to and time are kept on the patient file, where people
 * with "Patient email threads" can read them. For emails ABOUT a patient that
 * weren't sent to them (an insurer pre-authorisation, a referral). Replies that
 * arrive later in the same conversation are added automatically.
 *
 * Props: isOpen, onClose, message ({ uid, subject }), folder.
 */
const LinkToPatientModal = ({ isOpen, onClose, message, folder }) => {
  const [patient, setPatient] = useState(null);
  const [scope, setScope] = useState('thread');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  // Phase 5b: after linking, the attachments not yet in the patient's
  // Documents — the prompt to save them there.
  const [toSave, setToSave] = useState(null);   // { uhid, name, items }

  useEffect(() => { if (isOpen) { setPatient(null); setScope('thread'); setProblem(null); setToSave(null); } }, [isOpen]);

  const link = async () => {
    setBusy(true); setProblem(null);
    try {
      const r = (await mailService.linkToPatient(message.uid, folder, patient.uhid, scope)).data;
      const bits = [
        r.added ? `${r.added} message${r.added === 1 ? '' : 's'} added` : null,
        r.already ? `${r.already} already there` : null,
        r.removedBefore ? `${r.removedBefore} previously removed by an administrator (not re-added)` : null,
      ].filter(Boolean).join(' · ');
      notify('success', `${r.patient.name}’s communications: ${bits || 'nothing new'}`, { duration: 7000 });
      const pending = (r.pendingAttachments || []).map((a) => ({ messageRowId: a.messageRowId, index: a.index, name: a.name }));
      if (pending.length) setToSave({ uhid: r.patient.uhid, name: r.patient.name, items: pending });
      else onClose();
    } catch (err) {
      setProblem(err?.message || 'Could not link this email.');
    } finally {
      setBusy(false);
    }
  };

  if (toSave) {
    return (
      <SaveEmailAttachmentDialog uhid={toSave.uhid} patientName={toSave.name} items={toSave.items} onClose={onClose} />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Link to patient" size="md">
      <div className="space-y-3 text-sm">
        <p className="text-gray-600">
          Adds “{message?.subject || '(no subject)'}” to the patient’s Communications tab. The text is kept on the patient file;
          later replies in this conversation are added automatically.
        </p>
        <PatientSearchInput
          autoFocus
          searchFn={searchPatients}
          placeholder="Name, UHID or phone number"
          selectedPatient={patient}
          onSelect={(p) => { setPatient(p); setProblem(null); }}
          onClear={() => setPatient(null)}
        />
        <fieldset className="space-y-1">
          <legend className="sr-only">What to link</legend>
          <label className="flex items-center gap-2"><input type="radio" name="link-scope" checked={scope === 'thread'} onChange={() => setScope('thread')} /> The whole conversation</label>
          <label className="flex items-center gap-2"><input type="radio" name="link-scope" checked={scope === 'message'} onChange={() => setScope('message')} /> This message only</label>
        </fieldset>
        {problem && <p className="rounded-md bg-red-50 px-3 py-2 text-red-800" role="alert">{problem}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            type="button" onClick={link} disabled={!patient || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Link to patient
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LinkToPatientModal;
