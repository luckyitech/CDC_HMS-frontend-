import { useMemo, useState } from 'react';
import { CheckSquare, Square, StickyNote, History, Archive, RotateCcw, Plus, BookOpen } from 'lucide-react';
import { Section, inputCls, buttonCls, primaryButtonCls } from '../hrUi';
import { Pill } from '../hrFormat';
import { Inline } from './ManualBlocks';
import { stampOf } from './manualFormat';

/**
 * The shared HR checklist (HR Suite → Manual → Checklist): ONE list for the
 * clinic. Built-in items come from the manual (go-live setup, first-week
 * walkthrough) with stable keys; HR can add its own items to any section and
 * archive them. Every tick, untick, note, add and archive is kept as history.
 */

const ACTION_LABEL = {
  tick: 'Ticked', untick: 'Unticked', note: 'Note changed', add: 'Added', archive: 'Archived', restore: 'Restored',
};
const GROUPS = [
  { title: 'Go-live setup', match: (id) => id === 'golive' },
  { title: 'First-week walkthrough', match: (id) => /^day\d$/.test(id) },
];

const NoteEditor = ({ initial, onSave, onCancel, busy }) => {
  const [text, setText] = useState(initial || '');
  return (
    <div className="mt-2 space-y-2">
      <textarea aria-label="Note" className={`${inputCls} min-h-[4rem]`} maxLength={500} value={text}
        onChange={(e) => setText(e.target.value)} placeholder="A short note for the rest of HR (optional)" autoFocus />
      <div className="flex items-center gap-2">
        <button type="button" className={primaryButtonCls} disabled={busy} onClick={() => onSave(text.trim())}>Save note</button>
        <button type="button" className={buttonCls} onClick={onCancel}>Cancel</button>
        <span className="ml-auto text-[11px] text-gray-400">{text.length}/500</span>
      </div>
    </div>
  );
};

