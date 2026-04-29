import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar, ChevronDown, ChevronRight,
  Activity, Target, FileEdit, Stethoscope, MessageSquare, Pill,
} from 'lucide-react';
import VitalsGrid from './VitalsGrid';
import patientService from '../../services/patientService';
import { useInitialAssessmentContext } from '../../contexts/InitialAssessmentContext';
import { usePhysicalExamContext } from '../../contexts/PhysicalExamContext';
import { useTreatmentPlanContext } from '../../contexts/TreatmentPlanContext';
import { usePrescriptionContext } from '../../contexts/PrescriptionContext';
import { useConsultationNotesContext } from '../../contexts/ConsultationNotesContext';
import PhysicalExamFindings from '../../pages/doctor/PhysicalExamFindings';

// ── Config: maps each history record type to its date field ──────────────────
// To add a new section (e.g. lab results): add one entry here + one fetch call
// + one render block below. No changes to the core filtering/pagination logic.
const DATE_FIELD_MAP = {
  vitals:        'recordedAt',
  plans:         'date',
  assessments:   'createdAt',
  exams:         'date',
  notes:         'date',
  prescriptions: 'createdAt',
};

const HISTORY_PAGE_SIZE = 10;

// ── Small read-only helpers ───────────────────────────────────────────────────
const HistoryField = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="p-2 bg-white rounded border border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
};

const SectionHeader = ({ icon, label }) => (
  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
    {icon}
    {label}
  </h4>
);

// ── VisitHistoryPanel ─────────────────────────────────────────────────────────
/**
 * Props:
 *   patient      — patient object (must include .uhid)
 *   excludeToday — set true in Consultation.jsx so today's work doesn't appear
 *                  in history (it already lives in the "Today's Consultation" tab)
 */
