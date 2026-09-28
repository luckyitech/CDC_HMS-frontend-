import { X } from 'lucide-react';
import { cellInputCls } from '../hrUi';
import { GRANT_LABELS, COUNTED_LABELS } from './leaveFormat';

/**
 * PolicyTable — the leave types and their rules for one year (B27 mockup 1).
 *
 * One row per active leave type: switched on, days, counted as, how granted,
 * carry cap, half days, needs a document. The server checks the same rules
 * (utils/leavePolicyRules); this only keeps impossible combinations out of
 * reach — calendar-day leave has no half days, "no limit" has no days, only a
 * yearly allowance carries over.
 *
 * Props:
 *   types     [{ key, name, isSystem, missing, row }]
 *   rows      { [key]: row } — the form's current values
 *   onChange  (key, patch) => void
 *   onRetire  (type) => void — offered for types HR added (never the seven)
 *   disabled
 */
const selectCls = `${cellInputCls} pr-6`;
const yearly = (grant) => grant === 'up_front' || grant === 'monthly';

const PolicyTable = ({ types, rows, onChange, onRetire, disabled = false }) => (
  <div className="overflow-x-auto -mx-1 px-1">
    <table className="w-full min-w-[760px] text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
          <th className="text-left font-semibold py-1.5 pr-2 w-[19%]">Type</th>
          <th className="text-left font-semibold py-1.5 px-1 w-[9%]">Days</th>
          <th className="text-left font-semibold py-1.5 px-1 w-[15%]">Counted as</th>
          <th className="text-left font-semibold py-1.5 px-1 w-[16%]">Granted</th>
          <th className="text-left font-semibold py-1.5 px-1 w-[9%]">Carry cap</th>
          <th className="text-left font-semibold py-1.5 px-1 w-[10%]">Half days</th>
          <th className="text-left font-semibold py-1.5 px-1 w-[22%]">Needs a document</th>
        </tr>
      </thead>
      <tbody>
        {types.map((t) => {
          const r = rows[t.key] || t.row;
          const off = !r.enabled;
          const set = (patch) => onChange(t.key, patch);
          return (
            <tr key={t.key} className={`border-b border-gray-100 align-middle ${off ? 'text-gray-400' : ''}`}>
              <td className="py-1.5 pr-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!r.enabled} disabled={disabled} onChange={(e) => set({ enabled: e.target.checked })}
                    aria-label={`${t.name} switched on`} className="h-4 w-4 rounded border-gray-300 text-primary" />
                  <span className={off ? 'text-gray-400' : 'text-gray-800'}>{t.name}</span>
                  {!t.isSystem && onRetire && (
                    <button type="button" onClick={() => onRetire(t)} disabled={disabled} title={`Retire ${t.name}`}
                      className="ml-auto text-gray-300 hover:text-red-600 disabled:opacity-40"><X className="w-3.5 h-3.5" /></button>
                  )}
                </label>
                {t.missing && <span className="block text-[10px] text-amber-700 ml-6">New — not in this year's policy until you save</span>}
              </td>
              <td className="py-1.5 px-1">
                {r.grant === 'unlimited' ? <span className="text-gray-500 pl-2">∞</span> : (
                  <input type="number" min="0" max="366" step="0.25" value={r.days ?? ''} disabled={disabled || off}
                    onChange={(e) => set({ days: e.target.value === '' ? null : e.target.value })} className={cellInputCls} aria-label={`${t.name} days`} />
                )}
              </td>
              <td className="py-1.5 px-1">
                <select value={r.countedAs} disabled={disabled || off} className={selectCls} aria-label={`${t.name} counted as`}
                  onChange={(e) => set({ countedAs: e.target.value, ...(e.target.value === 'calendar' ? { halfDaysAllowed: false } : {}) })}>
                  {Object.entries(COUNTED_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </td>
              <td className="py-1.5 px-1">
                <select value={r.grant} disabled={disabled || off} className={selectCls} aria-label={`${t.name} granted`}
                  onChange={(e) => {
                    const grant = e.target.value;
                    set({ grant, ...(grant === 'unlimited' ? { days: null } : {}), ...(!yearly(grant) ? { carryCap: 0 } : {}) });
                  }}>
                  {Object.entries(GRANT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </td>
              <td className="py-1.5 px-1">
                {yearly(r.grant) ? (
                  <input type="number" min="0" max="366" step="0.25" value={r.carryCap ?? 0} disabled={disabled || off}
                    onChange={(e) => set({ carryCap: e.target.value })} className={cellInputCls} aria-label={`${t.name} carry cap`} />
                ) : <span className="text-gray-400 pl-2">—</span>}
              </td>
              <td className="py-1.5 px-1">
                <select value={r.halfDaysAllowed ? 'yes' : 'no'} disabled={disabled || off || r.countedAs === 'calendar'} className={selectCls}
                  aria-label={`${t.name} half days`} onChange={(e) => set({ halfDaysAllowed: e.target.value === 'yes' })}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </td>
              <td className="py-1.5 px-1">
                <div className="flex items-center gap-1">
                  <select value={r.docRule} disabled={disabled || off} className={selectCls} aria-label={`${t.name} needs a document`}
                    onChange={(e) => set({ docRule: e.target.value, ...(e.target.value === 'over_days' && !r.docOverDays ? { docOverDays: 2 } : {}) })}>
                    <option value="never">No</option>
                    <option value="always">Always</option>
                    <option value="over_days">Over … days</option>
                  </select>
                  {r.docRule === 'over_days' && (
                    <input type="number" min="0.5" max="366" step="0.5" value={r.docOverDays ?? ''} disabled={disabled || off}
                      onChange={(e) => set({ docOverDays: e.target.value })} className={`${cellInputCls} w-16`} aria-label={`${t.name} document needed over days`} />
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default PolicyTable;
