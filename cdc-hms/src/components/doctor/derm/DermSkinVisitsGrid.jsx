import { X } from 'lucide-react';
import { ModalOverlay } from '../../shared/Modal';
import { STATUS_STYLE, statusLabel, fmtDay } from './dermFormat';

/**
 * "All skin visits" (Dermatology Phase 4, 7 Oct 2026; decision V6) — every
 * finding against every skin visit, in Visit History.
 *   status + size   examined that day
 *   —               existed but was not examined that visit
 *   blank           before it was first recorded, or after it resolved
 *
 * Props: grid ({ dates, rows } from GET /derm/patients/:uhid/visits), patient, onClose
 */
const DermSkinVisitsGrid = ({ grid, patient, onClose }) => {
  const dates = grid?.dates || [];
  const rows = grid?.rows || [];
  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="skin-grid-title">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <h3 id="skin-grid-title" className="text-lg font-bold text-gray-800">All skin visits</h3>
            <p className="text-xs text-gray-500">{patient?.name}{patient?.uhid ? ` · ${patient.uhid}` : ''} · every finding against every skin visit</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">No skin findings recorded.</p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Finding</th>
                  {dates.map((d) => (
                    <th key={d} className="whitespace-nowrap px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{fmtDay(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.finding.id} className="border-t border-gray-100 align-top">
                    <td className="sticky left-0 z-10 bg-white px-2 py-2">
                      <span className="font-mono text-xs text-gray-500">{r.finding.label}</span>{' '}
                      <b className="text-gray-800">{r.finding.title}</b>
                      {r.finding.where && <span className="block text-xs text-gray-500">{r.finding.where}</span>}
                    </td>
                    {dates.map((d) => {
                      const c = r.cells[d];
                      if (c === null || c === undefined) return <td key={d} className="px-2 py-2" />;
                      if (c === 'not_examined') {
                        return <td key={d} className="px-2 py-2 text-gray-400" title="Not examined that visit">—</td>;
                      }
                      return (
                        <td key={d} className="px-2 py-2">
                          <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[c.status] || 'border-gray-200 bg-gray-100 text-gray-600'}`}>
                            {statusLabel(c.status)}{c.size ? ` · ${c.size.replace(/ mm$/, '').replace(/ × /g, '×')} mm` : ''}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="flex-shrink-0 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          — = the finding existed but was not examined that visit. Blank = before it was first recorded, or after it resolved. Sizes are as typed (mm).
        </p>
      </div>
    </ModalOverlay>
  );
};

export default DermSkinVisitsGrid;
