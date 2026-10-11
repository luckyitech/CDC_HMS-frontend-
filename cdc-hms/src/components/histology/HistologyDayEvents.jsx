import { Microscope } from 'lucide-react';

/**
 * Histology / cytology in Visit History (Phase 4, 7 Oct 2026; V2, V3) —
 * what happened on one day: requests made that day, and results typed that
 * day (a result is filed on the day it came back, which may be a day with no
 * visit). Under the skin review on the Doctor's Notes tab, and in its print.
 *
 * Props: events — [{ key, type: 'requested' | 'resulted', request }] where
 * request is a row from GET /histology/patients/:uhid.
 */
const kindLabel = (k) => (k === 'cytology' ? 'Cytology' : 'Histology');

const statusNow = (r) => {
  if (r.status === 'resulted') return `result: ${r.resultSummary || 'recorded'}`;
  if (r.status === 'cancelled') return `cancelled${r.cancelReason ? ` — ${r.cancelReason}` : ''}`;
  return r.overdue ? `awaiting result · overdue (${r.daysWaiting} days)` : 'awaiting result';
};

const HistologyDayEvents = ({ events }) => {
  if (!events?.length) return null;
  return (
    <div className="space-y-2" style={{ breakInside: 'avoid' }}>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
        <Microscope className="h-3.5 w-3.5" /> Histology / cytology
      </h4>
      {events.map(({ key, type, request: r }) => (
        <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 break-words">
          {type === 'requested' ? (
            <>
              <p>
                <b className="font-semibold text-gray-800">{kindLabel(r.kind)} requested · {r.specimenNumber}</b>
                <span className="text-gray-500"> · {r.specimenLabel}{r.requestedByName ? ` · ${r.requestedByName}` : ''}</span>
              </p>
              <p>{r.site}</p>
              {r.clinicalDetails && <p className="whitespace-pre-wrap text-gray-600">{r.clinicalDetails}</p>}
              <p className="text-xs text-gray-500">Now: {statusNow(r)}</p>
            </>
          ) : (
            <>
              <p>
                <b className="font-semibold text-gray-800">{kindLabel(r.kind)} result · {r.specimenNumber}</b>
                <span className="text-gray-500"> · requested {r.visitDate}{r.resultByName ? ` · typed by ${r.resultByName}` : ''}</span>
              </p>
              <p>{r.site}</p>
              <p className="font-semibold text-gray-800">{r.resultSummary}</p>
              {r.resultComment && <p className="whitespace-pre-wrap text-gray-600">{r.resultComment}</p>}
              {r.reportDocument && <p className="text-xs text-gray-500">Report attached: {r.reportDocument.fileName} (Documents)</p>}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default HistologyDayEvents;
