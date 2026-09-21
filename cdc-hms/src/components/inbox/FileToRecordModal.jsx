import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import PatientSearchInput from '../shared/PatientSearchInput';
import commsService from '../../services/commsService';

const CATEGORIES = ['WhatsApp Attachment', 'Lab Report - External', 'Prescription', 'Imaging Report', 'Referral Letter', 'Other'];

// File an inbound attachment into the patient record. A locked PDF is unlocked
// on save — the patient's own ID/DOB are tried first; if they don't fit, the
// user types the password. The report always lands as Pending Review.
const FileToRecordModal = ({ isOpen, onClose, message, defaultPatient, onFiled }) => {
  const [uhid, setUhid] = useState(defaultPatient?.uhid || '');
  const [category, setCategory] = useState(message?.media?.mime?.includes('pdf') ? 'Lab Report - External' : 'WhatsApp Attachment');
  const [testType, setTestType] = useState('');
  const [labName, setLabName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [notes, setNotes] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [completeQuery, setCompleteQuery] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setUhid(defaultPatient?.uhid || ''); }, [defaultPatient]);

  useEffect(() => {
    if (!isOpen || !message) return undefined;
    let url;
    commsService.getMedia(message.id).then((blob) => { url = URL.createObjectURL(blob); setPreviewUrl(url); }).catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [isOpen, message]);

  const submit = async () => {
    if (!uhid) { toast.error('Choose a patient first.'); return; }
    setSaving(true);
    try {
      const data = { uhid, documentCategory: category, testType, labName, testDate: testDate || undefined, notes, completeQuery };
      if (password) data.password = password;
      const r = await commsService.fileToRecord(message.id, data);
      toast.success('Filed to the patient record (Pending Review).');
      onFiled?.(r.data);
      onClose();
    } catch (e) {
      const code = e?.data?.code;
      if (code === 'password_required') { setNeedsPassword(true); toast('This PDF is password-protected — enter the password.'); }
      else if (code === 'invalid_password') { setNeedsPassword(true); toast.error('That password did not unlock the PDF.'); }
      else toast.error(e.message || 'Could not file the attachment.');
    } finally { setSaving(false); }
  };

  const isPdf = message?.media?.mime?.includes('pdf');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File attachment to patient record" size="2xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-h-[300px] rounded border bg-gray-50">
          {previewUrl ? (
            isPdf ? <iframe title="preview" src={previewUrl} className="h-[60vh] w-full rounded" /> : <img src={previewUrl} alt="attachment" className="max-h-[60vh] w-full rounded object-contain" />
          ) : <div className="p-8 text-center text-sm text-gray-400">Loading preview…</div>}
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <label className="text-xs text-gray-500">Patient</label>
            {defaultPatient ? <div className="rounded border bg-gray-50 px-2 py-1">{defaultPatient.firstName} {defaultPatient.lastName} · {defaultPatient.uhid}</div>
              : <PatientSearchInput onSelect={(p) => setUhid(p.uhid)} placeholder="Search patient…" />}
            {!defaultPatient && uhid && <div className="mt-1 text-xs text-emerald-600">Selected: {uhid}</div>}
          </div>
          <div><label className="text-xs text-gray-500">Category</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border-gray-300">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500">Test / type</label><input value={testType} onChange={(e) => setTestType(e.target.value)} className="w-full rounded border-gray-300" /></div>
            <div><label className="text-xs text-gray-500">Lab / source</label><input value={labName} onChange={(e) => setLabName(e.target.value)} className="w-full rounded border-gray-300" /></div>
          </div>
          <div><label className="text-xs text-gray-500">Date</label><input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="w-full rounded border-gray-300" /></div>
          <div><label className="text-xs text-gray-500">Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded border-gray-300" /></div>
          {(needsPassword || message?.media?.encrypted) && (
            <div><label className="text-xs text-amber-600">PDF password (tried automatically first)</label><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g. the patient's ID or DOB" className="w-full rounded border-amber-300" /></div>
          )}
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={completeQuery} onChange={(e) => setCompleteQuery(e.target.checked)} /> Mark the patient's query as completed</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm text-gray-500">Cancel</button>
            <button type="button" disabled={saving} onClick={submit} className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-40">{saving ? 'Filing…' : 'File to record'}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FileToRecordModal;
