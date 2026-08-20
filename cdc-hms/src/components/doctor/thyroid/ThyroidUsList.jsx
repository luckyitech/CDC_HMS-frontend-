import { useState, useEffect, useCallback, useRef } from 'react';
import { useThyroidUltrasound } from '../../../contexts/ThyroidUltrasoundContext';
import ThyroidUsWorkspace from './ThyroidUsWorkspace';

/**
 * Thyroid ultrasound reporting entry point. Drop into the Radiology patient view
 * (or anywhere a patient is in context). Lists this patient's reports and opens
 * the full-screen workspace to create or resume one.
 */
export default function ThyroidUsList({ patient, seed = null, onSeedConsumed = null }) {
  const ctx = useThyroidUltrasound();
  const [reports, setReports] = useState([]);
  const [openWorkspace, setOpenWorkspace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingSeed, setPendingSeed] = useState(null);   // { imageIds, layoutId } to apply once the workspace opens
  const seedConsumed = useRef(false);

  const reload = useCallback(() => {
    if (!patient?.uhid) return;
    ctx.listReports(patient.uhid).then((d) => setReports(Array.isArray(d) ? d : [])).catch(() => setReports([]));
  }, [ctx, patient]);

  useEffect(() => { reload(); }, [reload]);

  const openReport = async (id) => { setBusy(true); try { await ctx.openReport(id); setOpenWorkspace(true); } finally { setBusy(false); } };
  const newReport = async () => { setBusy(true); try { await ctx.createReport(patient.uhid); setOpenWorkspace(true); } finally { setBusy(false); } };
  const closeWorkspace = () => { setOpenWorkspace(false); ctx.close(); setPendingSeed(null); reload(); };

  // Seed from the imaging worklist: reuse an open draft if there is one, else
  // create a report, then jump straight into the wizard with the images to apply.
  useEffect(() => {
    if (!seed?.images?.length || seedConsumed.current || !patient?.uhid) return;
    seedConsumed.current = true;
    (async () => {
      setBusy(true);
      try {
        const list = await ctx.listReports(patient.uhid).catch(() => []);
        const draft = (Array.isArray(list) ? list : []).find((r) => r.status === 'draft');
        if (draft) await ctx.openReport(draft.id); else await ctx.createReport(patient.uhid);
        setPendingSeed({ images: seed.images, layoutId: seed.layoutId });
        setOpenWorkspace(true);
      } finally { setBusy(false); if (onSeedConsumed) onSeedConsumed(); }
    })();
  }, [seed, patient, ctx, onSeedConsumed]);

  const statusChip = (s) => ({
    draft: 'bg-gray-100 text-gray-600', signed: 'bg-emerald-100 text-emerald-700', deleted: 'bg-rose-100 text-rose-700',
  }[s] || 'bg-gray-100 text-gray-600');

  // The wizard opens as its own in-page screen (matches the imaging workspace).
  if (openWorkspace) return <ThyroidUsWorkspace patient={patient} onClose={closeWorkspace} seed={pendingSeed} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Thyroid ultrasound reports</h3>
        <button disabled={busy} onClick={newReport} className="text-sm bg-primary hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg font-medium">+ New report</button>
      </div>

      {reports.length === 0 ? (
        <div className="text-sm text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl p-6 text-center">No thyroid ultrasound reports yet.</div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <button key={r.id} onClick={() => openReport(r.id)} className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-primary text-left">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">{r.reportNumber}</span>
                <span className="text-gray-500">{r.examDate || new Date(r.createdAt).toLocaleDateString()}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded ${statusChip(r.status)}`}>{r.status}</span>
              </div>
              <span className="text-xs text-primary">{r.status === 'draft' ? 'Resume →' : 'View & print →'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
