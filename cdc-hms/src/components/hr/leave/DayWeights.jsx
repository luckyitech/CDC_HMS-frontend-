import { WEEK_ORDER, weightLabel } from './leaveFormat';

/**
 * DayWeights — what each weekday is worth when leave is counted (B27, D3,
 * revision A): 1 (a full day), ½ or 0. Used for the clinic week on the policy
 * and for one person's own week on their entitlement.
 *
 * Props:
 *   value     { "0": 0, "1": 1, … "6": 1 }
 *   onChange  (next) => void
 *   disabled
 *   label     optional row label (the policy shows "Clinic default")
 */
const OPTIONS = [1, 0.5, 0];

const DayWeights = ({ value = {}, onChange, disabled = false, label = null }) => (
  <div className="overflow-x-auto">
    <table className="text-sm border-collapse">
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-gray-500">
          {label && <th className="text-left font-semibold pr-3 pb-1" />}
          {WEEK_ORDER.map(({ d, short }) => <th key={d} className="font-semibold px-1 pb-1 text-center">{short}</th>)}
        </tr>
      </thead>
      <tbody>
        <tr>
          {label && <td className="pr-3 text-gray-700 whitespace-nowrap">{label}</td>}
          {WEEK_ORDER.map(({ d, short }) => {
            const v = Number(value[d] ?? value[String(d)] ?? 0);
            return (
              <td key={d} className="px-1">
                <select
                  aria-label={`${short} is worth`}
                  value={String(v)}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...value, [d]: Number(e.target.value) })}
                  className={`rounded-md border px-1.5 py-1 text-sm tabular-nums disabled:bg-gray-50 border-gray-300 ${v === 0 ? 'text-gray-500' : 'text-gray-900 font-semibold'}`}
                >
                  {OPTIONS.map((o) => <option key={o} value={String(o)}>{weightLabel(o)}</option>)}
                </select>
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  </div>
);

export default DayWeights;