const ItemRow = ({ item, state, events, busy, onToggle, onNote, onStatus, onLink }) => {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const done = !!state?.done;
  const Box = done ? CheckSquare : Square;
  const label = item.c ? <Inline nodes={item.c} onLink={onLink} /> : item.text;
  return (
    <li className="py-2.5">
      <div className="flex gap-3">
        <button type="button" onClick={() => onToggle(item.key, !done)} disabled={busy} aria-pressed={done}
          aria-label={`${done ? 'Untick' : 'Tick'}: ${item.text}`}
          className={`mt-0.5 flex-none self-start rounded hover:text-primary disabled:opacity-60 ${done ? 'text-green-600' : 'text-gray-400'}`}>
          <Box className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className={`text-sm leading-relaxed ${done ? 'text-gray-500' : 'text-gray-800'}`}>{label}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
            {done && state?.doneBy && <span className="text-green-700">Ticked by {state.doneBy} · {stampOf(state.doneAt)}</span>}
            {item.isCustom && <span>Added by {state?.createdBy || 'HR'}{state?.createdAt ? ` · ${stampOf(state.createdAt)}` : ''}</span>}
          </div>
          {state?.note && !editing && (
            <div className="mt-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-gray-700">
              {state.note}
              <span className="block text-[11px] text-gray-500">{state.noteBy} · {stampOf(state.noteAt)}</span>
            </div>
          )}
          {editing && (
            <NoteEditor initial={state?.note} busy={busy} onCancel={() => setEditing(false)}
              onSave={async (note) => { if (await onNote(item.key, note)) setEditing(false); }} />
          )}
          {showHistory && (
            <ol className="mt-2 space-y-0.5 border-l-2 border-gray-100 pl-3 text-[11px] text-gray-500">
              {events.length === 0 && <li>No changes yet.</li>}
              {events.map((e) => (
                <li key={e.id}>
                  <span className="font-semibold text-gray-600">{ACTION_LABEL[e.action] || e.action}</span>
                  {' '}by {e.by || 'someone'} · {stampOf(e.at)}
                  {e.action === 'note' && (e.detail ? `: “${e.detail}”` : ' (cleared)')}
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-none items-start gap-1 print:hidden">
          <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title={state?.note ? 'Edit note' : 'Add a note'}
            aria-label={`${state?.note ? 'Edit note' : 'Add a note'}: ${item.text}`} onClick={() => setEditing((v) => !v)}>
            <StickyNote className="h-4 w-4" />
          </button>
          <button type="button" className={`rounded p-1 hover:bg-gray-100 hover:text-gray-700 ${showHistory ? 'text-primary' : 'text-gray-400'}`} title="History"
            aria-label={`History: ${item.text}`} onClick={() => setShowHistory((v) => !v)}>
            <History className="h-4 w-4" />
          </button>
          {item.isCustom && (
            <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Archive this item"
              aria-label={`Archive: ${item.text}`} disabled={busy} onClick={() => onStatus(item.key, 'archived')}>
              <Archive className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
};

const AddItem = ({ section, onAdd }) => {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    const ok = await onAdd(section, label.trim());
    setBusy(false);
    if (ok) setLabel('');
  };
  return (
    <form onSubmit={submit} className="mt-2 flex gap-2 print:hidden">
      <input aria-label={`Add an item to ${section}`} className={inputCls} maxLength={300} value={label}
        onChange={(e) => setLabel(e.target.value)} placeholder="Add an item of your own to this section" />
      <button type="submit" className={`${buttonCls} inline-flex items-center gap-1`} disabled={busy || !label.trim()}>
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </form>
  );
};

const ManualChecklist = ({ sections, data, busyKey, onToggle, onNote, onAdd, onStatus, onOpenSection, onLink }) => {
  const [showArchived, setShowArchived] = useState({});
  const byKey = data.byKey;
  const eventsByKey = useMemo(() => {
    const m = {};
    data.events.forEach((e) => { (m[e.key] ||= []).push(e); });
    return m;
  }, [data.events]);

  // Built-in items from the manual, then HR's own items for the same section.
  const view = useMemo(() => sections.map((s) => {
    const customs = data.items.filter((i) => i.isCustom && i.section === s.id);
    const items = [
      ...s.items.map((it) => ({ ...it, isCustom: false })),
      ...customs.filter((c) => c.status === 'active').map((c) => ({ key: c.key, text: c.label, isCustom: true })),
    ];
    const archived = customs.filter((c) => c.status !== 'active');
    const done = items.filter((it) => byKey[it.key]?.done).length;
    return { ...s, items, archived, done };
  }), [sections, data.items, byKey]);

  const total = view.reduce((n, s) => n + s.items.length, 0);
  const totalDone = view.reduce((n, s) => n + s.done, 0);
  const pct = total ? Math.round((totalDone / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">HR checklist</h3>
            <p className="text-xs text-gray-500">One list for the whole HR team. Ticks, notes and who did them are shared and kept.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{totalDone}<span className="text-sm font-medium text-gray-400"> / {total}</span></div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">done</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist progress">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Section>

      {GROUPS.map((g) => {
        const secs = view.filter((s) => g.match(s.id));
        if (!secs.length) return null;
        return (
          <div key={g.title} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{g.title}</h3>
            {secs.map((s) => (
              <Section key={s.id} className="hr-manual-checklist-section"
                title={s.title}
                actions={(
                  <div className="flex items-center gap-2">
                    <Pill tone={s.done === s.items.length && s.items.length ? 'ok' : 'n'}>{s.done} / {s.items.length}</Pill>
                    <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline print:hidden"
                      onClick={() => onOpenSection(s)}>
                      <BookOpen className="h-3.5 w-3.5" /> In the manual
                    </button>
                  </div>
                )}>
                <ul className="divide-y divide-gray-100">
                  {s.items.map((it) => (
                    <ItemRow key={it.key} item={it} state={byKey[it.key]} events={eventsByKey[it.key] || []}
                      busy={busyKey === it.key} onToggle={onToggle} onNote={onNote} onStatus={onStatus} onLink={onLink} />
                  ))}
                </ul>
                <AddItem section={s.id} onAdd={onAdd} />
                {s.archived.length > 0 && (
                  <div className="mt-2 print:hidden">
                    <button type="button" className="text-[11px] font-semibold text-gray-500 hover:text-gray-700"
                      onClick={() => setShowArchived((m) => ({ ...m, [s.id]: !m[s.id] }))}>
                      {showArchived[s.id] ? 'Hide' : 'Show'} archived ({s.archived.length})
                    </button>
                    {showArchived[s.id] && (
                      <ul className="mt-1 space-y-1">
                        {s.archived.map((c) => (
                          <li key={c.key} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="line-through">{c.label}</span>
                            <button type="button" className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-gray-600 hover:bg-gray-100"
                              onClick={() => onStatus(c.key, 'active')} aria-label={`Restore: ${c.label}`}>
                              <RotateCcw className="h-3 w-3" /> Restore
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Section>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default ManualChecklist;
