import { useCallback, useEffect, useState } from 'react';
import { FileText, Clock } from 'lucide-react';
import ReasonModal from '../shared/ReasonModal';
import HistologyResultForm from './HistologyResultForm';
import { histologyService } from '../../services/histologyService';
import documentService from '../../services/documentService';
import { RESULT_FIELD_NAMES } from '../../constants/histology';
import { notify } from '../../utils/notify';

/**
 * HistologyRequestList — a patient's histology / cytology requests, newest
 * first: specimen, site, status ("Overdue" after 21 days without a result,
 * H7), the typed result and the report. Those who may record enter the
 * result, correct it (reason after its day) or cancel a request still
 * awaiting its result (reason). "History" shows the trail.
 *
 * Used in Orders tab 3 (under the request form), in Diagnostics →
 * Histology / cytology, and on a skin finding (findingId).
 *
 * Props: uhid, canWrite, findingId?, reloadKey (bump to reload), onChanged(),
 *        emptyText
 */
const fmtDay = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const shown = (v) => (v === null || v === undefined || v === '' ? '—' : String(v).replace(/_/g, ' '));

const StatusChip = ({ r }) => {
  if (r.status === 'cancelled') return <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">Cancelled</span>;
  if (r.status === 'resulted') return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">Result in</span>;
  if (r.overdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
        <Clock className="h-3 w-3" aria-hidden="true" /> Overdue · {r.daysWaiting} days
      </span>
    );
  }
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Awaiting result{r.daysWaiting ? ` · ${r.daysWaiting} d` : ''}</span>;
};

const openReport = async (doc) => {
  try {
    const filename = String(doc.fileUrl || '').split('/').pop();
    const blob = await documentService.getFile(filename);
    window.open(URL.createObjectURL(blob), '_blank');
  } catch (err) {
    notify('error', err?.message || 'Could not open the report');
  }
};