const VisitHistoryPanel = ({ patient, excludeToday = false }) => {
  const { uhid } = patient;

  const { getAssessmentsByPatient }                      = useInitialAssessmentContext();
  const { getExaminationsByPatient, getExaminationById } = usePhysicalExamContext();
  const { getPlansByPatient }                            = useTreatmentPlanContext();
  const { getPrescriptionsByPatient }                    = usePrescriptionContext();
  const { getNotesByPatient }                            = useConsultationNotesContext();

  const [historyData, setHistoryData]           = useState(null);
  const [historyLoading, setHistoryLoading]     = useState(false);
  const [openHistoryDates, setOpenHistoryDates] = useState({});
  const [historyFromDate, setHistoryFromDate]   = useState('');
  const [historyToDate, setHistoryToDate]       = useState('');
  const [historyPage, setHistoryPage]           = useState(1);
  const [fullExamCache, setFullExamCache]       = useState({});

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
        const [assessments, exams, plans, prescriptions, { notes }, vitalsRes] = await Promise.all([
          getAssessmentsByPatient(uhid),
          getExaminationsByPatient(uhid),
          getPlansByPatient(uhid),
          getPrescriptionsByPatient(uhid),
          getNotesByPatient(uhid),
          patientService.getVitalsHistory(uhid).catch(() => ({ success: false, data: [] })),
        ]);
        if (isMounted) {
          const vitals = vitalsRes?.success ? (vitalsRes.data || []) : [];
          setHistoryData({
            assessments:   Array.isArray(assessments)   ? assessments   : [],
            exams:         Array.isArray(exams)         ? exams         : [],
            plans:         Array.isArray(plans)         ? plans         : [],
            prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
            notes:         Array.isArray(notes)         ? notes         : [],
            vitals:        Array.isArray(vitals)        ? vitals        : [],
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
      .filter(d => (!historyFromDate || d >= historyFromDate) && (!historyToDate || d <= historyToDate));
  }, [historyData, historyFromDate, historyToDate, excludeToday]);

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

  // Open/close a date accordion; lazily fetches full exam data on first open
  const toggleHistoryDate = useCallback((date) => {
    setOpenHistoryDates(prev => {
      const isOpening = !prev[date];
      if (isOpening && historyDataRef.current) {
        (historyDataRef.current.exams || [])
          .filter(e => (e.date || e.createdAt || '').slice(0, 10) === date)
          .forEach(exam => {
            if (!fullExamCacheRef.current[exam.id]) {
              getExaminationById(exam.id)
                .then(full => setFullExamCache(c => ({ ...c, [exam.id]: full || 'error' })))
                .catch(() => setFullExamCache(c => ({ ...c, [exam.id]: 'error' })));
            }
          });
      }
      return { ...prev, [date]: isOpening };
    });
  }, [getExaminationById]);

  const totalPages     = Math.ceil(visitDates.length / HISTORY_PAGE_SIZE);
  const paginatedDates = visitDates.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  return (
    <div className="space-y-4">

      {/* Date range filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
          {historyData && (
            <p className="text-xs text-gray-400 ml-auto self-center">
              {visitDates.length} visit{visitDates.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>

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

      {/* Visit date accordions */}
      {!historyLoading && paginatedDates.map(date => {
        const records   = getRecordsForDate(date);
        const isOpen    = !!openHistoryDates[date];
        const total     = Object.values(records).reduce((sum, arr) => sum + arr.length, 0);
        const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        return (
          <div key={date} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

            {/* Date header row */}
            <button
              onClick={() => toggleHistoryDate(date)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${isOpen ? 'text-primary' : 'text-gray-400'}`} />
                <span className={`font-semibold ${isOpen ? 'text-primary' : 'text-gray-800'}`}>
                  {formatted}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {total} record{total !== 1 ? 's' : ''}
                </span>
              </div>
              {isOpen
                ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              }
            </button>

            {/* Expanded records */}
            {isOpen && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">

                {/* Triage Vitals */}
                {records.vitals.length > 0 && (
                  <div className="p-5 space-y-4">
                    <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} label="Triage Vitals" />
                    {records.vitals.map((v, idx) => (
                      <div key={idx} className="space-y-3">
                        {v.chiefComplaint && (
                          <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                            <p className="text-xs font-semibold text-gray-600 mb-0.5">Reason for Visit</p>
                            <p className="text-sm text-gray-800">{v.chiefComplaint}</p>
                          </div>
                        )}
                        <VitalsGrid vitals={v} patient={patient} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Diagnosis & Treatment Plan */}
                {records.plans.length > 0 && (
                  <div className="p-5 space-y-3">
                    <SectionHeader icon={<Target className="w-3.5 h-3.5" />} label="Diagnosis & Treatment Plan" />
                    {records.plans.map(plan => (
                      <div key={plan.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-gray-800 text-sm">{plan.diagnosis}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            plan.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>{plan.status}</span>
                        </div>
                        {plan.doctorName && (
                          <p className="text-xs text-gray-500 mb-2">By {plan.doctorName}</p>
                        )}
                        {plan.plan && (
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white rounded p-2 border border-blue-100">
                            {plan.plan}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Assessment */}
                {records.assessments.length > 0 && (
                  <div className="p-5 space-y-3">
                    <SectionHeader icon={<FileEdit className="w-3.5 h-3.5" />} label="Assessment" />
                    {records.assessments.map(a => (
                      <div key={a.id} className="space-y-2">
                        <HistoryField label="History of Present Illness" value={a.historyOfPresentIllness} />
                        <HistoryField label="Past Medical History"       value={a.pastMedicalHistory} />
                        <HistoryField label="Family History"             value={a.familyHistory} />
                        <HistoryField label="Social History"             value={a.socialHistory} />
                        <HistoryField label="Review of Systems"          value={a.reviewOfSystems} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Physical Exam — full findings rendered via shared component */}
                {records.exams.length > 0 && (
                  <div className="p-5 space-y-4">
                    <SectionHeader icon={<Stethoscope className="w-3.5 h-3.5" />} label="Physical Exam" />
                    {records.exams.map(e => {
                      const full = fullExamCache[e.id];
                      if (full === 'error') return (
                        <div key={e.id} className="py-3 px-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                          Failed to load exam details. Try closing and reopening this date.
                        </div>
                      );
                      if (!full) return (
                        <div key={e.id} className="flex items-center gap-2 py-4 text-sm text-gray-400">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Loading exam details…
                        </div>
                      );
                      return (
                        <PhysicalExamFindings
                          key={e.id}
                          examinationData={full}
                          onEdit={null}
                          onClose={null}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Consultation Notes */}
                {records.notes.length > 0 && (
                  <div className="p-5 space-y-3">
                    <SectionHeader icon={<MessageSquare className="w-3.5 h-3.5" />} label="Consultation Notes" />
                    {records.notes.map(note => (
                      <div key={note.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {note.doctorName && (
                          <p className="text-xs text-gray-500 mb-1">By {note.doctorName}</p>
                        )}
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.notes}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Prescriptions */}
                {records.prescriptions.length > 0 && (
                  <div className="p-5 space-y-3">
                    <SectionHeader icon={<Pill className="w-3.5 h-3.5" />} label="Prescriptions" />
                    {records.prescriptions.map(rx => (
                      <div key={rx.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {(rx.prescribedBy || rx.doctorName) && (
                          <p className="text-xs text-gray-500 mb-2">
                            By {rx.prescribedBy || rx.doctorName}
                            {rx.status && ` · ${rx.status}`}
                          </p>
                        )}
                        <ul className="space-y-1.5">
                          {(rx.medications || []).map((med, i) => (
                            <li key={i}>
                              <span className="font-medium text-gray-800 text-sm">{med.name}</span>
                              <span className="text-gray-500 text-sm">
                                {med.dosage    ? ` · ${med.dosage}`    : ''}
                                {med.frequency ? ` · ${med.frequency}` : ''}
                                {med.duration  ? ` · ${med.duration}`  : ''}
                              </span>
                              {med.instructions && (
                                <p className="text-xs text-gray-400 mt-0.5">{med.instructions}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {!historyLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Page {historyPage} of {totalPages} · {visitDates.length} visit{visitDates.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
              disabled={historyPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default VisitHistoryPanel;
