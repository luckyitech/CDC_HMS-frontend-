import { sectionDef } from '../../constants/noteSections';
import { sanitizeNoteHtml, htmlToText } from '../../utils/noteHtml';

/**
 * A saved consultation note, read-only (Visit History, the day document, the
 * printed PDF). A note made of history sections (10 Oct 2026) shows each
 * section under its heading with its formatting; a note written before
 * sections shows its plain text as before.
 *
 * The HTML was sanitised on the way in (server) and is sanitised again here
 * — only bold / italic / underline / highlight / lists ever reach the page.
 */
const Badge = ({ className, children }) => (
  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}>{children}</span>
);

const itemsLine = (def, items) => {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  if (def.kind === 'chips') return list.filter((i) => i.value !== 'no').map((i) => i.item).join(', ');
  if (def.kind === 'meds') return null;   // rendered as two lists below
  return list.map((i) => `${i.item}: ${i.value}`).join(' · ');
};

const NoteSectionsView = ({ note, compact = false }) => {
  const sections = Array.isArray(note?.sections) ? note.sections : [];
  if (!sections.length) return <p className="whitespace-pre-wrap">{note?.notes}</p>;
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {sections.map((s) => {
        const def = sectionDef(s.key) || { label: s.key, kind: 'text' };
        const html = sanitizeNoteHtml(s.html);
        const ticks = itemsLine(def, s.items);
        const meds = def.kind === 'meds' ? (s.items || []) : [];
        const current = meds.filter((m) => m.value === 'current');
        const stopped = meds.filter((m) => m.value === 'stopped');
        return (
          <div key={s.id || s.key}>
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{def.label}</p>
              {s.reviewed && <Badge className="bg-green-50 text-green-700">Reviewed — no change</Badge>}
              {!s.reviewed && s.carriedFromSectionId && <Badge className="bg-amber-50 text-amber-800">Updated this visit</Badge>}
            </div>
            {ticks && <p className="text-gray-800">{ticks}</p>}
            {current.length > 0 && <ul className="list-disc pl-5">{current.map((m) => <li key={m.item}>{m.item}</li>)}</ul>}
            {stopped.length > 0 && <ul className="list-disc pl-5 text-gray-500">{stopped.map((m) => <li key={m.item} className="line-through">{m.item}</li>)}</ul>}
            {htmlToText(html) && (
              <div className="note-html" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NoteSectionsView;