const RequestCard = ({ r, uhid, canWrite, onChanged }) => {
  const [mode, setMode] = useState(null);         // 'result' | null
  const [trail, setTrail] = useState(null);
  const [ask, setAsk] = useState(null);           // { title, message, confirmLabel, destructive, run }

  const toggleTrail = async () => {
    if (trail) { setTrail(null); return; }
    try { const res = await histologyService.get(r.id); setTrail(res.data.trail || []); } catch (err) { notify('error', err?.message || 'Could not load the history'); }
  };

  const cancel = () => setAsk({
    title: `Cancel ${r.specimenNumber}`,
    message: 'The request and its lab request are cancelled, not deleted. Your reason is kept with it.',
    confirmLabel: 'Cancel request',
    destructive: true,
    run: async (reason) => {
      try { await histologyService.cancel(r.id, reason); notify('success', 'Request cancelled'); onChanged?.(); } catch (err) {
        if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not cancel');
      }
    },
  });

  return (
    <li className={`flex flex-col gap-2 rounded-xl border p-3 ${r.overdue ? 'border-red-200 bg-red-50/30' : r.status === 'cancelled' ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-gray-200 bg-white'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-xs font-semibold text-gray-700">{r.specimenNumber}</span>
        <span className="text-sm font-semibold text-gray-800">{r.kind === 'cytology' ? 'Cytology' : 'Histology'} · {r.specimenLabel}</span>
        <StatusChip r={r} />
        <span className="ml-auto text-xs text-gray-500">{fmtDay(r.visitDate)} · {r.requestedByName || '—'}</span>
      </div>
      <p className="text-sm text-gray-700">{r.site}</p>
      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer text-xs font-medium text-primary">Clinical details{r.sendTo ? ` · sent to ${r.sendTo}` : ''}</summary>
        <p className="mt-1 whitespace-pre-wrap">{r.clinicalDetails}</p>
        {(r.pieces || r.fixative) && <p className="mt-1 text-xs text-gray-500">{r.pieces ? `${r.pieces} ${r.kind === 'cytology' ? (r.pieces === 1 ? 'pass' : 'passes') : (r.pieces === 1 ? 'piece' : 'pieces')}` : ''}{r.pieces && r.fixative ? ' · ' : ''}{r.fixative ? `in ${r.fixative}` : ''}{r.labTest ? ` · lab ${r.labTest.testNumber} (${r.labTest.status})` : ''}</p>}
      </details>

      {r.status === 'resulted' && (
        <div className="rounded-lg border border-green-200 bg-green-50/60 px-3 py-2 text-sm">
          <p className="font-semibold text-gray-800">{r.resultSummary}</p>
          {r.resultComment && <p className="mt-0.5 whitespace-pre-wrap text-gray-700">{r.resultComment}</p>}
          <p className="mt-1 text-xs text-gray-500">
            Typed by {r.resultByName || '—'}{r.reportDate ? ` · report dated ${fmtDay(r.reportDate)}` : ''}
          </p>
          {r.reportDocument && (
            <button type="button" onClick={() => openReport(r.reportDocument)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {r.reportDocument.fileName}
            </button>
          )}
        </div>
      )}
      {r.status === 'cancelled' && <p className="text-sm text-gray-600">Cancelled by {r.cancelledByName} — {r.cancelReason}</p>}

      {mode === 'result' && (
        <HistologyResultForm
          uhid={uhid}
          request={r}
          onSaved={() => { setMode(null); onChanged?.(); }}
          onCancel={() => setMode(null)}
          onNeedReason={(run) => setAsk({
            title: `Correct the result of ${r.specimenNumber}`,
            message: 'The result was typed on an earlier day or by someone else. The original stays in the history with your reason.',
            confirmLabel: 'Save correction',
            run,
          })}
        />
      )}

      <div className="flex flex-wrap gap-3">
        {canWrite && r.status === 'awaiting' && mode !== 'result' && (
          <button type="button" onClick={() => setMode('result')} className="text-sm font-semibold text-primary hover:underline">Enter result</button>
        )}
        {canWrite && r.status === 'resulted' && mode !== 'result' && (
          <button type="button" onClick={() => setMode('result')} className="text-xs font-medium text-primary hover:underline">Correct result</button>
        )}
        {canWrite && r.status === 'awaiting' && mode !== 'result' && (
          <button type="button" onClick={cancel} className="text-xs font-medium text-red-600 hover:underline">Cancel request</button>
        )}
        <button type="button" onClick={toggleTrail} className="text-xs font-medium text-gray-500 hover:underline">{trail ? 'Hide history' : 'History'}</button>
      </div>

      {trail && (
        trail.length === 0
          ? <p className="text-xs text-gray-500">No corrections or cancellations.</p>
          : (
            <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
              {trail.map((e) => (
                <li key={e.id}>
                  <b>{fmtDay(String(e.createdAt).slice(0, 10))}</b> · {e.editedByName} · {e.action === 'cancel' ? 'cancelled' : 'corrected the result'}
                  {e.action === 'amend_result' && (
                    <span className="text-gray-700"> — {Object.entries(e.changes).map(([k, [a, b]]) => `${RESULT_FIELD_NAMES[k] || k}: ${shown(a)} → ${shown(b)}`).join('; ')}</span>
                  )}
                  <span className="text-gray-600"> · Reason: {e.reason}</span>
                </li>
              ))}
            </ul>
          )
      )}

      <ReasonModal
        isOpen={!!ask}
        onClose={() => setAsk(null)}
        title={ask?.title}
        message={ask?.message}
        confirmLabel={ask?.confirmLabel}
        destructive={ask?.destructive}
        onConfirm={async (reason) => { const job = ask; setAsk(null); await job.run(reason); }}
      />
    </li>
  );
};

const HistologyRequestList = ({ uhid, canWrite, findingId = null, reloadKey = 0, onChanged, emptyText = 'No histology or cytology requests yet.' }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!uhid) return;
    try {
      const res = await histologyService.list(uhid, { findingId });
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Could not load histology requests');
    }
  }, [uhid, findingId]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const changed = () => { load(); onChanged?.(); };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="py-3 text-sm text-gray-500">Loading…</p>;
  if (!data.requests.length) return <p className="text-sm text-gray-500">{emptyText}</p>;

  return (
    <div className="flex flex-col gap-2">
      {(data.counts.awaiting > 0 || data.counts.overdue > 0) && (
        <p className="text-xs text-gray-500">
          {data.counts.awaiting} awaiting a result{data.counts.overdue > 0 && <span className="font-semibold text-red-700"> · {data.counts.overdue} overdue (more than {data.overdueDays} days)</span>}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {data.requests.map((r) => <RequestCard key={r.id} r={r} uhid={uhid} canWrite={canWrite} onChanged={changed} />)}
      </ul>
    </div>
  );
};

export default HistologyRequestList;
