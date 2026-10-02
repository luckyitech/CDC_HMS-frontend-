import { Plus, X } from 'lucide-react';
import { cellInputCls } from '../hrUi';
import { fmtDays } from './leaveFormat';

/**
 * Charge these days to… (revision B) — for an approver holding leave.approve.
 * Which balance(s) the request's days come off: e.g. 2 Sick + 3 Annual. The
 * total must equal the request's days; the approval that completes the
 * request locks it. The server checks the same rules (utils/leaveWorkflow
 * chargeValid, and the balance under a policy without negatives).
 *
 * props:
 *   rows       [{ leaveType, days }]
 *   onChange   (rows) => void
 *   total      the request's days
 *   types      [{ key, name }]  balances this year's policy allows
 *   balances   [{ leaveType, leftBefore, unlimited }]
 */
const ChargeSplit = ({ rows, onChange, total, types = [], balances = [] }) => {
  const sum = Math.round(rows.reduce((s, r) => s + (Number(r.days) || 0), 0) * 100) / 100;
  const off = Math.abs(sum - Number(total)) > 0.001;
  const used = new Set(rows.map((r) => r.leaveType));
  const bal = (key) => balances.find((b) => b.leaveType === key);
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div data-testid="charge-split">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-gray-500">
            <th className="text-left font-semibold py-1">Balance</th>
            <th className="text-left font-semibold py-1 w-20">Days</th>
            <th className="text-right font-semibold py-1">Left now</th>
            <th className="text-right font-semibold py-1">Left after</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const b = bal(r.leaveType);
            const after = b && !b.unlimited && b.leftBefore !== null ? Math.round((b.leftBefore - (Number(r.days) || 0)) * 100) / 100 : null;
            return (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-1.5 pr-2">
                  <select className={cellInputCls} value={r.leaveType} aria-label={`Balance ${i + 1}`} onChange={(e) => set(i, { leaveType: e.target.value })}>
                    {types.filter((t) => t.key === r.leaveType || !used.has(t.key)).map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <input type="number" min="0.25" step="0.25" className={cellInputCls} value={r.days} aria-label={`Days ${i + 1}`}
                    onChange={(e) => set(i, { days: e.target.value })} />
                </td>
                <td className="py-1.5 text-right tabular-nums text-gray-600">{b?.unlimited ? '—' : fmtDays(b?.leftBefore)}</td>
                <td className={`py-1.5 text-right tabular-nums ${after !== null && after < 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>{after === null ? '—' : fmtDays(after)}</td>
                <td className="py-1.5 text-right">
                  {rows.length > 1 && (
                    <button type="button" className="p-1 text-gray-400 hover:text-gray-700" aria-label="Remove this balance" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {types.some((t) => !used.has(t.key)) && rows.length < 4 && (
          <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            onClick={() => onChange([...rows, { leaveType: types.find((t) => !used.has(t.key)).key, days: '' }])}>
            <Plus className="w-3.5 h-3.5" /> Split across another balance
          </button>
        )}
        <span className={`text-[11px] ${off ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
          Total must equal {fmtDays(total)}{off ? ` — now ${fmtDays(sum)}` : ''}.
        </span>
      </div>
    </div>
  );
};

export default ChargeSplit;
