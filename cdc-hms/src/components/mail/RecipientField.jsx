import { useState, useEffect, useRef } from 'react';
import { X, Clock, IdCard, User } from 'lucide-react';
import mailService from '../../services/mailService';
import { isExternalAddress, recipientLabel } from './mailFormat';

const EMAIL_RE = /^[^\s@<>,;"]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const SUGGEST_DELAY_MS = 250;

/** "Dr A <a@b.org>, c@d.com; e@f.org" → [{ name, address, valid }]. */
export const parseTyped = (text) => String(text || '')
  .split(/[,;\n]+(?=(?:[^"]*"[^"]*")*[^"]*$)/)
  .map((chunk) => chunk.trim())
  .filter(Boolean)
  .map((chunk) => {
    const m = chunk.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
    const address = (m ? m[2] : chunk).trim().toLowerCase();
    const name = m ? m[1].trim() : '';
    return { name, address, valid: EMAIL_RE.test(address) };
  });

const GROUPS = [
  { key: 'recent', label: 'Recent', Icon: Clock },
  { key: 'staff', label: 'Staff', Icon: IdCard },
  { key: 'patients', label: 'Patients', Icon: User },
];

/** The suggestion rows in display order; a patient with no email can't be picked. */
const flatten = (s) => GROUPS.flatMap(({ key }) => (s[key] || []).map((item) => ({ ...item, group: key, pickable: !!item.address })));

/**
 * A recipient row (To / Cc / Bcc): chips + a free-text box. Typing a comma,
 * semicolon or Enter — or leaving the box, or pasting a list — turns text into
 * chips. Addresses outside the clinic's domains carry the External tag; an
 * address that isn't valid is shown in red and blocks Send until fixed.
 *
 * Phase 3a — suggestions as you type (two characters or more): people you
 * recently wrote to, staff, and patients (only for roles that can open patient
 * files; merged duplicates show once, under the surviving UHID). A patient
 * picked here carries a Patient tag on the chip. ↑/↓ move, Enter or Tab picks.
 */
const RecipientField = ({ label, value, onChange, domains, autoFocus = false, id, suggest = true }) => {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState(null);   // { recent, staff, patients }
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const reqRef = useRef(0);
  const listId = `${id}-suggestions`;

  const rows = suggestions ? flatten(suggestions) : [];
  const pickable = rows.filter((r) => r.pickable);

  // Fetch suggestions a moment after typing stops. A newer keystroke wins.
  useEffect(() => {
    const q = text.trim();
    if (!suggest || q.length < 2 || /[,;]/.test(q)) { setSuggestions(null); setOpen(false); return undefined; }
    const ticket = ++reqRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await mailService.suggest(q);
        if (ticket !== reqRef.current) return;
        const taken = new Set(value.map((r) => r.address));
        const d = res.data || {};
        const drop = (list) => (list || []).filter((r) => !r.address || !taken.has(r.address));
        const next = { recent: drop(d.recent), staff: drop(d.staff), patients: drop(d.patients) };
        setSuggestions(next);
        setActive(flatten(next).findIndex((r) => r.pickable));
        setOpen(true);
      } catch {
        if (ticket === reqRef.current) { setSuggestions(null); setOpen(false); }
      }
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(t);
    // `value` is read for filtering only; a chip change already clears `text`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, suggest]);

  const closeSuggestions = () => { reqRef.current += 1; setOpen(false); setSuggestions(null); setActive(-1); };

  const commit = (raw) => {
    const parsed = parseTyped(raw);
    if (!parsed.length) return;
    const seen = new Set(value.map((r) => r.address));
    onChange([...value, ...parsed.filter((r) => !seen.has(r.address) && seen.add(r.address))]);
    setText('');
    closeSuggestions();
  };

  const pick = (row) => {
    if (!row || !row.pickable) return;
    if (!value.some((r) => r.address === row.address)) {
      onChange([...value, {
        name: row.name || '', address: row.address, valid: true,
        ...(row.group === 'patients' ? { patient: { uhid: row.uhid } } : {}),
      }]);
    }
    setText('');
    closeSuggestions();
  };

  const move = (step) => {
    if (!pickable.length) return;
    const current = pickable.indexOf(rows[active]);
    const next = pickable[(current + step + pickable.length) % pickable.length];
    setActive(rows.indexOf(next));
  };

  const onKeyDown = (e) => {
    const showing = open && pickable.length > 0;
    if (showing && e.key === 'ArrowDown') { e.preventDefault(); move(1); return; }
    if (showing && e.key === 'ArrowUp') { e.preventDefault(); move(-1); return; }
    if (showing && e.key === 'Escape') { e.preventDefault(); closeSuggestions(); return; }
    if (showing && (e.key === 'Enter' || e.key === 'Tab') && rows[active]?.pickable) {
      e.preventDefault();
      pick(rows[active]);
      return;
    }
    if (['Enter', ',', ';', 'Tab'].includes(e.key) && text.trim()) {
      e.preventDefault();
      commit(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="relative flex items-start gap-2 border-b px-3 py-1.5">
      <label htmlFor={id} className="w-14 flex-shrink-0 pt-1.5 text-xs text-gray-500">{label}</label>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {value.map((r) => {
          const external = r.valid !== false && isExternalAddress(r.address, domains);
          return (
            <span
              key={r.address} title={r.patient ? `${r.name} · ${r.patient.uhid} <${r.address}>` : (r.name ? `${r.name} <${r.address}>` : r.address)}
              className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
                r.valid === false ? 'border-red-300 bg-red-50 text-red-800' : 'border-gray-200 bg-gray-50 text-gray-800'}`}
            >
              <span className="truncate">{recipientLabel(r)}</span>
              {r.patient && <span className="rounded bg-violet-50 px-1 text-[10px] font-semibold text-violet-800">Patient</span>}
              {external && <span className="rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-800">External</span>}
              {r.valid === false && <span className="text-[10px] font-semibold">Check address</span>}
              <button
                type="button" aria-label={`Remove ${r.address}`}
                onClick={() => onChange(value.filter((x) => x.address !== r.address))}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          id={id} autoFocus={autoFocus} value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(text)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (/[,;\n]/.test(pasted)) { e.preventDefault(); commit(`${text}${pasted}`); }
          }}
          placeholder={value.length ? '' : 'Name, UHID or email'}
          className="min-w-[10rem] flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none focus:ring-0"
          autoComplete="off"
          type="text"
          role="combobox"
          aria-expanded={open && rows.length > 0}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        />
      </div>

      {open && rows.length > 0 && (
        <div
          id={listId} role="listbox"
          // Clicking a suggestion must not blur the input first (blur commits the typed text).
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-16 right-3 top-full z-30 mt-0.5 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {GROUPS.map(({ key, label: groupLabel, Icon }) => {
            const list = rows.filter((r) => r.group === key);
            if (!list.length) return null;
            return (
              <div key={key}>
                <div className="px-3 pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{groupLabel}</div>
                {list.map((r) => {
                  const idx = rows.indexOf(r);
                  const detail = r.group === 'patients'
                    ? [r.uhid, r.yearOfBirth ? `b. ${r.yearOfBirth}` : null, r.address || 'no email on file'].filter(Boolean).join(' · ')
                    : r.group === 'staff' ? [r.address, r.title].filter(Boolean).join(' · ') : r.address;
                  return (
                    <div
                      key={`${key}-${r.uhid || r.address}`} id={`${listId}-${idx}`}
                      role="option" aria-selected={idx === active} aria-disabled={!r.pickable}
                      onMouseEnter={() => r.pickable && setActive(idx)}
                      onClick={() => pick(r)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
                        !r.pickable ? 'cursor-default text-gray-400' : idx === active ? 'cursor-pointer bg-blue-50' : 'cursor-pointer hover:bg-gray-50'}`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                      <span className={`truncate ${r.pickable ? 'text-gray-800' : ''}`}>{r.name || r.address}</span>
                      <span className="truncate text-xs text-gray-500">{detail}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {suggestions && suggestions.patients?.length > 0 && (
            <div className="border-t px-3 pb-1 pt-1.5 text-[11px] text-gray-400">
              Merged duplicates show once, under the surviving UHID.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipientField;
