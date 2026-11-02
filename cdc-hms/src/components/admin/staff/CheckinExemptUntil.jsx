import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';

// The end date of "May sign in without checking in at the scanner" (2 Nov
// 2026), shown under that tick on the Access tab while it is ticked. Empty
// means no end date. Saved when the box is left (or Enter) — never while a
// date is still being typed, which passes through partial years like 0002.
// The day itself still counts (inclusive); from the next clinic day the
// person checks in again.

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const dayText = (iso) => new Date(`${iso}T12:00:00+03:00`).toLocaleDateString('en-GB', {
  timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});

/**
 * @param {string|null} props.value     the stored date ('YYYY-MM-DD') or null
 * @param {boolean}     props.disabled  the person viewing cannot change it
 * @param {boolean}     props.saving
 * @param {Function}    props.onSave    (date|null) => Promise
 */
const CheckinExemptUntil = ({ value, disabled, saving, onSave }) => {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => { setDraft(value || ''); }, [value]);

  const ended = value && value < today();
  const save = (next) => {
    setDraft(next);
    if ((next || null) === (value || null)) return;
    if (next && next < today()) { setDraft(value || ''); return; }   // the server refuses a past date too
    onSave(next || null);
  };

  return (
    <div className="ml-7 mb-2 flex items-center gap-2 flex-wrap text-xs text-gray-600">
      <label htmlFor="checkin-exempt-until">Until</label>
      <input
        id="checkin-exempt-until"
        type="date"
        value={draft}
        min={today()}
        disabled={disabled || saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => save(draft)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(draft); } }}
        className="px-2 py-1 border border-gray-300 rounded-md text-xs disabled:opacity-60"
      />
      {(draft || '') !== (value || '') && !disabled && (
        <button type="button" onClick={() => save(draft)} disabled={saving} className="text-primary font-semibold hover:underline">
          Save
        </button>
      )}
      {draft && !disabled && (
        <button type="button" onClick={() => save('')} disabled={saving} className="text-primary font-semibold hover:underline">
          No end date
        </button>
      )}
      {saving && <Loader className="w-3.5 h-3.5 animate-spin text-gray-400" aria-label="Saving" />}
      <span className="basis-full text-[11px] text-gray-400">
        {!value && 'No end date: they never need to check in before signing in.'}
        {value && !ended && `Through ${dayText(value)}; from the next clinic day they check in again.`}
        {ended && `Ended ${dayText(value)} — they must check in again before signing in.`}
      </span>
    </div>
  );
};

export default CheckinExemptUntil;
