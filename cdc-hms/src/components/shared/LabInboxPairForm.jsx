import { useState, useMemo } from 'react';
import { Search, RotateCcw, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import Button from './Button';
import StatusBadge from './StatusBadge';
import PatientSearchInput from './PatientSearchInput';
import ReasonModal from './ReasonModal';
import { usePatientContext } from '../../contexts/PatientContext';
import labInboxService from '../../services/labInboxService';
import { notify } from '../../utils/notify';
import {
  confidenceTone, confidenceLabel, suggestionWhy, extractedSummary,
  patientDisplayName, patientInitials, toDateInput, testTypeFromSubject,
} from '../../utils/labInboxHelpers';

const DEFAULT_CATEGORY = 'Lab Report - External';

/**
 * LabInboxPairForm — pair one incoming lab report to a patient.
 *
 * ONE form, used in two places (the inline "Quick pair" row and the
 * "Preview & pair" modal) so the two paths can never drift. Shows the
 * auto-suggested patient with its confidence and WHY, lets the staff member
 * confirm or search for a different patient, prefills the filing details from
 * the email, and pairs (→ MedicalDocument, Pending Review) or discards.
 *
 * Props:
 *   item          — a Lab Inbox item from labInboxService.list()
 *   onPaired(res) — after a successful pair; res = { item, documentId, patient }
 *   onDiscarded(res)
 *   compact       — tighter spacing for the inline row
 */
const LabInboxPairForm = ({ item, onPaired, onDiscarded, compact = false }) => {
  const { DOCUMENT_CATEGORIES } = usePatientContext();
  // Own useMemo so the derived memos below get a stable dependency (React-Compiler rule).
  const suggestion = useMemo(() => item?.suggestion || {}, [item]);
  const suggested = suggestion.patient || null;

  const [patient, setPatient] = useState(suggested);
  const [changing, setChanging] = useState(!suggested);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [testType, setTestType] = useState(() => testTypeFromSubject(item?.subject, [
    item?.suggestion?.extracted?.name,
    patientDisplayName(item?.suggestion?.patient),
  ]));
  const [labName, setLabName] = useState(item?.senderName || '');
  const [testDate, setTestDate] = useState(() => toDateInput(item?.emailDate));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [errors, setErrors] = useState({});

  const usingSuggestion = !!(patient && suggested && patient.uhid === suggested.uhid);
  const why = useMemo(() => suggestionWhy(suggestion), [suggestion]);
  const hints = useMemo(() => extractedSummary(suggestion.extracted), [suggestion]);
  const tone = confidenceTone(suggestion.confidence);
  const isWeak = suggestion.confidence === 'low' || suggestion.confidence === 'medium';

  const pair = async () => {
    const e = {};
    if (!patient?.uhid) e.patient = 'Choose the patient this report belongs to.';
    if (!category) e.category = 'Choose a document category.';
    if (!testDate) e.testDate = 'Enter the test date.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const res = await labInboxService.match(item.id, {
        uhid: patient.uhid,
        category,
        testType: testType.trim() || undefined,
        labName: labName.trim() || undefined,
        testDate,
        notes: notes.trim() || undefined,
      });
      notify('success', `Filed to ${patientDisplayName(patient)} → Diagnostics (Pending Review).`);
      onPaired?.(res.data);
    } catch (err) {
      notify('error', err?.message || 'Could not pair this report.');
    } finally {
      setBusy(false);
    }
  };

  const discard = async (reason) => {
    try {
      const res = await labInboxService.discard(item.id, reason);
      notify('info', 'Report discarded (kept for audit).');
      setDiscarding(false);
      onDiscarded?.(res.data);
    } catch (err) {
      notify('error', err?.message || 'Could not discard this report.');
    }
  };

  const gap = compact ? 'gap-3' : 'gap-4';
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

  return (
    <div className={`flex flex-col ${gap}`}>
      {/* ---- Patient ---- */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Patient</p>

        {patient && !changing ? (
          <div className={`rounded-lg border px-3 py-2.5 bg-white ${
            usingSuggestion && tone === 'success' ? 'border-green-200'
              : usingSuggestion && tone === 'warning' ? 'border-amber-200'
              : 'border-gray-200'
          }`}>
            {/* Row 1: identity + Change. Row 2: confidence. Two rows so the
                name always has room even in the narrow modal panel. */}
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {patientInitials(patient)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-800 text-sm truncate">{patientDisplayName(patient)}</p>
                <p className="text-xs text-gray-500 truncate">
                  {patient.uhid}{patient.phone ? ` · ${patient.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChanging(true)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 flex-shrink-0"
              >
                <Search className="w-3.5 h-3.5" /> Change
              </button>
            </div>
            {usingSuggestion && (
              <div className="mt-2 pl-12">
                <StatusBadge tone={tone} size="xs">
                  {suggestion.score != null && suggestion.confidence !== 'none' ? `${suggestion.score}% · ` : ''}{confidenceLabel(suggestion.confidence)}
                </StatusBadge>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <PatientSearchInput
              placeholder="Search by name, UHID or phone…"
              onSelect={(p) => { setPatient(p); setChanging(false); setErrors((x) => ({ ...x, patient: null })); }}
            />
            {suggested && (
              <button
                type="button"
                onClick={() => { setPatient(suggested); setChanging(false); }}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Use suggested: {patientDisplayName(suggested)} ({suggested.uhid})
              </button>
            )}
          </div>
        )}

        {/* WHY — always visible so staff trust but verify */}
        {suggested || suggestion.confidence === 'none' ? (
          <p className={`mt-1.5 text-xs ${isWeak ? 'text-amber-700' : 'text-gray-500'}`}>
            {why}{hints ? <span className="text-gray-400"> — found: {hints}</span> : null}
          </p>
        ) : null}
        {errors.patient && <p className="text-red-600 text-xs mt-1">{errors.patient}</p>}
      </div>

      {/* ---- Filing details ---- */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Filing details</p>
        <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2'} gap-3`}>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Document category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {(DOCUMENT_CATEGORIES || [DEFAULT_CATEGORY]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Test / report type</label>
            <input value={testType} onChange={(e) => setTestType(e.target.value)} placeholder="e.g. HbA1c + Lipid profile" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Lab name</label>
            <input value={labName} onChange={(e) => setLabName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Test date *</label>
            <input type="date" value={testDate} max={toDateInput()} onChange={(e) => setTestDate(e.target.value)} className={inputCls} />
            {errors.testDate && <p className="text-red-600 text-xs mt-1">{errors.testDate}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes for the doctor (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the doctor should know" className={inputCls} />
          </div>
        </div>
      </div>

      {/* ---- Actions ---- */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button onClick={pair} disabled={busy} className="!px-5 !py-2.5 text-sm">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Pair to patient
        </Button>
        <button
          type="button"
          onClick={() => setDiscarding(true)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" /> Discard
        </button>
        <p className="text-xs text-gray-500 flex items-center gap-1.5 sm:ml-auto">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          Files to {patient ? patientDisplayName(patient) : 'the patient'} → Diagnostics · <b>Pending Review</b> · notifies the doctor
        </p>
      </div>

      <ReasonModal
        isOpen={discarding}
        onClose={() => setDiscarding(false)}
        title="Discard this report?"
        message="It will be hidden from the inbox but kept on record — nothing is deleted. Say why, e.g. 'not a lab report' or 'duplicate'."
        confirmLabel="Discard"
        destructive
        placeholder="Reason…"
        onConfirm={discard}
      />
    </div>
  );
};

export default LabInboxPairForm;
