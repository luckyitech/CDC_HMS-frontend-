import { useState } from 'react';
import { Loader2, FolderPlus } from 'lucide-react';
import Modal from './Modal';
import commsService from '../../services/commsService';
import { usePatientContext } from '../../contexts/PatientContext';
import { notify } from '../../utils/notify';

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Save attachments of a patient-thread email into that patient's Documents
 * (phase 5b). One or several at once — the Link-to-patient prompt passes all
 * that are waiting; the Communications tab passes one. Each lands as Pending
 * Review (like every email save), attributed to you. The file is read from YOUR
 * mailbox; the server refuses anyone else's.
 *
 * Props: uhid, patientName, items [{ messageRowId, index, name }], onClose, onSaved(count).
 */
const SaveEmailAttachmentDialog = ({ uhid, patientName, items, onClose, onSaved }) => {
  const { DOCUMENT_CATEGORIES } = usePatientContext();
  const [rows, setRows] = useState(() => items.map((it) => ({
    ...it, pick: true, category: /\.pdf$/i.test(it.name) ? 'Lab Report - External' : (DOCUMENT_CATEGORIES.includes('Other') ? 'Other' : DOCUMENT_CATEGORIES[0]),
    status: null, error: null,
  })));
  const [testDate, setTestDate] = useState('');
  const [busy, setBusy] = useState(false);
  const field = 'rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none';

  const save = async () => {
    setBusy(true);
    let saved = 0;
    const next = [...rows];
    for (let i = 0; i < next.length; i += 1) {
      const r = next[i];
      if (!r.pick || r.status === 'saved') continue;
      try {
        await commsService.savePatientEmailAttachment(uhid, r.messageRowId, r.index, { category: r.category, testDate: testDate || undefined });
        next[i] = { ...r, status: 'saved', error: null };
        saved += 1;
      } catch (err) {
        next[i] = { ...r, status: 'error', error: err?.message || 'Not saved.' };
      }
      setRows([...next]);
    }
    setBusy(false);
    if (saved) {
      notify('success', `${saved} attachment${saved === 1 ? '' : 's'} saved to ${patientName || 'the patient'}’s Documents — Pending review`);
      onSaved?.(saved);
    }
    if (next.every((r) => !r.pick || r.status === 'saved')) onClose();
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} title="Save to the patient’s Documents" size="lg">
      <div className="space-y-3 text-sm" data-testid="save-attachments">
        <p className="text-gray-600">
          <FolderPlus className="mr-1 inline h-4 w-4 text-gray-500" aria-hidden="true" />
          Files go into {patientName ? <b>{patientName}’s</b> : 'the patient’s'} Documents tab as <b>Pending review</b>. The Communications tab then opens them from there.
        </p>
        <ul className="divide-y rounded-md border">
          {rows.map((r, i) => (
            <li key={`${r.messageRowId}-${r.index}`} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <input type="checkbox" checked={r.pick} disabled={busy || r.status === 'saved'} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, pick: e.target.checked } : x)))} aria-label={`Save ${r.name}`} />
              <span className="min-w-0 flex-1 truncate font-medium text-gray-800" title={r.name}>{r.name}</span>
              <select value={r.category} disabled={busy || r.status === 'saved'} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))} className={field} aria-label={`Category for ${r.name}`}>
                {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {r.status === 'saved' && <span className="text-xs font-semibold text-emerald-700">Saved</span>}
              {r.error && <span className="w-full text-xs text-red-700">{r.error}</span>}
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Test date (optional)
          <input type="date" max={todayIso()} value={testDate} onChange={(e) => setTestDate(e.target.value)} className={field} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Not now</button>
          <button type="button" onClick={save} disabled={busy || !rows.some((r) => r.pick && r.status !== 'saved')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save to Documents
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveEmailAttachmentDialog;
