import { useState } from 'react';
import { X } from 'lucide-react';
import { isExternalAddress, recipientLabel } from './mailFormat';

const EMAIL_RE = /^[^\s@<>,;"]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

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

/**
 * A recipient row (To / Cc / Bcc): chips + a free-text box. Typing a comma,
 * semicolon or Enter — or leaving the box, or pasting a list — turns text into
 * chips. Addresses outside the clinic's domains carry the External tag; an
 * address that isn't valid is shown in red and blocks Send until fixed.
 * (Phase 3 adds suggestions from the staff directory and patient files.)
 */
const RecipientField = ({ label, value, onChange, domains, autoFocus = false, id }) => {
  const [text, setText] = useState('');

  const commit = (raw) => {
    const parsed = parseTyped(raw);
    if (!parsed.length) return;
    const seen = new Set(value.map((r) => r.address));
    onChange([...value, ...parsed.filter((r) => !seen.has(r.address) && seen.add(r.address))]);
    setText('');
  };

  const onKeyDown = (e) => {
    if (['Enter', ',', ';', 'Tab'].includes(e.key) && text.trim()) {
      e.preventDefault();
      commit(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex items-start gap-2 border-b px-3 py-1.5">
      <label htmlFor={id} className="w-14 flex-shrink-0 pt-1.5 text-xs text-gray-500">{label}</label>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {value.map((r) => {
          const external = r.valid !== false && isExternalAddress(r.address, domains);
          return (
            <span
              key={r.address} title={r.name ? `${r.name} <${r.address}>` : r.address}
              className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
                r.valid === false ? 'border-red-300 bg-red-50 text-red-800' : 'border-gray-200 bg-gray-50 text-gray-800'}`}
            >
              <span className="truncate">{recipientLabel(r)}</span>
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
          placeholder={value.length ? '' : 'name@example.com'}
          className="min-w-[10rem] flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none focus:ring-0"
          autoComplete="off"
          type="text"
          inputMode="email"
        />
      </div>
    </div>
  );
};

export default RecipientField;
