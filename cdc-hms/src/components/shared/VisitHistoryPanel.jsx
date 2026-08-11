import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar, ChevronDown, ChevronRight, Printer, X,
  Activity, Target, FileEdit, Stethoscope, MessageSquare, Pill, Syringe, ClipboardList,
  BedDouble,
} from 'lucide-react';
import usePrint from '../../hooks/usePrint';
import PrintLetterhead from './PrintLetterhead';
import patientService from '../../services/patientService';
import inpatientService from '../../services/inpatientService';
import glp1Service from '../../services/glp1Service';
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
  assessments:     'createdAt',
  exams:           'date',
  notes:           'date',
  prescriptions:   'createdAt',
  // GLP-1 injections: administeredDate is set for 'given', createdAt used as
  // fallback for missed/omitted (the r[field] || r.createdAt pattern below)
  glp1Injections:  'administeredDate',
  // GLP-1 monitoring reviews written by any clinician (nurse or doctor)
  glp1Reviews:     'date',
  // Advised admissions (doctor's admission note from OPD) — an "action", not part
  // of the clinical document; rendered in the day's Actions tab.
  admissions:      'requestedAt',
};

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const HISTORY_PAGE_SIZE = 10;

// ── Small read-only helpers ───────────────────────────────────────────────────
const SectionHeader = ({ icon, label }) => (
  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
    {icon}
    {label}
  </h4>
);

