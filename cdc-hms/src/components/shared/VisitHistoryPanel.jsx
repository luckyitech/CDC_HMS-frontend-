import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar, ChevronDown, ChevronRight, Printer, X,
  Activity, Target, FileEdit, Stethoscope, MessageSquare, Pill, Syringe, ClipboardList,
  BedDouble, Share2, FileText, Clock,
} from 'lucide-react';
import usePrint from '../../hooks/usePrint';
import PrintLetterhead from './PrintLetterhead';
import PrintRoot from './PrintRoot';
import PrescriptionPrint from '../doctor/PrescriptionPrint';
import SwitcherTabs from './SwitcherTabs';
import patientService from '../../services/patientService';
import inpatientService from '../../services/inpatientService';
import glp1Service from '../../services/glp1Service';
import queueService from '../../services/queueService';
import nursingNoteService from '../../services/nursingNoteService';
import { useInitialAssessmentContext } from '../../contexts/InitialAssessmentContext';
import { usePhysicalExamContext } from '../../contexts/PhysicalExamContext';
import { useTreatmentPlanContext } from '../../contexts/TreatmentPlanContext';
import { usePrescriptionContext } from '../../contexts/PrescriptionContext';
import { useConsultationNotesContext } from '../../contexts/ConsultationNotesContext';
import { physicalExamSections, generateFindingsProse } from '../../pages/doctor/physicalExamData';
import { parseDiagnoses } from './DiagnosisInput';

// ── Config: maps each history record type to its date field ──────────────────
// To add a new section (e.g. lab results): add one entry here + one fetch call
// + one render block in VisitDocument. No changes to the core filtering logic.
const DATE_FIELD_MAP = {
  vitals:          'recordedAt',
  plans:           'date',
  // Assessments come back with date + time (like notes and exams) and NO
  // createdAt, so keying them off createdAt silently dropped every assessment
  // from every day.
  assessments:     'date',
  exams:           'date',
  notes:           'date',
  prescriptions:   'createdAt',
  // GLP-1 injections: administeredDate is set for 'given', createdAt used as
  // fallback for missed/omitted (the r[field] || r.createdAt pattern below)
  glp1Injections:  'administeredDate',
  // GLP-1 monitoring reviews written by any clinician (nurse or doctor)
  glp1Reviews:     'date',
  // Per-week notes — the nurse's injection note and the doctor's reply. Their
  // own section rather than nested under the injection: a week that elapsed
  // without being recorded has no injection row at all, and a note filed
  // against it must not vanish with it.
  glp1WeekNotes:   'createdAt',
  // Advised admissions (doctor's admission note from OPD) — an "action", not part
  // of the clinical document; rendered in the day's Actions tab. Grouped by
  // savedAt (when the note was documented), not requestedAt (when it was sent for
  // admission): the note belongs to the day it was written, and requestedAt is
  // null while the note has only been documented.
  admissions:      'savedAt',
  // Referral notes (doctor's referral letter from OPD) — also an "action".
  referrals:       'savedAt',
  // Nursing notes — the DAR-format Kardex. Each entry is dated by its own day.
  nursingNotes:    'date',
  // Workflow milestones from the queue (check-in, triage done, seen by doctor,
  // completed). Timeline-only — the clinical tabs and the "N records" count
  // ignore them; they're visit events, not saved clinical records.
  workflow:        'ts',
};

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const HISTORY_PAGE_SIZE = 10;

// ── Small read-only helpers ───────────────────────────────────────────────────
const SectionHeader = ({ icon, label }) => (
  <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5 mb-2">
    {icon}
    {label}
  </h4>
);

// break-words + overflow-hidden: long unbroken strings (pasted text, URLs)
// wrap inside the box instead of running past its edge — on every viewport.
const DocBox = ({ children }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2 last:mb-0 text-sm text-gray-700 break-words overflow-hidden">
    {children}
  </div>
);

