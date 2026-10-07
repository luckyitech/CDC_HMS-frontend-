import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { X, Phone, AlertTriangle, Pill, FlaskConical } from 'lucide-react';
import { PANEL_Z } from '../../constants/layers';
import { usePrescriptionContext } from '../../contexts/PrescriptionContext';
import { useUserContext } from '../../contexts/UserContext';
import remoteRequestService from '../../services/remoteRequestService';
import useDraft from '../../hooks/useDraft';
import PrescriptionManagement from './PrescriptionManagement';
import LabRequest from '../shared/LabRequest';
import SwitcherTabs from '../shared/SwitcherTabs';
import { DraftStatus, DraftRestoreBanner } from '../shared/DraftStatus';

const CHANNELS = [['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['walk_in', 'Walk-in, no visit']];
const ASKERS = [['patient', 'Patient'], ['relative', 'Relative / caregiver'], ['pharmacy', 'Pharmacy']];
const BLANK = { channel: 'phone', requestedByType: 'patient', requestedByName: '', note: '' };
// The prescription / lab drafts written here never mix with the consultation's.
const REMOTE_CONTEXT = 'remote';

/**
 * Remote request (6 Oct 2026) — a prescription or lab request written OUTSIDE
 * a consultation: the patient, a relative or a pharmacy phoned, sent a WhatsApp
 * or email, or walked in without a visit. Opened from the patient file's Visit
 * History tab (doctors only).
 *
 * DRY: the two tabs mount the SAME PrescriptionManagement and LabRequest the
 * consultation uses. This panel only adds the strip above them — how it came
 * in, who asked, the required clinical note — and a `beforeSave` step that
 * writes the remote request the first time something is saved and links every
 * prescription / lab request saved here to it.
 *
 * Props: patient, prescriptions (this patient's), warning (e.g. another doctor
 * has the patient in consultation), onClose(changed).
 */
const RemoteRequestPanel = ({ patient, prescriptions = [], warning = null, onClose }) => {
  const { addPrescription } = usePrescriptionContext();
  const { currentUser } = useUserContext();
  const [form, setForm] = useState(BLANK);
  const [rr, setRr] = useState(null);         // the written remote request (after the first save)
  const rrRef = useRef(null);
  const [tab, setTab] = useState('rx');
  const [changed, setChanged] = useState(false);
  const noteRef = useRef(null);

  // The strip (the clinical note especially) autosaves until the request is written.
  const draft = useDraft({
    uhid: patient?.uhid,
    formKey: 'remote-request',
    contextKey: REMOTE_CONTEXT,
    value: form,
    baseline: BLANK,
    enabled: !rr,
    onRestore: (p) => setForm({ ...BLANK, ...(p || {}) }),
    onDiscard: () => setForm(BLANK),
  });

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const needsName = form.requestedByType !== 'patient';
  const latest = prescriptions[0] || null;

  // Runs before the FIRST prescription or lab request is saved here: writes
  // the remote request, then hands its id to the save. Later saves reuse it.
  const beforeSave = async () => {
    if (rrRef.current) return { remoteRequestId: rrRef.current.id };
    if (needsName && !form.requestedByName.trim()) {
      toast.error(form.requestedByType === 'pharmacy' ? 'Name the pharmacy first.' : 'Name the relative or caregiver first.');
      return null;
    }
    if (!form.note.trim()) {
      toast.error('Write the clinical note first — it goes on the record with the request.');
      noteRef.current?.focus();
      return null;
    }
    try {
      const res = await remoteRequestService.create({ uhid: patient.uhid, ...form });
      rrRef.current = res.data;
      setRr(res.data);
      draft.markSaved();
      return { remoteRequestId: res.data.id };
    } catch (e) {
      toast.error(e?.message || 'Could not start the remote request');
      return null;
    }
  };

  const chip = (on) => `px-3 py-1.5 rounded-full border-2 text-sm font-semibold min-h-[40px] ${on ? 'border-primary bg-blue-50 text-blue-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`;
  const channelLabel = (CHANNELS.find(([k]) => k === (rr?.channel || form.channel)) || [])[1] || 'Phone';

  return createPortal(
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: PANEL_Z }} role="dialog" aria-modal="true" aria-labelledby="rr-title">
      <div className="absolute inset-0 bg-black/30" onClick={() => onClose(changed)} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-4xl flex-col bg-white shadow-xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <Phone className="w-5 h-5 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="rr-title" className="text-lg font-bold text-gray-800 truncate">Remote request — {patient.name}</h2>
            <p className="text-sm text-gray-500">
              Recorded on today's date as a {channelLabel.toLowerCase()} request · {currentUser?.name ? `Dr. ${currentUser.name.replace(/^Dr\.?\s*/i, '')}` : 'you'}
            </p>
          </div>
          <button type="button" onClick={() => onClose(changed)} aria-label="Close" className="ml-auto p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {warning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" /> <p>{warning}</p>
            </div>
          )}

          {rr ? (
            <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
              <p className="font-semibold">{rr.summary}</p>
              <p className="mt-1 whitespace-pre-wrap">{rr.note}</p>
              <p className="mt-1 text-xs text-green-800">On the record. Everything you save below is linked to this request.</p>
            </div>
          ) : (
            <>
              <DraftRestoreBanner draft={draft} />
              <fieldset className="space-y-2">
                <legend className="font-semibold text-gray-800 mb-2">How did the request come in?</legend>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={form.channel === k} onClick={() => set('channel')(k)} className={chip(form.channel === k)}>{label}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="font-semibold text-gray-800 mb-2">Who asked?</legend>
                <div className="flex flex-wrap gap-2">
                  {ASKERS.map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={form.requestedByType === k} onClick={() => set('requestedByType')(k)} className={chip(form.requestedByType === k)}>{label}</button>
                  ))}
                </div>
                {needsName && (
                  <label className="block text-sm text-gray-700">
                    {form.requestedByType === 'pharmacy' ? 'Pharmacy' : 'Name and relationship'} <span className="text-red-600">*</span>
                    <input
                      value={form.requestedByName}
                      onChange={(e) => set('requestedByName')(e.target.value)}
                      placeholder={form.requestedByType === 'pharmacy' ? 'e.g. Goodlife Pharmacy, Westlands' : 'e.g. Daughter — Mercy Achieng'}
                      className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </label>
                )}
              </fieldset>
              <label className="block">
                <span className="font-semibold text-gray-800">Clinical note <span className="text-red-600">*</span></span>
                <textarea
                  ref={noteRef}
                  rows={3}
                  value={form.note}
                  onChange={(e) => set('note')(e.target.value)}
                  placeholder="e.g. Called — runs out of metformin Friday. Sugars stable on home log, no hypos. 30-day refill until review."
                  className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary resize-y"
                />
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <DraftStatus draft={draft} showLine={false} />
                  Saved to the record with the first prescription or lab request below.
                </span>
              </label>
            </>
          )}

          {latest && (
            <p className="text-xs text-gray-500">
              Last prescription {latest.prescriptionNumber} · {latest.createdAt ? new Date(latest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}{latest.doctorName ? ` · ${latest.doctorName}` : ''}
            </p>
          )}

          <SwitcherTabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'rx', label: 'Prescription', Icon: Pill },
              { id: 'lab', label: 'Lab request', Icon: FlaskConical },
            ]}
          />

          {tab === 'rx' ? (
            <PrescriptionManagement
              patient={patient}
              patientPrescriptions={prescriptions}
              addPrescription={addPrescription}
              currentUser={currentUser}
              onSuccess={() => setChanged(true)}
              draftContextKey={REMOTE_CONTEXT}
              draftLabel="Prescription (remote request)"
              beforeSave={beforeSave}
            />
          ) : (
            <LabRequest
              patient={patient}
              draftContextKey={REMOTE_CONTEXT}
              draftLabel="Lab request (remote request)"
              beforeSave={async () => { const x = await beforeSave(); if (x) setChanged(true); return x; }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default RemoteRequestPanel;
