// Autosave drafts — shared wording/time helpers (kept out of .jsx files).
const sameDay = (a, b) => a.toDateString() === b.toDateString();

/** "19:42" today, "4 Oct, 19:42" on another day. */
export const draftTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(d, new Date())) return time;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
};

/** True when the draft was last saved on an earlier calendar day. */
export const isEarlierDay = (iso) => !!iso && !sameDay(new Date(iso), new Date());

/** "today 19:40" / "Sun 4 Oct, 19:40". */
export const draftWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(d, new Date())) return `today ${time}`;
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
};

/** Days until a draft (last saved at iso) is deleted — 14-day lifetime. */
export const daysLeft = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() + 14 * 864e5 - Date.now();
  return Math.max(0, Math.ceil(ms / 864e5));
};
