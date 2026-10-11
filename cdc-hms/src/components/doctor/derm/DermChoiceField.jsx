import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MAX_TERM, asList, isFixed, labelOf } from './dermExam';

/**
 * DermChoiceField — one examination choice with "Other…" (9 Oct 2026, Emu:
 * every choice needs Other).
 *
 * Fixed words are chips. Words this clinic typed before for this field are
 * offered as dashed chips ("used before"). "Other…" opens a box: for a
 * single choice the typed word IS the answer; for a multiple choice it is
 * added to the list (Enter or Add) and shown as a chip with ×.
 *
 * Props:
 *   field      the spec from dermExam.js ({ key, label, kind: 'one'|'many', options })
 *   value      'token' | 'typed word' | '' (one) — or an array (many)
 *   onChange(next)
 *   learned    [{ name, uses }] typed before for this field
 *   hint, disabled, idPrefix, compact (no label)
 */
const chipCls = (on, extra = '') => `rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60 ${on
  ? 'border-primary bg-primary text-white'
  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'} ${extra}`;

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

const DermChoiceField = ({ field, value, onChange, learned = [], hint, disabled = false, idPrefix = 'derm', compact = false }) => {
  const many = field.kind === 'many';
  const list = many ? asList(value) : (value ? [value] : []);
  const typedNow = list.filter((v) => !isFixed(field.key, v) && !learned.some((l) => same(l.name, v)));
  const [otherOpen, setOtherOpen] = useState(() => !many && typedNow.length > 0);
  const [draft, setDraft] = useState('');
  const inputId = `${idPrefix}-${field.key}-other`;

  const has = (v) => list.some((x) => same(x, v));
  const toggle = (v) => {
    if (disabled) return;
    if (many) onChange(has(v) ? list.filter((x) => !same(x, v)) : [...list, v]);
    else { onChange(has(v) ? '' : v); setOtherOpen(false); }
  };
  const clean = (t) => t.replace(/\s+/g, ' ').trim().replace(/,/g, '');
  const addTyped = () => {
    const t = clean(draft);
    if (!t) return;
    if (!has(t)) onChange([...list, t.slice(0, MAX_TERM)]);
    setDraft('');
  };

  // Single choice: the box holds the answer itself while "Other…" is chosen.
  const singleTyped = !many && value && !isFixed(field.key, value) && (otherOpen || !learned.some((l) => same(l.name, value))) ? value : '';
  const otherOn = many ? otherOpen : (otherOpen || !!singleTyped);

  return (
    <div className="flex min-w-0 flex-col gap-1" data-field={field.key}>
      {!compact && (
        <span className="text-xs font-semibold text-gray-500">
          {field.label}{many && <span className="font-normal text-gray-400"> · choose all that apply</span>}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {field.options.map(([t, l]) => (
          <button key={t} type="button" disabled={disabled} aria-pressed={has(t)} onClick={() => toggle(t)}
            className={chipCls(has(t), t === 'none' || t === 'absent' || t === 'normal' ? (has(t) ? '' : 'text-gray-500') : '')}>
            {l}
          </button>
        ))}
        {learned.map((l) => (
          <button key={`l-${l.name}`} type="button" disabled={disabled} aria-pressed={has(l.name)} onClick={() => toggle(l.name)}
            title="Typed before in this clinic" className={chipCls(has(l.name), has(l.name) ? '' : 'border-dashed')}>
            {l.name}
          </button>
        ))}
        {many && typedNow.map((v) => (
          <span key={`t-${v}`} className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary py-0.5 pl-2.5 pr-1 text-xs font-medium text-white">
            {labelOf(field.key, v)}
            <button type="button" disabled={disabled} onClick={() => toggle(v)} aria-label={`Remove ${v}`} className="rounded-full p-0.5 hover:bg-blue-700"><X size={11} /></button>
          </span>
        ))}
        <button type="button" disabled={disabled} aria-pressed={otherOn} aria-expanded={otherOn} aria-controls={inputId}
          onClick={() => {
            if (!many && otherOn) { setOtherOpen(false); if (singleTyped) onChange(''); return; }
            setOtherOpen(!otherOn);
            if (!many && !otherOn && isFixed(field.key, value)) onChange('');
          }}
          className={chipCls(!many && otherOn, 'border-dashed')}>
          Other…
        </button>
      </div>
      {otherOn && (many ? (
        <div className="flex max-w-sm items-center gap-1.5">
          <input id={inputId} autoFocus disabled={disabled} value={draft} maxLength={MAX_TERM}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTyped(); } }}
            placeholder={`Type a ${field.label.toLowerCase()} word — offered next time`}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />
          <button type="button" disabled={disabled || !clean(draft)} onClick={addTyped}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Plus size={12} /> Add
          </button>
        </div>
      ) : (
        <input id={inputId} autoFocus disabled={disabled} value={singleTyped} maxLength={MAX_TERM}
          onChange={(e) => onChange(e.target.value.replace(/,/g, ''))}
          placeholder={`Type the ${field.label.toLowerCase()} — offered next time`}
          className="max-w-sm rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />
      ))}
      {hint && <span className="text-[11px] text-gray-500">{hint}</span>}
    </div>
  );
};

export default DermChoiceField;
