import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Loader2, AlertTriangle, Eye, X } from 'lucide-react';
import Modal from '../shared/Modal';
import PatientSearchInput from '../shared/PatientSearchInput';
import mailService from '../../services/mailService';
import documentService from '../../services/documentService';
import { formatBytes } from './mailFormat';

const searchPatients = async (q) => (await mailService.patients(q)).data.patients || [];

/**
 * "Attach from patient file" (Staff Email phase 3a).
 *
 * Search a patient by name, UHID, phone, email or ID; the documents on their
 * file — including any file merged into it — are listed; ticked ones go back
 * to the Composer as references. The files themselves are read from the HMS
 * on the server when the message is sent (never downloaded to the browser,
 * never copied into a draft).
 *
 * Preview: each available document can be opened INSIDE the dialog before it
 * is ticked, so the sender can confirm it is the right report. The file comes
 * through the same authenticated route (and access check) as the patient's
 * Documents tab; nothing is kept once the dialog closes.
 *
 * Props: isOpen, onClose, onAttach(refs), budget { bytes, files } left in the
 *        message, alreadyIds (Set of documentIds already attached).
 */
const AttachFromPatientModal = ({ isOpen, onClose, onAttach, budget, alreadyIds }) => {
  const [patient, setPatient] = useState(null);
  const [data, setData] = useState(null);          // { patient, documents, mergedUhids }
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [preview, setPreview] = useState(null);    // { id, name, type, url, loading, error }

  // Start clean every time it opens.
  useEffect(() => {
    if (!isOpen) return;
    setPatient(null); setData(null); setProblem(null); setPicked(new Set()); setPreview(null);
  }, [isOpen]);

  // A preview's blob URL lives only while it is shown.
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview?.url]);

  const openPreview = async (d) => {
    if (preview?.id === d.id) { setPreview(null); return; }
    setPreview({ id: d.id, name: d.testType || d.fileName, type: d.type, url: null, loading: true, error: null });
    try {
      const blob = await documentService.getFile(d.fileKey);
      const typed = blob instanceof Blob && blob.type ? blob : new Blob([blob], { type: d.type });
      const url = URL.createObjectURL(typed);
      setPreview((p) => (p && p.id === d.id ? { ...p, url, loading: false } : (URL.revokeObjectURL(url), p)));
    } catch (err) {
      setPreview((p) => (p && p.id === d.id ? { ...p, loading: false, error: err?.message || 'Could not open this document.' } : p));
    }
  };

  useEffect(() => {
    if (!patient) { setData(null); return undefined; }
    let live = true;
    setLoading(true); setProblem(null); setPicked(new Set()); setPreview(null);
    mailService.patientDocuments(patient.uhid)
      .then((res) => { if (live) setData(res.data); })
      .catch((err) => { if (live) { setData(null); setProblem(err?.message || 'Could not load this patient’s documents.'); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [patient]);

  const docs = data?.documents || [];
  const chosen = docs.filter((d) => picked.has(d.id));
  const bytes = chosen.reduce((n, d) => n + (d.size || 0), 0);
  const overBytes = bytes > budget.bytes;
  const overCount = chosen.length > budget.files;

  const toggle = (id) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const attach = () => {
    onAttach(chosen.map((d) => ({
      documentId: d.id, fileName: d.fileName, type: d.type, size: d.size,
      uhid: data.patient.uhid, patientName: data.patient.name,
    })));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Attach from patient file" size="lg">
      <div className="space-y-3">
        <PatientSearchInput
          autoFocus
          searchFn={searchPatients}
          placeholder="Name, UHID or phone number"
          selectedPatient={patient}
          onSelect={setPatient}
          onClear={() => setPatient(null)}
        />

        {loading && (
          <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading documents…</p>
        )}
        {problem && (
          <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {problem}
          </p>
        )}

        {data && !loading && (
          <div>
            <p className="mb-1 text-xs text-gray-500">
              Documents on file{data.mergedUhids.length ? ` (includes merged record${data.mergedUhids.length > 1 ? 's' : ''} ${data.mergedUhids.join(', ')})` : ''}
            </p>
            {docs.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-gray-500">No documents on this patient’s file.</p>
            ) : (
              <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
                {docs.map((d) => {
                  const already = alreadyIds.has(d.id);
                  const Icon = /^image\//.test(d.type) ? ImageIcon : FileText;
                  return (
                    <li key={d.id} className={`flex items-center ${preview?.id === d.id ? 'bg-blue-50' : ''}`}>
                      <label className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-sm ${d.available && !already ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default text-gray-400'}`}>
                        <input
                          type="checkbox" className="rounded border-gray-300"
                          checked={already || picked.has(d.id)} disabled={!d.available || already}
                          onChange={() => toggle(d.id)}
                        />
                        <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate" title={d.fileName}>{d.testType || d.fileName}</span>
                        <span className="flex-shrink-0 text-xs text-gray-500">
                          {[d.category, d.date, d.available ? formatBytes(d.size) : 'file missing', already ? 'attached' : null].filter(Boolean).join(' · ')}
                        </span>
                      </label>
                      {d.available && d.fileKey && (
                        <button
                          type="button" onClick={() => openPreview(d)}
                          aria-label={`Preview ${d.testType || d.fileName}`} aria-pressed={preview?.id === d.id}
                          className="mr-2 inline-flex flex-shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-primary hover:bg-blue-50"
                        >
                          <Eye className="h-3.5 w-3.5" /> {preview?.id === d.id ? 'Hide' : 'Preview'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {preview && (
          <div className="rounded-md border">
            <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs">
              <Eye className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-semibold text-gray-700">{preview.name}</span>
              {!picked.has(preview.id) && !alreadyIds.has(preview.id) && !preview.error && (
                <button type="button" onClick={() => toggle(preview.id)} className="font-semibold text-primary hover:underline">
                  Select this file
                </button>
              )}
              {picked.has(preview.id) && <span className="font-semibold text-green-700">Selected</span>}
              <button type="button" onClick={() => setPreview(null)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100" aria-label="Close preview">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex h-80 items-center justify-center bg-gray-50">
              {preview.loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
              {preview.error && <p className="px-4 text-sm text-red-700" role="alert">{preview.error}</p>}
              {preview.url && (/^image\//.test(preview.type)
                ? <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain" />
                : <iframe title={`Preview of ${preview.name}`} src={preview.url} className="h-full w-full" />)}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t pt-3">
          <span className={`text-xs ${overBytes || overCount ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
            {chosen.length} selected · {formatBytes(bytes)}
            {overBytes ? ' — more than the message has room for (25 MB)' : overCount ? ` — at most ${budget.files} more attachment${budget.files === 1 ? '' : 's'}` : ''}
          </span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button" onClick={attach} disabled={!chosen.length || overBytes || overCount}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {chosen.length ? `Attach ${chosen.length} file${chosen.length === 1 ? '' : 's'}` : 'Attach'}
            </button>
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Sending records on the patient’s activity trail how many documents went to how many recipients and their domains — never the content.
        </p>
      </div>
    </Modal>
  );
};

export default AttachFromPatientModal;
