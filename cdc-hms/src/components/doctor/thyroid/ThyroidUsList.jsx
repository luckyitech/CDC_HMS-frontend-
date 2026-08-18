import { useState, useEffect, useCallback } from 'react';
import { useThyroidUltrasound } from '../../../contexts/ThyroidUltrasoundContext';
import { TR_COLOR } from '../../../constants/thyroidUs';
import ThyroidUsWorkspace from './ThyroidUsWorkspace';

/**
 * Thyroid ultrasound reporting entry point. Drop into the Radiology patient view
 * (or anywhere a patient is in context). Lists this patient's reports and opens
 * the full-screen workspace to create or resume one.
 */
export default function ThyroidUsList({ patient }) {
  const ctx = useThyroidUltrasound();
  const [reports, setReports] = useState([]);
  const [openWorkspace, setOpenWorkspace] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    if (!patient?.uhid) return;
    ctx.listReports(patient.uhid).then(setReports).catch(() => setReports([]));
  }, [ctx, patient]);

  useEffect(() => { reload(); }, [reload]);

  const openReport = async (id) => { setBusy(true); try { await ctx.openReport(id); setOpenWorkspace(true); } finally { setBusy(false); } };
  const newReport = async () => { setBusy(true); try { await ctx.createReport(patient.uhid); setOpenWorkspace(true); } finally { setBusy(false); } };
  const closeWorkspace = () => { setOpenWorkspace(false); ctx.close(); reload(); };

  const statusChip = (s) => ({
    draft: 'bg-slate-100 text-slate-600', signed: 'bg-emerald-100 text-emerald-700', deleted: 'bg-rose-100 text-rose-700',
  }[s] || 'bg-slate-100 text-slate-600');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Thyroid ultrasound reports</h3>
        <button disabled={busy} onClick={newReport} className="text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg font-medium">+ New report</button>
      </div>

      {reports.length === 0 ? (
        <div className="text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">No thyroid ultrasound reports yet.</div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <button key={r.id} onClick={() => openReport(r.id)} className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-teal-300 text-left">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">{r.reportNumber}</span>
                <span className="text-slate-500">{r.examDate || new Date(r.createdAt).toLocaleDateString()}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded ${statusChip(r.status)}`}>{r.status}</span>
              </div>
              <span className="text-xs text-teal-700">{r.status === 'draft' ? 'Resume →' : 'View & print →'}</span>
            </button>
          ))}
        </div>
      )}

      {openWorkspace && <ThyroidUsWorkspace patient={patient} onClose={closeWorkspace} />}
    </div>
  );
}
