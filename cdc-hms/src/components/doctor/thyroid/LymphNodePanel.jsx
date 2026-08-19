import { LN_LEVELS, LN_FEATURES } from '../../../constants/thyroidUs';

/* Structured cervical lymph-node evaluation. Nodes are logged by neck level
 * (unlimited per level), each marked None/reactive or Suspicious with the
 * suspicious sonographic features selectable. Colour is suggested from the
 * ticked features; the reporter sets the final status. Stored on the report
 * as report.lymphNodes JSON: [{ id, level, side, shortAxis, suspicious, features:[], note }]. */

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `ln-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const SIDES = [['right', 'R'], ['left', 'L'], ['midline', 'M']];

export default function LymphNodePanel({ nodes, disabled, onChange }) {
  const list = Array.isArray(nodes) ? nodes : [];
  const emit = (next) => onChange(next);

  const add = (level) => { if (!disabled) emit([...list, { id: uid(), level, side: null, shortAxis: '', suspicious: false, features: [], note: '' }]); };
  const patch = (id, p) => emit(list.map((n) => (n.id === id ? { ...n, ...p } : n)));
  const remove = (id) => emit(list.filter((n) => n.id !== id));
  const toggleFeat = (n, code) => {
    const f = Array.isArray(n.features) ? n.features : [];
    const next = f.includes(code) ? f.filter((x) => x !== code) : [...f, code];
    patch(n.id, { features: next, suspicious: next.length ? true : n.suspicious });
  };

  return (
    <div className="space-y-2.5">
      {LN_LEVELS.map(([lv, label]) => {
        const inLevel = list.filter((n) => n.level === lv);
        return (
          <div key={lv} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
              <div className="text-sm font-semibold text-gray-700">Level {lv} <span className="text-gray-400 font-normal">· {label}</span></div>
              <div className="flex items-center gap-2">
                {inLevel.length > 0 && <span className="text-[11px] text-gray-400">{inLevel.length} node{inLevel.length > 1 ? 's' : ''}</span>}
                {!disabled && <button type="button" onClick={() => add(lv)} className="text-xs text-primary border border-primary/40 rounded-lg px-2 py-1 hover:bg-blue-50">+ Add node</button>}
              </div>
            </div>
            {inLevel.length > 0 && (
              <div className="p-3 space-y-2">
                {inLevel.map((n) => (
                  <NodeRow key={n.id} n={n} disabled={disabled} patch={patch} remove={remove} toggleFeat={toggleFeat} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NodeRow({ n, disabled, patch, remove, toggleFeat }) {
  const susp = !!n.suspicious;
  const feats = Array.isArray(n.features) ? n.features : [];
  const suggestSusp = feats.length > 0;
  const theme = susp ? 'border-rose-300 bg-rose-50/40' : 'border-emerald-200 bg-emerald-50/30';

  return (
    <div className={`border rounded-lg p-3 ${theme}`}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${susp ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-white'}`}>{susp ? 'Suspicious' : 'Benign / reactive'}</span>
        <div className="flex gap-1">
          {SIDES.map(([v, l]) => (
            <button key={v} type="button" disabled={disabled} onClick={() => patch(n.id, { side: n.side === v ? null : v })}
              className={`text-[11px] rounded px-2 py-0.5 border ${n.side === v ? 'bg-blue-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-500'}`}>{l}</button>
          ))}
        </div>
        <label className="text-[11px] text-gray-500 flex items-center gap-1">Short axis
          <input type="number" step="0.1" disabled={disabled} value={n.shortAxis ?? ''} onChange={(e) => patch(n.id, { shortAxis: e.target.value })}
            className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-sm disabled:bg-gray-50" /> mm
        </label>
        <div className="ml-auto flex items-center gap-2.5">
          <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer"><input type="checkbox" disabled={disabled} checked={!susp} onChange={() => patch(n.id, { suspicious: false })} /> None</label>
          <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer"><input type="checkbox" disabled={disabled} checked={susp} onChange={() => patch(n.id, { suspicious: true })} /> Suspicious</label>
          {!disabled && <button type="button" onClick={() => remove(n.id)} className="text-[11px] text-red-500 hover:text-red-700">Remove</button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LN_FEATURES.map(([v, l]) => {
          const on = feats.includes(v);
          return (
            <button key={v} type="button" disabled={disabled} onClick={() => toggleFeat(n, v)}
              className={`text-[11px] rounded-lg px-2 py-1 border transition ${on ? 'bg-rose-100 border-rose-400 text-rose-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>{l}</button>
          );
        })}
      </div>
      {suggestSusp && !susp && <div className="text-[11px] text-amber-600 mt-1.5">Selected features suggest a suspicious node — mark it Suspicious?</div>}

      <input type="text" disabled={disabled} defaultValue={n.note || ''} onBlur={(e) => patch(n.id, { note: e.target.value })}
        className="w-full mt-2 border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] disabled:bg-gray-50" placeholder="Note (optional) — e.g. FNA planned, matted to vessel…" />
    </div>
  );
}
