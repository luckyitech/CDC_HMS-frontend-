import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, FileText } from 'lucide-react';
import ConsultationSummaryPanel from './ConsultationSummaryPanel';
import VisitHistoryPanel from '../shared/VisitHistoryPanel';
import patientService from '../../services/patientService';
import documentService from '../../services/documentService';
import { consultationNotesService } from '../../services/consultationNotesService';

/**
 * ConsultationSummaryContainer — data wiring + slide-overs for the summary panel.
 *
 * Keeps ALL fetching and overlay state out of Consultation.jsx so the
 * integration there is only a layout wrapper + this one element.
 *
 * Props:
 *   patient        the resolved patient (needs .uhid, .vitals)
 *   medications    active prescriptions (from Consultation's existing state)
 *   onOpenMeds()   jump to the prescriptions section
 */

const DEFAULT_METRICS = ['bloodSugar', 'hba1c'];

// Map document categories → Labs card tabs
const LAB_CATEGORIES = ['Lab Report - External'];
const IMAGING_CATEGORIES = ['Imaging Report'];

const dayKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const ConsultationSummaryContainer = ({ patient, medications = [], onOpenMeds = () => {}, onEditVitals = null, onDiagnosesChange = null }) => {
  const uhid = patient?.uhid;

  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [doctorsByDay, setDoctorsByDay] = useState({});   // dayKey → "Dr. A, Dr. B"
  const [labDocs, setLabDocs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(DEFAULT_METRICS);

  // Slide-over state
  const [visitDay, setVisitDay] = useState(null);   // { date, records }
  const [pdfDoc, setPdfDoc] = useState(null);       // { name, url }

  // ── Fetch: vitals history + blood sugar + documents + metric preference ────
  useEffect(() => {
    if (!uhid) return;
    let live = true;

    (async () => {
      try {
        const res = await patientService.getVitalsHistory(uhid);
        const hist = Array.isArray(res.data) ? res.data : res.data?.vitals ?? [];
        if (!live) return;
        setVitalsHistory(hist);

        // Chart series from vitals history (clinic side)
        const byDay = new Map();
        hist.forEach((r) => {
          if (!r.recordedAt) return;
          const k = dayKey(r.recordedAt);
          const row = byDay.get(k) || { date: r.recordedAt };
          const rbs = parseFloat(r.rbs);
          const hba1c = parseFloat(r.hba1c);
          const sys = parseInt(String(r.bp || '').split('/')[0], 10);
          const weight = parseFloat(r.weight);
          if (!Number.isNaN(rbs)) row.bloodSugar = rbs;
          if (!Number.isNaN(hba1c)) row.hba1c = hba1c;
          if (!Number.isNaN(sys)) row.bp = sys;
          if (!Number.isNaN(weight)) row.weight = weight;
          byDay.set(k, row);
        });

        // Merge patient-portal blood sugar readings into the same day rows
        try {
          const bs = await patientService.getBloodSugar(uhid, { days: 180 });
          const readings = bs.data?.readings ?? bs.data ?? [];
          (Array.isArray(readings) ? readings : []).forEach((rd) => {
            const val = parseFloat(rd.value);
            if (Number.isNaN(val) || !rd.date) return;
            const k = dayKey(rd.date);
            const row = byDay.get(k) || { date: rd.date };
            // Prefer clinic RBS when both exist on a day; else use portal reading
            if (row.bloodSugar == null) row.bloodSugar = val;
            byDay.set(k, row);
          });
        } catch { /* portal readings unavailable — chart clinic data only */ }

        if (!live) return;
        setChartData(
          [...byDay.values()].sort((a, b) => new Date(a.date) - new Date(b.date))
        );
      } catch { /* silent — cards show empty states */ }

      try {
        const docs = await documentService.getByPatient(uhid);
        const list = docs.data?.documents ?? docs.data ?? [];
        if (!live) return;
        setLabDocs(
          (Array.isArray(list) ? list : [])
            .filter((d) => LAB_CATEGORIES.includes(d.documentCategory) || IMAGING_CATEGORIES.includes(d.documentCategory))
            .map((d) => ({
              id: d.id,
              name: d.documentName || d.fileName || 'Document',
              category: IMAGING_CATEGORIES.includes(d.documentCategory) ? 'Imaging' : 'Laboratory',
              date: d.createdAt || d.uploadedAt,
              // Stored (on-disk) filename is the basename of fileUrl — d.fileName is
              // the ORIGINAL upload name and 404s. Same derivation as MedicalDocumentsTab.
              fileName: (d.fileUrl || d.filePath || '').split('/').pop() || null,
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        );
      } catch { /* silent */ }

      // Tracked diagnosis list
      try {
        const dx = await patientService.getDiagnoses(uhid);
        if (live) setDiagnoses(dx.data?.diagnoses ?? []);
      } catch { /* silent — card shows empty state */ }

      // Doctor(s) per visit day — from consultation notes (vitals carry no doctor)
      try {
        const notes = await consultationNotesService.getAll({ uhid, limit: 200 });
        const list = notes.data?.consultationNotes ?? notes.data ?? [];
        if (live) {
          const map = {};
          (Array.isArray(list) ? list : []).forEach((n) => {
            if (!n.date || !n.doctorName) return;
            const k = dayKey(n.date);
            const set = map[k] || new Set();
            set.add(n.doctorName);
            map[k] = set;
          });
          setDoctorsByDay(
            Object.fromEntries(Object.entries(map).map(([k, s]) => [k, [...s].join(', ')]))
          );
        }
      } catch { /* silent — subcards just omit the doctor line */ }

      try {
        const pref = await patientService.getChartMetrics(uhid);
        const saved = pref.data?.chartMetrics;
        if (live && Array.isArray(saved) && saved.length) setSelectedMetrics(saved);
      } catch { /* silent — defaults stand */ }
    })();

    return () => { live = false; };
  }, [uhid]);

  // Let the parent (Consultation) react to diagnosis changes — e.g. the
  // "diagnosis required" gate is waived once an active diagnosis exists.
  useEffect(() => {
    if (onDiagnosesChange) onDiagnosesChange(diagnoses);
  }, [diagnoses, onDiagnosesChange]);

  // ── Visits: vitals history grouped by day (newest first) ───────────────────
  const visits = (() => {
    const map = new Map();
    vitalsHistory.forEach((r) => {
      if (!r.recordedAt) return;
      const k = dayKey(r.recordedAt);
      const v = map.get(k) || { id: k, date: r.recordedAt, count: 0, records: [], doctors: doctorsByDay[k] || null };
      v.count += 1;
      v.records.push(r);
      map.set(k, v);
    });
    // Days with consultation notes but no vitals still count as visits
    Object.keys(doctorsByDay).forEach((k) => {
      if (!map.has(k)) map.set(k, { id: k, date: k, count: null, records: [], doctors: doctorsByDay[k] });
    });
    // Side panel shows the last month only — the full history lives in the
    // Visit History tab; this keeps the summary rail short.
    const cutoff = Date.now() - 31 * 24 * 60 * 60 * 1000;
    return [...map.values()]
      .filter((v) => new Date(v.date).getTime() >= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  })();

  // ── Metric toggle — persisted per patient ──────────────────────────────────
  const toggleMetric = useCallback((key) => {
    setSelectedMetrics((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (next.length === 0) return prev; // always keep at least one
      patientService.updateChartMetrics(uhid, next).catch(() => {});
      return next;
    });
  }, [uhid]);

  // ── Diagnosis actions — clinical record: retire/restore, never delete ─────
  const addDiagnosis = useCallback(async ({ diagnosis, code }) => {
    const res = await patientService.addDiagnosis(uhid, { diagnosis, code });
    const row = res.data;
    if (row?.id) setDiagnoses((prev) => [row, ...prev]);
    return row;
  }, [uhid]);

  const resolveDiagnosis = useCallback(async (id) => {
    const res = await patientService.resolveDiagnosis(uhid, id);
    const row = res.data;
    if (row?.id) setDiagnoses((prev) => prev.map((d) => (d.id === row.id ? row : d)));
  }, [uhid]);

  const reactivateDiagnosis = useCallback(async (id) => {
    const res = await patientService.reactivateDiagnosis(uhid, id);
    const row = res.data;
    if (row?.id) setDiagnoses((prev) => prev.map((d) => (d.id === row.id ? row : d)));
  }, [uhid]);

  // Fetch through the API client so the JWT goes with the request — a bare
  // <iframe src> to the backend 401s (X-Frame-Options blocks the redirect too).
  // Same authenticated-blob pattern as MedicalDocumentsTab.
  const openPdf = async (doc) => {
    if (!doc.fileName) return;
    setPdfDoc({ name: doc.name, loading: true });
    try {
      const blob = await documentService.getFile(doc.fileName);
      const url = URL.createObjectURL(blob);
      const isImage = (blob.type || '').startsWith('image/')
        || /\.(png|jpe?g|gif|webp|bmp)$/i.test(doc.fileName);
      setPdfDoc({ name: doc.name, url, isImage });
    } catch (e) {
      setPdfDoc({ name: doc.name, error: e?.message || 'Failed to load file' });
    }
  };

  const closePdf = () => {
    setPdfDoc((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const fmtDay = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <ConsultationSummaryPanel
        patient={patient}
        vitals={patient?.vitals}
        onEditVitals={onEditVitals}
        diagnoses={diagnoses}
        onAddDiagnosis={addDiagnosis}
        onResolveDiagnosis={resolveDiagnosis}
        onReactivateDiagnosis={reactivateDiagnosis}
        visits={visits}
        onOpenVisit={setVisitDay}
        labDocs={labDocs}
        onOpenPdf={openPdf}
        chartData={chartData}
        selectedMetrics={selectedMetrics}
        onToggleMetric={toggleMetric}
        medications={medications}
        onOpenMeds={onOpenMeds}
      />

      {/* ── Visit-day slide-over — portaled (DRY §4c), floating style (DRY design) ── */}
      {visitDay && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 sm:items-stretch sm:justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setVisitDay(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[20px] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] sm:max-h-none sm:my-4 sm:mr-4">
            <div className="flex items-center gap-2 px-5 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <Calendar className="w-5 h-5" />
              <h3 className="font-bold">{fmtDay(visitDay.date)}</h3>
              {visitDay.count != null && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{visitDay.count} records</span>
              )}
              <button onClick={() => setVisitDay(null)} className="ml-auto p-1 text-blue-100 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {/* Full visit record for the day — same shared panel as the Visit
                  History tab (vitals, diagnosis & treatment plan, consultation
                  notes, prescriptions, exams, GLP-1), locked to this date. */}
              <VisitHistoryPanel patient={patient} singleDate={dayKey(visitDay.date)} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── PDF viewer slide-over — portaled (DRY §4c), floating style (DRY design) ── */}
      {pdfDoc && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 sm:items-stretch sm:justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closePdf} />
          <div className="relative w-full max-w-3xl bg-white rounded-[20px] shadow-2xl flex flex-col overflow-hidden h-[85vh] sm:h-auto sm:my-4 sm:mr-4">
            <div className="flex items-center gap-2 px-5 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <FileText className="w-5 h-5" />
              <h3 className="font-bold truncate">{pdfDoc.name}</h3>
              <button onClick={closePdf} className="ml-auto p-1 text-blue-100 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            {pdfDoc.loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading document…</div>
            ) : pdfDoc.error ? (
              <div className="flex-1 flex items-center justify-center text-sm text-red-600 px-6 text-center">{pdfDoc.error}</div>
            ) : pdfDoc.isImage ? (
              <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-4">
                <img src={pdfDoc.url} alt={pdfDoc.name} className="max-w-full h-auto rounded-lg shadow" />
              </div>
            ) : (
              <iframe title={pdfDoc.name} src={pdfDoc.url} className="flex-1 w-full" />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ConsultationSummaryContainer;