// ── Encounter timing helpers ──────────────────────────────────────────────────
// A day can hold several visits (e.g. morning consultation + evening review).
// Encounters are split on triage-vitals times; every other record joins the
// encounter whose time window contains it.
const parseTimeString = (t) => {
  const m = String(t || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return 12 * 60; // unknown time — assume midday
  let h = +m[1];
  const min = +m[2];
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};

const recordTs = (r, field) => {
  const full = r.recordedAt || r.createdAt;
  if (full) return new Date(full).getTime();
  const day = (r[field] || '').slice(0, 10);
  return new Date(`${day}T00:00:00`).getTime() + parseTimeString(r.time) * 60000;
};

const splitEncounters = (records) => {
  const vitals = [...records.vitals].sort(
    (a, b) => new Date(a.recordedAt || 0) - new Date(b.recordedAt || 0)
  );
  if (vitals.length <= 1) return [{ start: vitals[0]?.recordedAt || null, records }];

  const starts = vitals.map((v) => new Date(v.recordedAt).getTime());
  const encounters = vitals.map((v) => ({
    start: v.recordedAt,
    records: Object.fromEntries(Object.keys(DATE_FIELD_MAP).map((k) => [k, []])),
  }));
  encounters.forEach((enc, i) => { enc.records.vitals = [vitals[i]]; });

  // Assign every non-vitals record to the last encounter that started before it
  Object.entries(DATE_FIELD_MAP).forEach(([key, field]) => {
    if (key === 'vitals') return;
    records[key].forEach((r) => {
      const ts = recordTs(r, field);
      let idx = 0;
      for (let i = 0; i < starts.length; i += 1) if (ts >= starts[i]) idx = i;
      encounters[idx].records[key].push(r);
    });
  });
  return encounters;
};

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : null;

// ── EncounterBlock ────────────────────────────────────────────────────────────
// One encounter rendered as a continuous copy-paste-friendly document: every
// section is the same structure (uppercase subtitle + plain light box).
// Section order (clinical flow): Vitals → Reason for Visit → Consultation
// Notes → Assessment → Physical Exam → Diagnosis & Treatment Plan → GLP-1
// tools → Prescriptions.
const EncounterBlock = ({ records, fullExamCache, showNursingNotes = false }) => (
  <div className="space-y-5 select-text">

    {/* Triage Vitals — plain label: value lines */}
    {records.vitals.length > 0 && (
      <div>
        <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} label="Triage Vitals" />
        {records.vitals.map((v, idx) => (
          <DocBox key={idx}>
            {v.recordedAt && (
              <p className="text-xs text-gray-500 mb-1">
                Recorded {fmtTime(v.recordedAt)}{v.recordedBy ? ` by ${v.recordedBy}` : ''}
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {[
                ['Blood Pressure', v.bp], ['Heart Rate', v.heartRate],
                ['Temperature', v.temperature], ['O₂ Saturation', v.oxygenSaturation],
                ['Weight', v.weight], ['Height', v.height], ['BMI', v.bmi],
                ['Waist Circumference', v.waistCircumference],
                ['Waist/Height Ratio', v.waistHeightRatio],
                ['RBS', v.rbs], ['HbA1c', v.hba1c], ['Ketones', v.ketones],
              ].filter(([, val]) => val).map(([label, val]) => (
                <p key={label}><span className="text-gray-500">{label}:</span> <b className="font-semibold">{val}</b></p>
              ))}
            </div>
          </DocBox>
        ))}
      </div>
    )}

    {/* Reason for Visit */}
    {records.vitals.some(v => v.chiefComplaint) && (
      <div>
        <SectionHeader icon={<MessageSquare className="w-3.5 h-3.5" />} label="Reason for Visit" />
        <DocBox>
          <p className="whitespace-pre-wrap">
            {records.vitals.map(v => v.chiefComplaint).filter(Boolean).join('\n')}
          </p>
        </DocBox>
      </div>
    )}

    {/* Consultation Notes */}
    {records.notes.length > 0 && (
      <div>
        <SectionHeader icon={<MessageSquare className="w-3.5 h-3.5" />} label="Consultation Notes" />
        {records.notes.map(note => (
          <DocBox key={note.id}>
            <p className="whitespace-pre-wrap">{note.notes}</p>
          </DocBox>
        ))}
      </div>
    )}

    {/* Assessment */}
    {records.assessments.length > 0 && (
      <div>
        <SectionHeader icon={<FileEdit className="w-3.5 h-3.5" />} label="Assessment" />
        {records.assessments.map(a => (
          <DocBox key={a.id}>
            <div className="space-y-2">
              {/* API field names are hpi / ros (assessmentController.formatAssessment) */}
              {[
                ['History of Present Illness', a.hpi ?? a.historyOfPresentIllness],
                ['Past Medical History', a.pastMedicalHistory],
                ['Family History', a.familyHistory],
                ['Social History', a.socialHistory],
                ['Review of Systems', a.ros ?? a.reviewOfSystems],
              ].filter(([, val]) => val).map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="whitespace-pre-wrap">{val}</p>
                </div>
              ))}
            </div>
          </DocBox>
        ))}
      </div>
    )}

    {/* Physical Exam — same plain document format as every other section.
        Findings prose comes from the shared generateFindingsProse (identical
        wording to the Physical Examination Summary view). */}
    {records.exams.length > 0 && (
      <div>
        <SectionHeader icon={<Stethoscope className="w-3.5 h-3.5" />} label="Physical Exam" />
        {records.exams.map(e => {
          const full = fullExamCache[e.id];
          if (full === 'error') return (
            <DocBox key={e.id}>
              <p className="text-red-600">Failed to load exam details. Try closing and reopening this date.</p>
            </DocBox>
          );
          if (!full) return (
            <DocBox key={e.id}>
              <p className="text-gray-400">Loading exam details…</p>
            </DocBox>
          );
          const data = full.data || {};
          const findings = physicalExamSections
            .filter(s => s.id !== 'clinicalImages' && data[s.id])
            .map(s => ({
              title: s.title,
              prose: generateFindingsProse(s.id, data[s.id]),
              notes: data[s.id]?.notes || null,
            }))
            .filter(f => f.prose || f.notes);
          return (
            <DocBox key={e.id}>
              {findings.length === 0 ? (
                <p>No findings recorded.</p>
              ) : (
                findings.map(f => (
                  <p key={f.title}>
                    <b className="font-semibold text-gray-800">{f.title}:</b> {f.prose}
                    {f.notes ? ` — ${f.notes}` : ''}
                  </p>
                ))
              )}
            </DocBox>
          );
        })}
      </div>
    )}

    {/* Diagnosis & Treatment Plan */}
    {records.plans.length > 0 && (
      <div>
        <SectionHeader icon={<Target className="w-3.5 h-3.5" />} label="Diagnosis & Treatment Plan" />
        {records.plans.map(plan => (
          <DocBox key={plan.id}>
            {parseDiagnoses(plan.diagnosis).map((d, i) => (
              <p key={i} className="font-semibold text-gray-800">
                {d.code ? `${d.code} — ` : ''}{d.description}
                {i === 0 ? ` (${plan.status})` : ''}
              </p>
            ))}
            {plan.plan && (
              <p className="whitespace-pre-wrap">{plan.plan}</p>
            )}
          </DocBox>
        ))}
      </div>
    )}

    {/* GLP-1 tools — injections recorded in triage */}
    {records.glp1Injections?.length > 0 && (
      <div>
        <SectionHeader icon={<Syringe className="w-3.5 h-3.5" />} label="GLP-1 Injection" />
        {records.glp1Injections.map(inj => (
          <DocBox key={inj.id}>
            <p className="font-semibold text-gray-800 capitalize">
              Week {inj.weekNumber} — {inj.status}{inj.dose ? ` · ${inj.dose} mg` : ''}
            </p>
            {/* Injections are usually given by a nurse — a different person
                than the encounter's doctor, so this attribution stays. */}
            {inj.clinicianName && inj.clinicianRole === 'staff' && (
              <p className="text-xs text-gray-500">By {inj.clinicianName} (Nurse)</p>
            )}
            {inj.site && <p>Site: {inj.site}</p>}
            {inj.note && <p className="whitespace-pre-wrap">{inj.note}</p>}
          </DocBox>
        ))}
      </div>
    )}

    {/* GLP-1 week notes — what the nurse wrote at the injection, and the
        doctor's reply. Read-only here: the record, not a place to work. */}
    {records.glp1WeekNotes?.length > 0 && (
      <div>
        <SectionHeader icon={<MessageSquare className="w-3.5 h-3.5" />} label="GLP-1 Injection Notes" />
        {records.glp1WeekNotes.map(note => (
          <DocBox key={note.id}>
            <p className="text-xs text-gray-500">
              Week {note.weekNumber} · {note.authorName}
              {note.authorRole === 'doctor' ? ' (Doctor)' : ' (Nurse)'}
            </p>
            <p className="whitespace-pre-wrap mt-0.5">{note.body}</p>
          </DocBox>
        ))}
      </div>
    )}

    {/* GLP-1 tools — monitoring reviews (doctor or nurse) */}
    {records.glp1Reviews?.length > 0 && (
      <div>
        <SectionHeader icon={<ClipboardList className="w-3.5 h-3.5" />} label="GLP-1 Monitoring Review" />
        {records.glp1Reviews.map(rev => (
          <DocBox key={rev.id}>
            <p className="font-semibold text-gray-800">
              Week {rev.weekNumber} review{rev.doseAtReview ? ` · ${rev.doseAtReview} mg` : ''}
            </p>
            {/* Nurse-run monitoring visits keep their attribution — a
                different person than the encounter's doctor. */}
            {rev.clinicianName && rev.clinicianRole === 'staff' && (
              <p className="text-xs text-gray-500 mb-1">By {rev.clinicianName} (Nurse)</p>
            )}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {[
                ['Weight', rev.weight != null && (
                  <>{rev.weight} kg{rev.weightChange != null && (
                    <span className={rev.weightChange <= 0 ? 'text-green-600' : 'text-red-600'}>
                      {' '}({rev.weightChange <= 0 ? '▼' : '▲'} {Math.abs(rev.weightChange).toFixed(1)} kg)
                    </span>
                  )}</>
                )], ['BMI', rev.bmi],
                ['BP', rev.bp], ['HbA1c', rev.hba1c && `${rev.hba1c}%`],
                ['FBS', rev.fpg], ['Adherence', rev.adherence],
              ].filter(([, val]) => val).map(([label, val]) => (
                <p key={label}><span className="text-gray-500">{label}:</span> <b className="font-semibold capitalize">{val}</b></p>
              ))}
            </div>
            {rev.actionPlan && <p className="whitespace-pre-wrap mt-1">{rev.actionPlan}</p>}
            {/* Side-effect summary for this review's week — same label:value
                visuals as the rest of the visit document. 'none' gradings are
                settled symptoms, not current complaints — skip them here. */}
            {rev.sideEffects?.filter(s => s.severity && s.severity !== 'none').length > 0 && (
              <p className="mt-1">
                <span className="text-gray-500">Side effects:</span>{' '}
                <b className="font-semibold">
                  {rev.sideEffects
                    .filter(s => s.severity && s.severity !== 'none')
                    .map(s => `${(s.symptom || s.symptomName || s.name || '').toLowerCase()} ${s.severity}`)
                    .join(', ')}
                </b>
              </p>
            )}
          </DocBox>
        ))}
      </div>
    )}

    {/* Nursing notes — DAR-format Kardex. Only in the nursing timeline modal,
        never in the doctor's visit document (they're nurse-authored). */}
    {showNursingNotes && records.nursingNotes?.length > 0 && (
      <div>
        <SectionHeader icon={<FileText className="w-3.5 h-3.5" />} label="Nursing Notes" />
        {records.nursingNotes.map((n) => (
          <DocBox key={n.id}>
            <p className="text-xs text-gray-500 mb-1">
              {n.time}
              {n.authorName ? ` · ${n.authorName}${(n.authorRole === 'staff' || n.authorRole === 'nurse') ? ' (Nurse)' : ''}` : ''}
            </p>
            <div className="space-y-1">
              {n.data && <p><b className="font-semibold text-gray-800">D:</b> {n.data}</p>}
              {n.action && <p><b className="font-semibold text-gray-800">A:</b> {n.action}</p>}
              {n.response && <p><b className="font-semibold text-gray-800">R:</b> {n.response}</p>}
            </div>
          </DocBox>
        ))}
      </div>
    )}

    {/* Prescriptions — plain text lines */}
    {records.prescriptions.length > 0 && (
      <div>
        <SectionHeader icon={<Pill className="w-3.5 h-3.5" />} label="Prescriptions" />
        {records.prescriptions.map((p) => (
          <DocBox key={p.id}>
            {(p.medications || []).map((m, i) => (
              <p key={i}>
                <b className="font-semibold text-gray-800">{m.name}</b>
                {[m.dosage, m.frequency, m.quantity && `Qty: ${m.quantity}`].filter(Boolean).length > 0 &&
                  ` — ${[m.dosage, m.frequency, m.quantity && `Qty: ${m.quantity}`].filter(Boolean).join(' · ')}`}
              </p>
            ))}
          </DocBox>
        ))}
      </div>
    )}

  </div>
);