const DocBox = ({ children }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2 last:mb-0 text-sm text-gray-700">
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
const EncounterBlock = ({ records, fullExamCache }) => (
  <div className="space-y-5 select-text">

    {/* Triage Vitals — plain label: value lines */}
    {records.vitals.length > 0 && (
      <div>
        <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} label="Triage Vitals" />
        {records.vitals.map((v, idx) => (
          <DocBox key={idx}>
            {v.recordedAt && (
              <p className="text-xs text-gray-500 mb-1">Recorded {fmtTime(v.recordedAt)}</p>
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
              {[
                ['History of Present Illness', a.historyOfPresentIllness],
                ['Past Medical History', a.pastMedicalHistory],
                ['Family History', a.familyHistory],
                ['Social History', a.socialHistory],
                ['Review of Systems', a.reviewOfSystems],
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
                ['Weight', rev.weight && `${rev.weight} kg`], ['BMI', rev.bmi],
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
              <div className="flex-1 border-t-2 border-blue-200" />
              <span className="flex-shrink-0 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-700 uppercase tracking-wide">
                {i === 0 ? 'Visit' : 'Review'}
                {enc.start
                  ? ` · ${new Date(enc.start).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} · ${fmtTime(enc.start)}`
                  : i > 0 ? ` ${i + 1}` : ''}
                {doctor ? ` · By ${doctor}` : ''}
              </span>
              <div className="flex-1 border-t-2 border-blue-200" />
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
const escHtml = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const dayTabCls = (active) =>
  `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
    active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'
  }`;

// Print an artifact on a letterhead in a new window (same approach as the Admit
// modal's print, so admission notes print identically from either place).
const printArtifact = (title, innerHtml) => {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${escHtml(title)}</title>
    <style>body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;padding:40px;color:#111}
    h1{font-size:20px;margin:0 0 2px}.sub{color:#555;font-size:13px}hr{border:none;border-top:1px solid #ccc;margin:16px 0}
    .label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666;margin-top:16px}
    .val{font-size:14px;margin-top:3px}.note{white-space:pre-wrap;font-size:14px;line-height:1.55}</style>
    </head><body><h1>Comprehensive Diabetes Centre</h1>${innerHtml}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
};

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
    {records.prescriptions.map((p) => (
      <ActionRow key={`rx-${p.id}`}
        icon={<Pill className="w-4 h-4" />} iconCls="bg-emerald-50 text-emerald-600"
        title="Prescription"
        sub={`${(p.medications || []).length} item${(p.medications || []).length !== 1 ? 's' : ''} · view / reprint`}
        onClick={() => onView({ type: 'prescription', data: p })} />
    ))}
  </div>
);

const ArtifactModal = ({ artifact, patient, onClose }) => {
  if (!artifact) return null;
  const { type, data } = artifact;
  const meta = `${escHtml(patient?.name)} &middot; ${escHtml(patient?.uhid)}`;

  let title, body, printInner;
  if (type === 'admission') {
    title = 'Admission Note';
    printInner =
      `<div class="sub">Admission Note</div><hr/>
       <div class="val"><strong>${meta}</strong></div>
       <div class="sub">${escHtml(fmtDay(data.requestedAt))}${data.doctorName ? ' &middot; ' + escHtml(data.doctorName) : ''}</div>
       <div class="label">Admission type</div><div class="val">${escHtml(data.admissionType)}</div>
       <div class="label">Admission note</div><div class="note">${escHtml(data.note)}</div>`;
    body = (
      <>
        <p className="text-sm text-gray-500">
          {[data.admissionType, data.doctorName, fmtDay(data.requestedAt)].filter(Boolean).join(' · ')}
          {data.cancelledAt ? ' · cancelled' : ''}
        </p>
        <div className="whitespace-pre-wrap text-sm text-gray-700 mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50">{data.note || '—'}</div>
      </>
    );
  } else {
    title = 'Prescription';
    const meds = data.medications || [];
    const line = (m) => [m.dosage, m.frequency, m.quantity && `Qty: ${m.quantity}`].filter(Boolean).join(' · ');
    printInner =
      `<div class="sub">Prescription</div><hr/>
       <div class="val"><strong>${meta}</strong></div>
       <div class="sub">${escHtml(fmtDay(data.createdAt))}</div>
       <div class="label">Medications</div>` +
      meds.map((m) => `<div class="val">&bull; <strong>${escHtml(m.name)}</strong>${line(m) ? ' — ' + escHtml(line(m)) : ''}</div>`).join('');
    body = (
      <div className="space-y-1.5 mt-2">
        {meds.map((m, i) => (
          <div key={i} className="text-sm text-gray-700">
            <b className="font-semibold text-gray-800">{m.name}</b>{line(m) ? ` — ${line(m)}` : ''}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {body}
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50 transition-colors">Close</button>
          <button onClick={() => printArtifact(title, printInner)} className="px-3 py-1.5 rounded text-sm bg-primary text-white flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print</button>
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
const VisitHistoryPanel = ({ patient, excludeToday = false, singleDate = null }) => {
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
  const [dayTab, setDayTab]                      = useState('notes');   // 'notes' | 'actions'
  const [viewArtifact, setViewArtifact]         = useState(null);       // { type, data }

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
        const [assessments, exams, plans, prescriptions, { notes }, vitalsRes, adminsRes, reviewsRes, advisedRes] = await Promise.all([
          getAssessmentsByPatient(uhid),
          getExaminationsByPatient(uhid),
          getPlansByPatient(uhid),
          getPrescriptionsByPatient(uhid),
          getNotesByPatient(uhid),
          patientService.getVitalsHistory(uhid).catch(() => ({ success: false, data: [] })),
          // GLP-1 injections and monitoring reviews — both support uhid directly
          glp1Service.getAdministrations({ uhid }).catch(() => ({ data: { administrations: [] } })),
          glp1Service.getReviews({ uhid }).catch(() => ({ data: { reviews: [] } })),
          inpatientService.advisedAdmissions(uhid).catch(() => ({ data: { admissions: [] } })),
        ]);
        if (isMounted) {
          const vitals         = vitalsRes?.success ? (vitalsRes.data || []) : [];
          const glp1Injections = adminsRes?.data?.administrations  || [];
          const glp1Reviews    = reviewsRes?.data?.reviews         || [];
          const admissions     = advisedRes?.data?.admissions      || [];
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
  const toggleHistoryDate = useCallback((date) => {
    setDayTab('notes'); // every newly-opened day starts on Doctor's Notes
    setOpenHistoryDate(prev => {
      const isOpening = prev !== date;
      if (isOpening) fetchExamsForDate(date);
      return isOpening ? date : null;
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

  const totalPages     = Math.ceil(visitDates.length / HISTORY_PAGE_SIZE);
  const paginatedDates = visitDates.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

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
          {/* Print — whole history, or just the visits matching the date filter */}
          {visitDates.length > 0 && (
            <button
              onClick={printVisits}
              disabled={printing}
              className="px-3 py-1.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              {printing ? 'Preparing…' : `Print ${visitDates.length} visit${visitDates.length !== 1 ? 's' : ''}`}
            </button>
          )}
          {historyData && (
            <p className="text-xs text-gray-400 ml-auto self-center">
              {visitDates.length} visit{visitDates.length !== 1 ? 's' : ''} found
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

      {/* Single-date mode: the visit document, open — no accordion chrome */}
      {singleDate && !historyLoading && historyData && visitDates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <VisitDocument records={getRecordsForDate(singleDate)} fullExamCache={fullExamCache} />
        </div>
      )}

      {/* Tab mode: visit date accordions */}
      {!singleDate && !historyLoading && paginatedDates.map(date => {
        const records = getRecordsForDate(date);
        const isOpen  = openHistoryDate === date;
        const total   = Object.values(records).reduce((sum, arr) => sum + arr.length, 0);

        // Per-type header summary: e.g. "1 doctor's note · 1 admission · 1 prescription".
        const noteCount = records.notes.length;
        const admCount  = records.admissions.length;
        const rxCount   = records.prescriptions.length;
        const actionCount = admCount + rxCount;
        const parts = [
          noteCount && `${noteCount} doctor's note${noteCount !== 1 ? 's' : ''}`,
          admCount  && `${admCount} admission${admCount !== 1 ? 's' : ''}`,
          rxCount   && `${rxCount} prescription${rxCount !== 1 ? 's' : ''}`,
        ].filter(Boolean);
        const summary = parts.length ? parts.join(' · ') : `${total} record${total !== 1 ? 's' : ''}`;

        return (
          <div key={date} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

            {/* Date header row */}
            <button
              onClick={() => toggleHistoryDate(date)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className={`w-5 h-5 flex-shrink-0 ${isOpen ? 'text-primary' : 'text-gray-400'}`} />
                <span className={`font-semibold ${isOpen ? 'text-primary' : 'text-gray-800'}`}>
                  {formatDateLong(date)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                  {summary}
                </span>
              </div>
              {isOpen
                ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              }
            </button>

            {/* Expanded — Doctor's Notes | Actions (Actions tab only when there are any) */}
            {isOpen && (
              <div className="border-t border-gray-100 p-5">
                {actionCount > 0 && (
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setDayTab('notes')} className={dayTabCls(dayTab === 'notes')}>
                      <MessageSquare className="w-4 h-4" /> Doctor's Notes
                    </button>
                    <button onClick={() => setDayTab('actions')} className={dayTabCls(dayTab === 'actions')}>
                      <ClipboardList className="w-4 h-4" /> Actions
                      <span className="ml-0.5 text-[11px] px-1.5 rounded-full bg-white/25">{actionCount}</span>
                    </button>
                  </div>
                )}
                {dayTab === 'actions' && actionCount > 0
                  ? <ActionsList records={records} onView={setViewArtifact} />
                  : <VisitDocument records={records} fullExamCache={fullExamCache} />
                }
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {!singleDate && !historyLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Page {historyPage} of {totalPages} · {visitDates.length} visit{visitDates.length !== 1 ? 's' : ''}
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
              {' · '}{visitDates.length} visit{visitDates.length !== 1 ? 's' : ''}
              {(historyFromDate || historyToDate) && ` · ${historyFromDate || '…'} → ${historyToDate || '…'}`}
            </p>
          </div>
          {visitDates.map(date => (
            <div key={date} className="mb-6" style={{ breakInside: 'avoid' }}>
              <h2 className="text-base font-bold text-gray-800 border-b border-gray-300 pb-1 mb-3">
                {formatDateLong(date)}
              </h2>
              <VisitDocument records={getRecordsForDate(date)} fullExamCache={fullExamCache} />
            </div>
          ))}
        </div>
      </div>

      {/* Actions artifact viewer — admission note / prescription, with print */}
      <ArtifactModal artifact={viewArtifact} patient={patient} onClose={() => setViewArtifact(null)} />

    </div>
  );
};

export default VisitHistoryPanel;
