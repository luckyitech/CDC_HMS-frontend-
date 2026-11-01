import { useState } from 'react';
import { Microscope } from 'lucide-react';
import { groupHistologyRequests, specimenLine } from '../../utils/histologyRequests';
import HistopathologyRequestPrint from './HistopathologyRequestPrint';

/**
 * Histopathology in Visit History (Phase 4, 7 Oct 2026; V2, V3; merged
 * requests 1 Nov 2026) — what happened on one day: requests made that day
 * (specimens of one request shown together, with its printed form), and
 * results typed that day (a result is filed on the day it came back, which may
 * be a day with no visit; it names its request). Under the skin review on the
 * Doctor's Notes tab, and in its print.
 *
 * Props: events — [{ key, type: 'requested' | 'resulted', request }] where
 *        request is a row (one specimen) from GET /histology/patients/:uhid;
 *        patient — when given (not in print), "View form" opens the request.
 */
const kindLabel = (k) => (k === 'cytology' ? 'Cytology' : 'Histology');

const statusNow = (r) => {
  if (r.status === 'resulted') return `result: ${r.resultSummary || 'recorded'}`;
  if (r.status === 'cancelled') return `cancelled${r.cancelReason ? ` — ${r.cancelReason}` : ''}`;
  return r.overdue ? `awaiting result · overdue (${r.daysWaiting} days)` : 'awaiting result';
};

const HistologyDayEvents = ({ events, patient = null }) => {
  const [open, setOpen] = useState(null);
  if (!events?.length) return null;
  const requested = groupHistologyRequests(events.filter((e) => e.type === 'requested').map((e) => e.request));
  const resulted = events.filter((e) => e.type === 'resulted').map((e) => e.request);
  return (
    <div className="space-y-2" style={{ breakInside: 'avoid' }}>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
        <Microscope className="h-3.5 w-3.5" /> Histopathology
      </h4>
      {requested.map((g) => (
        <div key={g.key} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 break-words">
          <p className="flex flex-wrap items-center gap-x-2">
            <b className="font-semibold text-gray-800">Histopathology request{g.requisitionNumber ? ` ${g.requisitionNumber}` : ''}</b>
            <span className="text-gray-500">· {g.specimens.length} specimen{g.specimens.length === 1 ? '' : 's'}{g.requestedByName ? ` · ${g.requestedByName}` : ''}</span>
            {patient?.uhid && (
              <button type="button" onClick={() => setOpen(g)} className="ml-auto text-xs font-semibold text-primary hover:underline">View form</button>
            )}
          </p>
          {g.specimens.map((r, i) => (
            <p key={r.id}>{i + 1} · {r.specimenNumber} {specimenLine(r)} <span className="text-xs text-gray-500">· now: {statusNow(r)}</span></p>
          ))}
          {g.clinicalDetails && <p className="whitespace-pre-wrap text-gray-600">{g.clinicalDetails}</p>}
        </div>
      ))}
      {resulted.map((r) => (
        <div key={`${r.id}-res`} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 break-words">
          <p>
            <b className="font-semibold text-gray-800">{kindLabel(r.kind)} result · {r.specimenNumber}</b>
            <span className="text-gray-500">{r.requisitionNumber ? ` · on ${r.requisitionNumber}` : ''} · requested {r.visitDate}{r.resultByName ? ` · typed by ${r.resultByName}` : ''}</span>
          </p>
          <p>{r.site}</p>
          <p className="font-semibold text-gray-800">{r.resultSummary}</p>
          {r.resultComment && <p className="whitespace-pre-wrap text-gray-600">{r.resultComment}</p>}
          {r.reportDocument && <p className="text-xs text-gray-500">Report attached: {r.reportDocument.fileName} (Documents)</p>}
        </div>
      ))}
      {open && <HistopathologyRequestPrint request={open} patient={patient} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default HistologyDayEvents;