// ── VisitDocument ─────────────────────────────────────────────────────────────
// The full day: one EncounterBlock per visit. When the patient was seen more
// than once, later encounters sit BELOW the earlier ones behind a dated
// "Review" stamp instead of having their records mixed together. One signature
// closes the whole document. Used by the tab, the slide-over AND print.
// Doctor for ONE encounter — first attributed record within it. GLP-1 review
// clinician counts only when it's a doctor (nurses run some monitoring visits).
const encounterDoctor = (r) =>
  r.notes[0]?.doctorName ||
  r.plans[0]?.doctorName ||
  r.exams[0]?.doctorName ||
  r.prescriptions[0]?.doctorName ||
  r.prescriptions[0]?.doctor?.name ||
  (r.glp1Reviews?.[0]?.clinicianRole === 'doctor' ? r.glp1Reviews[0].clinicianName : null) ||
  null;

// Mobile day-tab dropdown. A custom menu (not a native <select>) so the option
// list always opens BELOW the box — native pickers position wherever the OS
// likes, including over the content above.
const DayTabSelect = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const current = options.find((o) => o.id === value) || options[0];
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-semibold text-gray-800 bg-white focus:outline-none focus:border-primary"
      >
        <span>{current.label}{current.count != null ? ` (${current.count})` : ''}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-base border-b border-gray-100 last:border-0 ${
                o.id === value ? 'bg-blue-50 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.label}{o.count != null ? ` (${o.count})` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const VisitDocument = ({ records, fullExamCache }) => {
  const encounters = splitEncounters(records);

  // Day-level fallback when a single encounter carries no attribution.
  const dayDoctor = encounterDoctor(records);

  return (
    <div className="space-y-5 select-text">
      {encounters.map((enc, i) => {
        const doctor = encounterDoctor(enc.records) || dayDoctor;
        return (
          <div key={enc.start || i} className="space-y-5">
            {/* Encounter stamp — dated, timed and attributed. The per-record
                "By Dr. X" lines were removed in favour of this one stamp. */}
            <div className={`flex items-center gap-3 ${i > 0 ? 'pt-2' : ''}`}>
              <div className="flex-1 min-w-4 border-t-2 border-blue-200" />
              {/* min-w-0 + wrap: on narrow screens the stamp folds to two lines
                  inside the divider instead of overflowing and being clipped. */}
              <span className="min-w-0 max-w-full text-center px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-700 uppercase tracking-wide break-words">
                {i === 0 ? 'Visit' : 'Review'}
                {enc.start
                  ? ` · ${new Date(enc.start).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} · ${fmtTime(enc.start)}`
                  : i > 0 ? ` ${i + 1}` : ''}
                {doctor ? ` · By ${doctor}` : ''}
              </span>
              <div className="flex-1 min-w-4 border-t-2 border-blue-200" />
            </div>
            <EncounterBlock records={enc.records} fullExamCache={fullExamCache} />

            {/* Signature — closes EACH encounter with its own doctor. */}
            {doctor && (
              <div className="pt-3 border-t border-gray-300">
                <p className="text-sm text-gray-700">Examined by:</p>
                <div className="w-64 border-b border-gray-400 mt-10 mb-1.5" />
                <p className="text-sm font-bold text-gray-900">{doctor}</p>
                <p className="text-xs text-gray-600">Diabetes Specialist</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Document footer — once per day document */}
      <div>
        <p className="text-xs text-gray-500">This is a computer-generated report</p>
        <p className="text-xs text-gray-500">CDC Diabetes Clinic · Nairobi, Kenya</p>
      </div>
    </div>
  );
};

// ── Actions tab ───────────────────────────────────────────────────────────────

const ActionRow = ({ icon, iconCls, title, sub, onClick }) => (
  <button onClick={onClick}
    className="w-full flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left">
    <span className="flex items-center gap-3 min-w-0">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCls}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-gray-800 text-sm">{title}</span>
        <span className="block text-xs text-gray-500 truncate">{sub}</span>
      </span>
    </span>
    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
  </button>
);

const ActionsList = ({ records, onView }) => (
  <div className="space-y-2.5">
    {records.admissions.map((a) => (
      <ActionRow key={`adm-${a.id}`}
        icon={<BedDouble className="w-4 h-4" />} iconCls="bg-indigo-50 text-indigo-600"
        title={`Admission advised${a.cancelledAt ? ' (cancelled)' : ''}`}
        sub={[a.admissionType, a.doctorName].filter(Boolean).join(' · ') + ' · view / print note'}
        onClick={() => onView({ type: 'admission', data: a })} />
    ))}
    {(records.referrals || []).map((r) => (
      <ActionRow key={`ref-${r.id}`}
        icon={<Share2 className="w-4 h-4" />} iconCls="bg-sky-50 text-sky-600"
        title={`Referral${r.referralType ? ` (${r.referralType})` : ''}`}
        sub={[r.destination, r.doctorName].filter(Boolean).join(' · ') + ' · view / print note'}
        onClick={() => onView({ type: 'referral', data: r })} />
    ))}
    {records.prescriptions.map((p) => (
      <ActionRow key={`rx-${p.id}`}
        icon={<Pill className="w-4 h-4" />} iconCls="bg-emerald-50 text-emerald-600"
        title="Prescription"
        sub={`${(p.medications || []).length} item${(p.medications || []).length !== 1 ? 's' : ''} · view / reprint`}
        onClick={() => onView({ type: 'prescription', data: p })} />
    ))}
  </div>
);

const ArtifactMeta = ({ patient, sub }) => (
  <div className="border-b border-gray-300 pb-3 mb-4">
    <p className="text-sm text-gray-700"><b>{patient?.name}</b>{patient?.uhid ? ` · ${patient.uhid}` : ''}</p>
    {sub && <p className="text-xs text-gray-500">{sub}</p>}
  </div>
);

// Note viewer for admission and referral actions (prescriptions use the shared
// PrescriptionPrint instead). Both are just a note + a one-line meta, printed on
// the shared clinic letterhead.
const ArtifactModal = ({ artifact, patient, onClose }) => {
  const { printRef, handlePrint } = usePrint();
  if (!artifact) return null;
  const { type, data } = artifact;
  const isReferral = type === 'referral';
  const title = isReferral ? 'Referral Note' : 'Admission Note';
  const sub = isReferral
    ? [data.referralType, data.destination, data.doctorName, fmtDay(data.savedAt)].filter(Boolean).join(' · ')
    : [data.admissionType, data.doctorName, fmtDay(data.savedAt)].filter(Boolean).join(' · ')
        + (data.sent ? ' · sent for admission' : ' · documented only')
        + (data.cancelledAt ? ' · cancelled' : '');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      {/* Capped to the viewport with a scrolling body — long notes scroll inside
          the card instead of overflowing the page. Header + footer stay pinned. */}
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{sub}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0" aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden px-5 py-4 flex-1 min-h-0">
          <div className="whitespace-pre-wrap break-words text-sm text-gray-700 border border-gray-200 rounded-lg p-3 bg-gray-50">{data.note || '—'}</div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 flex-shrink-0 border-t border-gray-100">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50 transition-colors">Close</button>
          <button onClick={handlePrint} className="px-3 py-1.5 rounded text-sm bg-primary text-white flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print</button>
        </div>
      </div>

      {/* Print target — shared clinic letterhead */}
      <PrintRoot printRef={printRef}>
        <ArtifactMeta patient={patient} sub={`${title} · ${sub}`} />
        <p className="text-sm whitespace-pre-wrap">{data.note || '—'}</p>
      </PrintRoot>
    </div>
  );
};

// ── Nursing actions ───────────────────────────────────────────────────────────
// Each nursing task for the day as a clickable row (name + time); clicking opens
// the full task in a modal — the same pattern as the doctor's actions list. The
// modal reuses EncounterBlock (one record at a time) so a task reads identically
// to the doctor's notes.
const NURSING_BLANK = {
  vitals: [], plans: [], assessments: [], exams: [], notes: [], prescriptions: [],
  glp1Injections: [], glp1Reviews: [], glp1WeekNotes: [], nursingNotes: [], admissions: [], referrals: [],
};

const nursingTasks = (records) => {
  const tasks = [];
  (records.vitals || []).forEach((v, i) => tasks.push({
    key: `v-${v.id ?? i}`, ts: v.recordedAt, Icon: Activity, title: 'Triage vitals',
    records: { ...NURSING_BLANK, vitals: [v] },
  }));
  (records.glp1Injections || []).forEach((inj, i) => tasks.push({
    key: `i-${inj.id ?? i}`, ts: inj.administeredDate || inj.createdAt, Icon: Syringe,
    title: `GLP-1 injection — Week ${inj.weekNumber}`,
    records: { ...NURSING_BLANK, glp1Injections: [inj] },
  }));
  (records.glp1Reviews || []).forEach((rev, i) => tasks.push({
    key: `r-${rev.id ?? i}`, ts: rev.date, Icon: ClipboardList,
    title: `GLP-1 monitoring review — Week ${rev.weekNumber}`,
    records: { ...NURSING_BLANK, glp1Reviews: [rev] },
  }));
  (records.glp1WeekNotes || []).forEach((note, i) => tasks.push({
    key: `n-${note.id ?? i}`, ts: note.createdAt, Icon: MessageSquare,
    title: `GLP-1 note — Week ${note.weekNumber}`,
    records: { ...NURSING_BLANK, glp1WeekNotes: [note] },
  }));
  // Nursing notes collapse into ONE timeline entry — the Kardex is a single
  // running record, so the modal lists every entry as a row rather than
  // scattering a separate timeline dot per note.
  // Each nursing note is its own point on the Kardex timeline — the running
  // record of the nurse's interactions. Kept individual (not grouped) so a
  // triage or injection recorded between two notes interleaves by time.
  (records.nursingNotes || []).forEach((note, i) => tasks.push({
    key: `k-${note.id ?? i}`,
    ts: note.createdAt || note.date,
    Icon: FileText,
    title: 'Nursing note',
    records: { ...NURSING_BLANK, nursingNotes: [note] },
  }));
  // Newest action first — the most recent thing the nurse did sits at the top.
  return tasks.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
};

// The full nursing Kardex for a day, rendered INLINE in the day's Nursing tab —
// every nursing action (notes, triage, injections, reviews) in time order, each
// expanded to its full detail, with a Print that uses the clinic letterhead.
const NursingKardexView = ({ records, patient, fullExamCache }) => {
  const { printRef, handlePrint } = usePrint();
  const tasks = nursingTasks(records);
  if (tasks.length === 0) return <p className="text-sm text-gray-500">No nursing actions on this day.</p>;
  const fmtT = (ts) => (ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');
  // Each entry is a node on the Kardex timeline: time on the left, a dot beside
  // the entry's section heading, and a connector line running to the next entry.
  // No per-row title — EncounterBlock already opens each record with its own
  // heading, time and author.
  const rows = tasks.map((t, idx) => {
    const isLast = idx === tasks.length - 1;
    return (
      <div key={t.key} className="flex gap-3">
        <div className="w-12 flex-shrink-0 text-right pr-1 text-[11px] text-gray-500 pt-0.5">{fmtT(t.ts)}</div>
        <div className="relative w-4 flex-shrink-0 self-stretch">
          {idx !== 0 && <span className="absolute left-1/2 -translate-x-1/2 top-0 h-2 w-px bg-gray-200" />}
          {!isLast && <span className="absolute left-1/2 -translate-x-1/2 top-2 bottom-0 w-px bg-gray-200" />}
          <span className="absolute left-1/2 top-2 -translate-x-1/2 -translate-y-1/2 z-10 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
        </div>
        <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-6'}`}>
          <EncounterBlock records={t.records} fullExamCache={fullExamCache} showNursingNotes />
        </div>
      </div>
    );
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Nursing Kardex</h4>
        <button onClick={handlePrint} className="px-3 py-1.5 rounded text-sm bg-primary text-white flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print</button>
      </div>
      {rows}

      {/* Print target — shared clinic letterhead; plain stacked entries (no dots) */}
      <PrintRoot printRef={printRef}>
        <ArtifactMeta patient={patient} sub={`Nursing Kardex · ${fmtDay(tasks[0]?.ts)}`} />
        <div className="divide-y divide-gray-200">
          {tasks.map((t) => (
            <div key={t.key} className="py-3 first:pt-0 last:pb-0">
              <EncounterBlock records={t.records} fullExamCache={fullExamCache} showNursingNotes />
            </div>
          ))}
        </div>
      </PrintRoot>
    </div>
  );
};

// ── Visit Timeline ────────────────────────────────────────────────────────────
// One chronological stream of EVERY recorded action in a visit — nursing, doctor
// and dispositions — each time-stamped. (Check-in and billing events live in the
// queue/billing system and aren't fetched into Visit History yet; add a queue-
// history source here to fold them in.) Add a record type below and it appears.
// `by` pulls the author's display name off each record (field names vary by
// type). Triage vitals: `recordedBy` is the joined name of PatientVital.recordedById
// (stamped from the JWT); null on rows recorded before that column existed.
const VISIT_TIMELINE_KINDS = [
  { kind: 'note',          type: 'notes',          ts: 'date',             Icon: MessageSquare, title: "Doctor's note",     by: (r) => r.doctorName },
  { kind: 'assessment',    type: 'assessments',    ts: 'date',             Icon: ClipboardList, title: 'Assessment',        by: (r) => r.doctorName },
  { kind: 'exam',          type: 'exams',          ts: 'date',             Icon: Stethoscope,   title: 'Physical exam',     by: (r) => r.doctorName },
  { kind: 'plan',          type: 'plans',          ts: 'date',             Icon: Target,        title: 'Treatment plan',    by: (r) => r.doctorName },
  { kind: 'prescription',  type: 'prescriptions',  ts: 'createdAt',        Icon: Pill,          title: 'Prescription',      by: (r) => r.doctorName },
  { kind: 'admission',     type: 'admissions',     ts: 'requestedAt',      Icon: BedDouble,     title: 'Admission advised', by: (r) => r.doctorName },
  { kind: 'referral',      type: 'referrals',      ts: 'savedAt',          Icon: Share2,        title: 'Referral',          by: (r) => r.doctorName },
  { kind: 'vitals',        type: 'vitals',         ts: 'recordedAt',       Icon: Activity,      title: 'Triage vitals',     by: (r) => r.recordedBy },
  { kind: 'nursingNote',   type: 'nursingNotes',   ts: 'createdAt',        Icon: FileText,      title: 'Nursing note',      by: (r) => r.authorName },
  { kind: 'glp1Injection', type: 'glp1Injections', ts: 'administeredDate', Icon: Syringe,       title: 'GLP-1 injection',   by: (r) => r.clinicianName || r.doctorName },
  { kind: 'glp1Review',    type: 'glp1Reviews',    ts: 'date',             Icon: ClipboardList, title: 'GLP-1 review',      by: (r) => r.clinicianName || r.doctorName },
  { kind: 'glp1WeekNote',  type: 'glp1WeekNotes',  ts: 'createdAt',        Icon: MessageSquare, title: 'GLP-1 note',        by: (r) => r.authorName },
];

const visitTimelineTasks = (records) => {
  const items = [];
  VISIT_TIMELINE_KINDS.forEach(({ kind, type, ts, Icon, title, by }) => {
    (records[type] || []).forEach((r, i) => {
      // DATEONLY columns (notes.date, plans.date, administeredDate, …) parse as
      // midnight UTC — 3:00 AM in Nairobi. For those, rebuild the moment from the
      // date + the record's own clock-time string (recordTs, as the day document
      // does), falling back to createdAt. Full datetimes pass through untouched.
      const raw = r[ts];
      const isDateOnly = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw);
      const when = !raw ? (r.createdAt || null)
        : !isDateOnly ? raw
        : r.time ? recordTs(r, ts)
        : (r.createdAt || recordTs(r, ts));
      items.push({
        key: `${kind}-${r.id ?? i}`,
        ts: when,
        Icon, title, kind, raw: r,
        by: (by && by(r)) || null,
        records: { ...NURSING_BLANK, [type]: [r] },
      });
    });
  });
  // Queue workflow milestones (check-in, triage done, seen by doctor, completed) —
  // informational markers, not clickable records.
  (records.workflow || []).forEach((w, i) => items.push({
    key: `wf-${w.id ?? i}`,
    ts: w.ts,
    Icon: Clock,
    title: w.label,
    kind: 'workflow',
  }));
  // Newest action first — the most recent thing that happened sits at the top.
  return items.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
};

// Doctor's notes are paged by the API (default 20 per page). Visit History is
// now the ONLY place the full note history appears — the patient file no longer
// carries a standalone Doctor's Notes tab — so fetching a single page silently
// hid older notes on long-running patients. Walk every page.
//
// Page 1 reports how many pages exist; the remainder are fetched together.
const NOTES_FETCH_PAGE_SIZE = 100;
// 5000 notes. A guard against a runaway loop, not a limit we expect to reach.
const NOTES_MAX_PAGES = 50;

const fetchAllNotes = async (uhid, getNotes) => {
  const first = await getNotes(uhid, { page: 1, limit: NOTES_FETCH_PAGE_SIZE });
  const notes = [...(first?.notes || [])];

  const totalPages = Math.min(first?.pagination?.totalPages || 1, NOTES_MAX_PAGES);
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        getNotes(uhid, { page: i + 2, limit: NOTES_FETCH_PAGE_SIZE }).catch(() => ({ notes: [] }))
      )
    );
    rest.forEach((r) => notes.push(...(r?.notes || [])));
  }
  return { notes };
};

// Turn queue visit rows into flat, time-stamped workflow milestones for the
// timeline: check-in, triage done, seen by (each) doctor, consultation complete.
const workflowFromVisits = (visits) => {
  const events = [];
  (visits || []).forEach((v) => {
    const add = (suffix, ts, label) => { if (ts) events.push({ id: `${v.id}-${suffix}`, ts, label }); };
    add('in', v.checkedInAt, 'Checked in');
    // triageEndTime is stamped when vitals are saved for the visit; triagedBy is
    // the nurse who opened triage (name snapshot). Null on visits before this
    // was recorded — those show only the vitals record itself.
    add('triage', v.triageEndTime, `Triage completed${v.triagedBy ? ` — ${v.triagedBy}` : ''}`);
    // Nurse → doctor dispatch (the 'Awaiting Doctor' transition). The gap from
    // triage completed to here is time spent with nursing after vitals.
    add('sent', v.sentToDoctorAt, 'Sent to doctor');
    if (v.doctorSessions && v.doctorSessions.length > 0) {
      v.doctorSessions.forEach((s, i) => {
        if (s.startTime) events.push({ id: `${v.id}-doc${i}`, ts: s.startTime, label: s.doctorName ? `Seen by ${s.doctorName}` : 'Seen by doctor' });
      });
    } else {
      add('doc', v.consultationStartTime, 'Seen by doctor');
    }
    add('done', v.consultationEndTime, 'Consultation completed');
    // Referral finalised — referredAt is stamped when the doctor sends the
    // referral. The referral NOTE (if saved) is its own record on the timeline;
    // this marker covers referrals made without one.
    add('ref', v.referredAt, 'Referred');
    // Checkout at billing — dischargedAt is stamped when billing completes the
    // visit (null on legacy rows from before it was recorded).
    add('out', v.dischargedAt, `Checked out at billing${v.dischargedBy ? ` — ${v.dischargedBy}` : ''}`);
  });
  return events;
};

// The day's clinical document (Doctor's Notes tab) with its own Print — the
// document itself is untouched; this just adds the button + letterhead target.
const DoctorNotesView = ({ records, patient, fullExamCache }) => {
  const { printRef, handlePrint } = usePrint();
  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={handlePrint} className="px-3 py-1.5 rounded text-sm bg-primary text-white flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print</button>
      </div>
      <VisitDocument records={records} fullExamCache={fullExamCache} />
      <PrintRoot printRef={printRef}>
        <ArtifactMeta patient={patient} sub="Visit notes" />
        <VisitDocument records={records} fullExamCache={fullExamCache} />
      </PrintRoot>
    </div>
  );
};

