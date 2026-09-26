import { useState, useEffect } from 'react';
import { Loader2, FolderPlus, X } from 'lucide-react';
import PatientSearchInput from '../shared/PatientSearchInput';
import { usePatientContext } from '../../contexts/PatientContext';
import mailService from '../../services/mailService';
import { notify } from '../../utils/notify';

const searchPatients = async (q) => (await mailService.patients(q)).data.patients || [];
const SAVEABLE = /^(application\/pdf|image\/(png|jpe?g))$/i;
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Can this attachment go to a patient file at all? (The server checks the bytes too.) */
export const canSaveAttachment = (att) => SAVEABLE.test(att?.type || '') || /\.(pdf|jpe?g|png)$/i.test(att?.filename || '');

/**
 * "Save to patient file" for one received attachment (Staff Email phase 3a) —
 * the Lab Inbox pairing path: the file is copied from your mailbox into the
 * patient's documents as Pending Review, attributed to you, source "Email".
 *
 * If the sender's address is on exactly one patient's file, that patient is
 * pre-selected — but it is only a suggestion; nothing is saved until you press
 * Save.
 */
const SaveToPatientPanel = ({ message, attachment, folder, onClose, onSaved }) => {
  const { DOCUMENT_CATEGORIES } = usePatientContext();
  const [patient, setPatient] = useState(null);
  const [suggested, setSuggested] = useState(false);
  const [category, setCategory] = useState('Lab Report - External');
  const [testDate, setTestDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(null);

  // Suggest the patient whose file carries the sender's address.
  useEffect(() => {
    const from = message?.from?.address;
    if (!from) return undefined;
    let live = true;
    searchPatients(from)
      .then((list) => { if (live && list.length === 1) { setPatient(list[0]); setSuggested(true); } })
      .catch(() => {});
    return () => { live = false; };
  }, [message?.from?.address]);

  const save = async () => {
    if (!patient) { setProblem('Pick a patient first.'); return; }
    setSaving(true); setProblem(null);
    try {
      const res = await mailService.saveToPatient(message.uid, attachment.part, folder, {
        uhid: patient.uhid, category, testDate: testDate || undefined, notes: notes.trim() || undefined,
      });
      notify('success', `Saved to ${res.data.patient.name}’s file (${res.data.patient.uhid}) — Pending review`);
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      setProblem(err?.message || 'Could not save it to the patient file.');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none';

  return (
    <div className="mt-2 rounded-md border border-gray-300 bg-white p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <FolderPlus className="h-4 w-4 text-gray-500" aria-hidden="true" />
        <span className="font-semibold text-gray-800">Save “{attachment.filename}” to a patient file</span>
        <button type="button" onClick={onClose} className="ml-auto rounded p-0.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_9rem]">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
            Patient
            {suggested && patient && <span className="rounded bg-violet-50 px-1 text-[10px] font-semibold text-violet-800">suggested from sender</span>}
          </div>
          <PatientSearchInput
            searchFn={searchPatients}
            placeholder="Name, UHID or phone number"
            selectedPatient={patient}
            onSelect={(p) => { setPatient(p); setSuggested(false); setProblem(null); }}
            onClear={() => { setPatient(null); setSuggested(false); }}
          />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Test date</span>
          <input type="date" value={testDate} max={todayIso()} onChange={(e) => setTestDate(e.target.value)} className={field} />
        </label>
      </div>
      <label className="mt-2 block">
        <span className="mb-1 block text-xs text-gray-500">Notes (optional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className={field} placeholder="Anything the reviewer should know" />
      </label>
      {problem && <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-800" role="alert">{problem}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Lands in Diagnostics as Pending review · source Email · saved by you</span>
        <button
          type="button" onClick={save} disabled={saving || !patient}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
};

export default SaveToPatientPanel;