// Print-friendly timeline: one line per action (time — what — who). Shared by
// the Timeline tab's print and the master "print visits" layout.
const TimelinePrintList = ({ records }) => {
  const items = visitTimelineTasks(records);
  const fmtT = (ts) => (ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—');
  return (
    <table className="w-full text-sm">
      <tbody>
        {items.map((t) => (
          <tr key={t.key} className="border-b border-gray-100 last:border-0">
            <td className="py-1 pr-3 whitespace-nowrap text-gray-500 align-top w-20">{fmtT(t.ts)}</td>
            <td className="py-1 pr-3 font-semibold text-gray-800 align-top">{t.title}</td>
            <td className="py-1 text-gray-500 align-top">{t.by || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// The whole-visit timeline: every action as a dot on one connected line. Clicking
// a clinical/nursing entry opens its detail; dispositions (prescription, admission,
// referral) reuse the shared action viewers so nothing is rendered twice.
const VisitTimeline = ({ records, patient, onViewRecord, onViewArtifact }) => {
  const { printRef, handlePrint } = usePrint();
  const items = visitTimelineTasks(records);
  if (items.length === 0) return <p className="text-sm text-gray-500">No recorded actions on this day.</p>;
  const fmtT = (ts) => (ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');
  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={handlePrint} className="px-3 py-1.5 rounded text-sm bg-primary text-white flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print</button>
      </div>
      {/* Print target — the same timeline as a plain time/action/name list */}
      <PrintRoot printRef={printRef}>
        <ArtifactMeta patient={patient} sub={`Visit timeline · ${fmtDay(items[items.length - 1]?.ts)}`} />
        <TimelinePrintList records={records} />
      </PrintRoot>
      {items.map((t, idx) => {
        const Icon = t.Icon;
        const isLast = idx === items.length - 1;
        const isWorkflow = t.kind === 'workflow';
        return (
          <div key={t.key} className="flex items-center gap-3">
            <div className="w-12 flex-shrink-0 text-right pr-1 text-[11px] text-gray-500">{fmtT(t.ts)}</div>
            <div className="relative self-stretch w-4 flex-shrink-0">
              {idx !== 0 && <span className="absolute left-1/2 -translate-x-1/2 top-0 h-1/2 w-px bg-gray-200" />}
              {!isLast && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-1/2 w-px bg-gray-200" />}
              <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-2.5 h-2.5 rounded-full ring-4 ring-white ${isWorkflow ? 'bg-gray-300' : 'bg-blue-500'}`} />
            </div>
            {isWorkflow ? (
              // Workflow milestone — an informational marker, not a record to open.
              <div className="flex-1 min-w-0 my-1.5 flex items-center gap-3 border border-dashed border-gray-200 rounded-xl px-4 py-2.5">
                <span className="w-9 h-9 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4" /></span>
                <span className="text-sm font-medium text-gray-500 truncate">{t.title}</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (t.kind === 'prescription' || t.kind === 'admission' || t.kind === 'referral') {
                    onViewArtifact({ type: t.kind, data: t.raw });
                  } else {
                    onViewRecord(t);
                  }
                }}
                className="flex-1 min-w-0 my-1.5 flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4" /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-800 text-sm truncate">{t.title}</span>
                    {t.by && <span className="block text-xs text-gray-400 truncate">{t.by}</span>}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Detail for a single visit-timeline entry (clinical / nursing) — reuses
// EncounterBlock exactly as the day document does.
const RecordDetailModal = ({ item, fullExamCache, onClose }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden px-5 py-4 flex-1 min-h-0">
          <EncounterBlock records={item.records} fullExamCache={fullExamCache} showNursingNotes />
        </div>
        <div className="flex justify-end px-5 py-3 flex-shrink-0 border-t border-gray-100">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

// ── VisitHistoryPanel ─────────────────────────────────────────────────────────
/**
 * Props:
 *   patient      — patient object (must include .uhid)
 *   excludeToday — set true in Consultation.jsx so today's work doesn't appear
 *                  in history (it already lives in the "Today's Consultation" tab)
 *   singleDate   — 'YYYY-MM-DD': show only that visit day as an always-open
 *                  document (no accordion, no filters) — used by the summary
 *                  panel's visit-day slide-over
 *
 * Printing: the Print button prints the current scope — the single visit in
 * singleDate mode, or every visit matching the date-range filter in tab mode.
 */
const VisitHistoryPanel = ({ patient, excludeToday = false, singleDate = null, defaultDayTab = 'notes' }) => {
  const { uhid } = patient;

  const { getAssessmentsByPatient }                      = useInitialAssessmentContext();
  const { getExaminationsByPatient, getExaminationById } = usePhysicalExamContext();
  const { getPlansByPatient }                            = useTreatmentPlanContext();
  const { getPrescriptionsByPatient }                    = usePrescriptionContext();
  const { getNotesByPatient }                            = useConsultationNotesContext();

  const [historyData, setHistoryData]           = useState(null);
  const [historyLoading, setHistoryLoading]     = useState(false);
  const [openHistoryDate, setOpenHistoryDate] = useState(null);
  const [historyFromDate, setHistoryFromDate]   = useState('');
  const [historyToDate, setHistoryToDate]       = useState('');
  const [historyPage, setHistoryPage]           = useState(1);
  const [fullExamCache, setFullExamCache]       = useState({});
  const [printing, setPrinting]                 = useState(false);
  const [dayTab, setDayTab]                      = useState(defaultDayTab); // 'notes' | 'actions' | 'nursing'
  const [viewArtifact, setViewArtifact]         = useState(null);       // { type, data }
  const [viewRecord, setViewRecord]             = useState(null);       // one visit-timeline entry → detail
  // Master print: which sections to include for the filtered visits
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printInclude, setPrintInclude]         = useState({ notes: true, kardex: false, timeline: false });

  const { printRef, handlePrint } = usePrint();

  // Refs so callbacks can read latest state without stale closures
  const historyDataRef   = useRef(historyData);
  const fullExamCacheRef = useRef(fullExamCache);
  useEffect(() => { historyDataRef.current   = historyData;   }, [historyData]);
  useEffect(() => { fullExamCacheRef.current = fullExamCache; }, [fullExamCache]);

  // Fetch all history on mount
  useEffect(() => {
    if (!uhid) return;
    let isMounted = true;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const [assessments, exams, plans, prescriptions, { notes }, vitalsRes, adminsRes, reviewsRes, advisedRes, referralsRes, weekNotesRes, nursingRes, queueRes] = await Promise.all([
          getAssessmentsByPatient(uhid),
          getExaminationsByPatient(uhid),
          getPlansByPatient(uhid),
          getPrescriptionsByPatient(uhid),
          fetchAllNotes(uhid, getNotesByPatient),
          patientService.getVitalsHistory(uhid).catch(() => ({ success: false, data: [] })),
          // GLP-1 injections, monitoring reviews and week notes — all support uhid directly
          glp1Service.getAdministrations({ uhid }).catch(() => ({ data: { administrations: [] } })),
          glp1Service.getReviews({ uhid }).catch(() => ({ data: { reviews: [] } })),
          inpatientService.advisedAdmissions(uhid).catch(() => ({ data: { admissions: [] } })),
          queueService.advisedReferrals(uhid).catch(() => ({ data: { referrals: [] } })),
          glp1Service.getWeekNotes({ uhid }).catch(() => ({ data: { notes: [] } })),
          nursingNoteService.getByPatient(uhid).catch(() => ({ data: { nursingNotes: [] } })),
          queueService.patientHistory(uhid).catch(() => ({ data: { visits: [] } })),
        ]);
        if (isMounted) {
          const vitals         = vitalsRes?.success ? (vitalsRes.data || []) : [];
          const glp1Injections = adminsRes?.data?.administrations  || [];
          const glp1Reviews    = reviewsRes?.data?.reviews         || [];
          // Per-visit weight change: the delta from the previous review that
          // carried a weight, computed across the whole ordered series so each
          // record can show how the patient moved since they were last weighed.
          {
            let prevWeight = null;
            [...glp1Reviews]
              .sort((a, b) => (a.reviewDate || '').localeCompare(b.reviewDate || '') || (a.id - b.id))
              .forEach(r => {
                if (r.weight != null && prevWeight != null) r.weightChange = Number(r.weight) - prevWeight;
                if (r.weight != null) prevWeight = Number(r.weight);
              });
          }
          const admissions     = advisedRes?.data?.admissions      || [];
          const referrals      = referralsRes?.data?.referrals     || [];
          const glp1WeekNotes  = weekNotesRes?.data?.notes          || [];
          const nursingNotes   = nursingRes?.data?.nursingNotes     || [];
          const workflow       = workflowFromVisits(queueRes?.data?.visits);
          setHistoryData({
            assessments:     Array.isArray(assessments)     ? assessments     : [],
            exams:           Array.isArray(exams)           ? exams           : [],
            plans:           Array.isArray(plans)           ? plans           : [],
            prescriptions:   Array.isArray(prescriptions)   ? prescriptions   : [],
            notes:           Array.isArray(notes)           ? notes           : [],
            vitals:          Array.isArray(vitals)          ? vitals          : [],
            glp1Injections:  Array.isArray(glp1Injections)  ? glp1Injections  : [],
            glp1Reviews:     Array.isArray(glp1Reviews)     ? glp1Reviews     : [],
            admissions:      Array.isArray(admissions)      ? admissions      : [],
            referrals:       Array.isArray(referrals)       ? referrals       : [],
            glp1WeekNotes:   Array.isArray(glp1WeekNotes)   ? glp1WeekNotes   : [],
            nursingNotes:    Array.isArray(nursingNotes)    ? nursingNotes    : [],
            workflow:        Array.isArray(workflow)        ? workflow        : [],
            // Raw queue visit rows (with status + dischargedAt) — used to tell an
            // ongoing, un-checked-out episode from closed dated visits. Not a
            // clinical record type, so it stays out of DATE_FIELD_MAP.
            visits:          Array.isArray(queueRes?.data?.visits) ? queueRes.data.visits : [],
          });
        }
      } finally {
        if (isMounted) setHistoryLoading(false);
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [
    uhid,
    getAssessmentsByPatient, getExaminationsByPatient,
    getPlansByPatient, getPrescriptionsByPatient, getNotesByPatient,
  ]);

  // Reset to page 1 when filters change
  useEffect(() => { setHistoryPage(1); }, [historyFromDate, historyToDate]);

  // Collect unique visit dates — driven by DATE_FIELD_MAP so adding a new type
  // only requires one config entry, not a change here
  const visitDates = useMemo(() => {
    if (!historyData) return [];
    const today   = new Date().toISOString().slice(0, 10);
    const dateSet = new Set();
    Object.entries(DATE_FIELD_MAP).forEach(([key, field]) => {
      (historyData[key] || []).forEach(r => {
        const day = (r[field] || r.createdAt || '').slice(0, 10);
        if (day && !(excludeToday && day === today)) dateSet.add(day);
      });
    });
    return [...dateSet]
      .sort((a, b) => b.localeCompare(a))
      .filter(d => (!singleDate || d === singleDate))
      .filter(d => (!historyFromDate || d >= historyFromDate) && (!historyToDate || d <= historyToDate));
  }, [historyData, historyFromDate, historyToDate, excludeToday, singleDate]);

  // Get all records belonging to a specific date — also config-driven
  const getRecordsForDate = useCallback((date) =>
    Object.fromEntries(
      Object.entries(DATE_FIELD_MAP).map(([key, field]) => [
        key,
        (historyData?.[key] || []).filter(r =>
          (r[field] || r.createdAt || '').slice(0, 10) === date
        ),
      ])
    ),
  [historyData]);

  // The current OPEN episode. A queue visit still in progress has a status other
  // than Completed/Removed — and the queue allows only one at a time. Legacy
  // visits predate the discharge stamp but were Completed, so they are correctly
  // NOT treated as open. Its check-in day anchors the ongoing group.
  const openStartDay = useMemo(() => {
    const open = (historyData?.visits || []).find(
      v => v.status && !['Completed', 'Removed'].includes(v.status)
    );
    return open?.checkedInAt ? String(open.checkedInAt).slice(0, 10) : null;
  }, [historyData]);

  // Display groups. When the patient has not been checked out, every record date
  // on/after that visit's check-in collapses into ONE ongoing card instead of a
  // card per day — a patient sitting in the queue for days is one ongoing visit,
  // not several. Closed/legacy dated visits are left exactly as they were.
  const visitGroups = useMemo(() => {
    if (!openStartDay) return visitDates.map(d => ({ key: d, dates: [d], ongoing: false }));
    const ongoingDates = visitDates.filter(d => d >= openStartDay);
    const legacyDates  = visitDates.filter(d => d <  openStartDay);
    const groups = [];
    if (ongoingDates.length) {
      groups.push({ key: '__ongoing__', dates: ongoingDates, ongoing: true, since: openStartDay });
    }
    legacyDates.forEach(d => groups.push({ key: d, dates: [d], ongoing: false }));
    return groups;
  }, [visitDates, openStartDay]);

  // Merge one or more days into a single record bucket. A normal day is itself;
  // the ongoing episode spans every day since check-in.
  const getRecordsForGroup = useCallback((dates) => {
    if (dates.length === 1) return getRecordsForDate(dates[0]);
    const merged = Object.fromEntries(Object.keys(DATE_FIELD_MAP).map(k => [k, []]));
    dates.forEach(d => {
      const recs = getRecordsForDate(d);
      Object.keys(merged).forEach(k => { merged[k] = merged[k].concat(recs[k] || []); });
    });
    return merged;
  }, [getRecordsForDate]);

  // Lazily fetch full exam data for a date's exams (used on expand and print)
  const fetchExamsForDate = useCallback((date) => {
    if (!historyDataRef.current) return [];
    return (historyDataRef.current.exams || [])
      .filter(e => (e.date || e.createdAt || '').slice(0, 10) === date)
      .filter(exam => !fullExamCacheRef.current[exam.id])
      .map(exam =>
        getExaminationById(exam.id)
          .then(full => setFullExamCache(c => ({ ...c, [exam.id]: full || 'error' })))
          .catch(() => setFullExamCache(c => ({ ...c, [exam.id]: 'error' })))
      );
  }, [getExaminationById]);

  // Open/close a date accordion — only one open at a time
  // Open/close a display group (a single day, or the ongoing multi-day episode).
  const toggleHistoryGroup = useCallback((group) => {
    setDayTab(defaultDayTab); // newly-opened group starts on the default tab
    setOpenHistoryDate(prev => {
      const isOpening = prev !== group.key;
      if (isOpening) group.dates.forEach(d => fetchExamsForDate(d));
      return isOpening ? group.key : null;
    });
  }, [fetchExamsForDate]);

  // Single-date mode: prefetch that day's exams once data arrives
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (singleDate && historyData && !didAutoOpen.current) {
      didAutoOpen.current = true;
      fetchExamsForDate(singleDate);
    }
  }, [singleDate, historyData, fetchExamsForDate]);

  // Print the current scope: the single visit, or all filtered visits.
  // Exam details are fetched for every printed date first so nothing prints
  // as "Loading…".
  const printVisits = useCallback(async () => {
    setPrinting(true);
    try {
      await Promise.all(visitDates.flatMap(d => fetchExamsForDate(d)));
      // Let the cache state flush into the print DOM before printing
      await new Promise(r => setTimeout(r, 150));
      handlePrint();
    } finally {
      setPrinting(false);
    }
  }, [visitDates, fetchExamsForDate, handlePrint]);

  const formatDateLong = (date) =>
    new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  const totalPages      = Math.ceil(visitGroups.length / HISTORY_PAGE_SIZE);
  const paginatedGroups = visitGroups.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  // One day's body — the Notes/Actions toggle plus either the record document or
  // the actions list. Shared by the tab's accordion AND the summary panel's
  // single-day slide-over (singleDate mode) so the two never drift: opening a day
  // from the summary is identical to expanding it in the Visit History tab.
  const renderDayBody = (records) => {
    const actionCount =
      records.admissions.length + (records.referrals || []).length + records.prescriptions.length;
    const nursingCount = (records.vitals?.length || 0) + (records.glp1Injections?.length || 0)
      + (records.glp1WeekNotes?.length || 0) + (records.glp1Reviews?.length || 0)
      + (records.nursingNotes?.length || 0);
    const clinicalCount =
      records.notes.length + records.assessments.length + records.exams.length + records.plans.length;
    const workflowCount = records.workflow?.length || 0;
    const timelineCount = clinicalCount + actionCount + nursingCount + workflowCount;
    const showTabs = actionCount > 0 || nursingCount > 0 || workflowCount > 0;
    return (
      <>
        {/* Narrow screens: the tab pills wrap into rows, so collapse them into
            one dropdown. ≥sm keeps the pill row. */}
        {showTabs && (
          <div className="sm:hidden mb-4">
            <DayTabSelect
              value={dayTab}
              onChange={setDayTab}
              options={[
                { id: 'notes', label: "Doctor's Notes" },
                ...(actionCount > 0 ? [{ id: 'actions', label: 'Actions', count: actionCount }] : []),
                ...(nursingCount > 0 ? [{ id: 'nursing', label: 'Nursing', count: nursingCount }] : []),
                { id: 'timeline', label: 'Visit Timeline', count: timelineCount },
              ]}
            />
          </div>
        )}
        {showTabs && (
          <div className="hidden sm:block mb-4">
            <SwitcherTabs
              active={dayTab}
              onChange={setDayTab}
              tabs={[
                { id: 'notes', label: "Doctor's Notes", Icon: MessageSquare },
                ...(actionCount > 0 ? [{ id: 'actions', label: 'Actions', Icon: ClipboardList, count: actionCount }] : []),
                ...(nursingCount > 0 ? [{ id: 'nursing', label: 'Nursing', Icon: Activity, count: nursingCount }] : []),
                { id: 'timeline', label: 'Visit Timeline', Icon: Clock, count: timelineCount },
              ]}
            />
          </div>
        )}
        {dayTab === 'timeline' && timelineCount > 0 ? (
          <VisitTimeline records={records} patient={patient} onViewRecord={setViewRecord} onViewArtifact={setViewArtifact} />
        ) : dayTab === 'actions' && actionCount > 0 ? (
          <ActionsList records={records} onView={setViewArtifact} />
        ) : dayTab === 'nursing' && nursingCount > 0 ? (
          <NursingKardexView records={records} patient={patient} fullExamCache={fullExamCache} />
        ) : (
          <DoctorNotesView records={records} patient={patient} fullExamCache={fullExamCache} />
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">

      {/* Date range filters + print scope — hidden in single-date mode */}
      <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm ${singleDate ? 'hidden' : ''}`}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={historyFromDate}
              onChange={e => setHistoryFromDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={historyToDate}
              onChange={e => setHistoryToDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          {(historyFromDate || historyToDate) && (
            <button
              onClick={() => { setHistoryFromDate(''); setHistoryToDate(''); }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Clear
            </button>
          )}
          {/* Print — whole history, or just the visits matching the date filter.
              Opens a chooser: doctor's notes / nursing Kardex / timeline. */}
          {visitDates.length > 0 && (
            <button
              onClick={() => setShowPrintOptions(true)}
              disabled={printing}
              className="px-3 py-1.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              {printing ? 'Preparing…' : `Print ${visitGroups.length} visit${visitGroups.length !== 1 ? 's' : ''}`}
            </button>
          )}
          {historyData && (
            <p className="text-xs text-gray-400 ml-auto self-center">
              {visitGroups.length} visit{visitGroups.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>

      {/* Single-date mode: print action for this visit */}
      {singleDate && !historyLoading && historyData && visitDates.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={printVisits}
            disabled={printing}
            className="px-3 py-1.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'Preparing…' : 'Print visit'}
          </button>
        </div>
      )}

      {/* Loading */}
      {historyLoading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <svg className="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading visit history...
        </div>
      )}

      {/* Empty state */}
      {!historyLoading && historyData && visitDates.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          {(historyFromDate || historyToDate) ? (
            <>
              <p className="text-gray-500 text-lg font-medium">No visits found</p>
              <p className="text-sm text-gray-400 mt-1">No visits match the selected date range.</p>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-lg font-medium">No visits recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">No visit history has been recorded for this patient.</p>
            </>
          )}
        </div>
      )}

      {/* Single-date mode: one day, open — the same body as an expanded day in the
          tab (Notes/Actions and all), just without the accordion chrome. */}
      {singleDate && !historyLoading && historyData && visitDates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          {renderDayBody(getRecordsForDate(singleDate))}
        </div>
      )}

      {/* Tab mode: visit accordions — one per closed day, one for the ongoing episode */}
      {!singleDate && !historyLoading && paginatedGroups.map(group => {
        const records = getRecordsForGroup(group.dates);
        const isOpen  = openHistoryDate === group.key;
        // Workflow milestones are visit events, not saved records — excluded from
        // the "N records" count (they still appear on the Visit Timeline).
        const total   = Object.entries(records).reduce((sum, [k, arr]) => sum + (k === 'workflow' ? 0 : arr.length), 0);

        // Per-type header summary: e.g. "1 doctor's note · 1 admission · 1 referral · 1 prescription".
        const noteCount = records.notes.length;
        const admCount  = records.admissions.length;
        const refCount  = (records.referrals || []).length;
        const rxCount   = records.prescriptions.length;
        const parts = [
          noteCount && `${noteCount} doctor's note${noteCount !== 1 ? 's' : ''}`,
          admCount  && `${admCount} admission${admCount !== 1 ? 's' : ''}`,
          refCount  && `${refCount} referral${refCount !== 1 ? 's' : ''}`,
          rxCount   && `${rxCount} prescription${rxCount !== 1 ? 's' : ''}`,
        ].filter(Boolean);
        const summary = parts.length ? parts.join(' · ') : `${total} record${total !== 1 ? 's' : ''}`;
        const HeaderIcon = group.ongoing ? Clock : Calendar;

        return (
          <div key={group.key} className={`bg-white border rounded-xl overflow-hidden shadow-sm ${group.ongoing ? 'border-amber-300' : 'border-gray-200'}`}>

            {/* Header row */}
            <button
              onClick={() => toggleHistoryGroup(group)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <HeaderIcon className={`w-5 h-5 flex-shrink-0 ${group.ongoing ? 'text-amber-500' : isOpen ? 'text-primary' : 'text-gray-400'}`} />
                <span className={`font-semibold ${isOpen ? 'text-primary' : 'text-gray-800'}`}>
                  {group.ongoing ? 'Current visit — ongoing' : formatDateLong(group.dates[0])}
                </span>
                {group.ongoing && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 whitespace-nowrap font-semibold">
                    Not checked out
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                  {summary}
                </span>
              </div>
              {isOpen
                ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              }
            </button>

            {group.ongoing && (
              <p className="px-5 -mt-2 pb-2 text-xs text-gray-400">
                Checked in {formatDateLong(group.since)} · still in the clinic, not yet checked out
              </p>
            )}

            {/* Expanded — Doctor's Notes | Actions (Actions tab only when there are any) */}
            {isOpen && (
              <div className="border-t border-gray-100 p-5">
                {renderDayBody(records)}
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {!singleDate && !historyLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Page {historyPage} of {totalPages} · {visitGroups.length} visit{visitGroups.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-blue-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
              disabled={historyPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-blue-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Hidden print layout — letterhead + patient meta + visits in scope.
             Positioned off-screen (NOT zero-height: a 0-height ancestor makes
             Chrome emit a blank first page via react-to-print). ────────────── */}
      <div className="fixed top-0 -left-[10000px] w-[210mm] bg-white" aria-hidden="true">
        <div ref={printRef} className="p-8 bg-white">
          <PrintLetterhead show />
          <div className="border-b border-gray-300 pb-3 mb-5">
            <p className="text-sm text-gray-700">
              Visit history — <b>{patient?.name}</b>
              {patient?.uhid ? ` · ${patient.uhid}` : ''}
              {patient?.dateOfBirth ? ` · DOB: ${new Date(patient.dateOfBirth).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
            </p>
            <p className="text-xs text-gray-500">
              Printed {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}{visitGroups.length} visit{visitGroups.length !== 1 ? 's' : ''}
              {(historyFromDate || historyToDate) && ` · ${historyFromDate || '…'} → ${historyToDate || '…'}`}
            </p>
          </div>
          {visitGroups.map(group => {
            const recs = getRecordsForGroup(group.dates);
            const kardexTasks = printInclude.kardex ? nursingTasks(recs) : [];
            return (
              <div key={group.key} className="mb-6" style={{ breakInside: 'avoid' }}>
                <h2 className="text-base font-bold text-gray-800 border-b border-gray-300 pb-1 mb-3">
                  {group.ongoing
                    ? `Current visit — ongoing (checked in ${formatDateLong(group.since)}, not checked out)`
                    : formatDateLong(group.dates[0])}
                </h2>
                {printInclude.notes && (
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Doctor's notes</h3>
                    <VisitDocument records={recs} fullExamCache={fullExamCache} />
                  </div>
                )}
                {printInclude.kardex && kardexTasks.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Nursing Kardex</h3>
                    <div className="divide-y divide-gray-200">
                      {kardexTasks.map((t) => (
                        <div key={t.key} className="py-3 first:pt-0 last:pb-0">
                          <EncounterBlock records={t.records} fullExamCache={fullExamCache} showNursingNotes />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {printInclude.timeline && (
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Visit timeline</h3>
                    <TimelinePrintList records={recs} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Master print chooser — what to include for the filtered visits ── */}
      {showPrintOptions && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowPrintOptions(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Print visits</h3>
              <button onClick={() => setShowPrintOptions(false)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-sm text-gray-500 mb-2">
                Include for {visitGroups.length} visit{visitGroups.length !== 1 ? 's' : ''}
                {(historyFromDate || historyToDate) ? ' in the filtered range' : ''}:
              </p>
              {[
                ['notes',    "Doctor's notes"],
                ['kardex',   'Nursing Kardex'],
                ['timeline', 'Visit timeline'],
              ].map(([key, label]) => (
                <label key={key} className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  printInclude[key] ? 'bg-blue-50 border-blue-300 text-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                }`}>
                  <input
                    type="checkbox"
                    checked={printInclude[key]}
                    onChange={() => setPrintInclude((p) => ({ ...p, [key]: !p[key] }))}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowPrintOptions(false)} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50 transition-colors">Cancel</button>
              <button
                onClick={() => { setShowPrintOptions(false); printVisits(); }}
                disabled={!printInclude.notes && !printInclude.kardex && !printInclude.timeline}
                className="px-3 py-1.5 rounded text-sm bg-primary text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions artifact viewer. Prescriptions use the shared PrescriptionPrint
          (same format as the consultation); admissions use the note viewer. */}
      {viewArtifact?.type === 'prescription' ? (
        <PrescriptionPrint prescription={viewArtifact.data} onClose={() => setViewArtifact(null)} />
      ) : (
        <ArtifactModal artifact={viewArtifact} patient={patient} onClose={() => setViewArtifact(null)} />
      )}

      {/* Nursing task viewer — one task, full detail, in the shared document style */}
      <RecordDetailModal item={viewRecord} fullExamCache={fullExamCache} onClose={() => setViewRecord(null)} />

    </div>
  );
};

export default VisitHistoryPanel;
