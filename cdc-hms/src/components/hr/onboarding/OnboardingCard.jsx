import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, X, StickyNote } from 'lucide-react';
import staffService from '../../../services/staffService';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import { notify } from '../../../utils/notify';
import { Pill } from '../hrFormat';
import { inputCls, buttonCls } from '../hrUi';
import { dueText } from './onboardingFormat';

/**
 * OnboardingCard — a person's onboarding checklist on their staff file
 * (HR Tier 3 Phase 3, mockup C; decisions T3-4 = a, O-1…O-8). Shown to
 * hr.onboarding holders whose scope reaches the person (the server answers
 * 404 otherwise, and the card stays hidden).
 *
 * Automatic items tick themselves from the file (contract on file, photo,
 * permissions set…) and can't be ticked by hand; HR ticks the others, with
 * who and when kept. A one-off item can be added for this person only. The
 * list completes itself when every item is done; HR can close it early.
 */

const ItemRow = ({ it, editable, onTick, onNote, onRemove }) => {
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState(it.note || '');
  return (
    <li className="py-2 flex flex-wrap items-start gap-2 text-sm border-t border-gray-100 first:border-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={it.done}
        aria-label={`${it.label}${it.auto ? ' (ticks itself)' : ''}`}
        disabled={!editable || it.auto}
        onClick={() => onTick(it)}
        className={`mt-0.5 w-4 h-4 flex-none rounded border flex items-center justify-center ${it.done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'} ${editable && !it.auto ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {it.done && <Check className="w-3 h-3" />}
      </button>
      <div className="flex-1 min-w-[10rem]">
        <span className={it.done ? 'text-gray-500' : 'text-gray-800'}>{it.label}</span>
        {it.auto && it.hint && <span className="block text-[11px] text-gray-400">{it.hint}</span>}
        {!it.auto && it.done && it.doneBy && (
          <span className="block text-[11px] text-gray-400">
            Ticked by {it.doneBy}{it.doneAt ? ` · ${new Date(it.doneAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
          </span>
        )}
        {it.note && !noting && <span className="block text-[11px] text-gray-500 italic">{it.note}</span>}
        {noting && (
          <div className="mt-1 flex gap-1">
            <input aria-label={`Note for ${it.label}`} className={`${inputCls} py-1`} value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className={buttonCls} onClick={async () => { await onNote(it, note); setNoting(false); }}>Save</button>
          </div>
        )}
      </div>
      {it.auto
        ? <Pill tone="n">automatic</Pill>
        : !it.done && it.dueDate && <Pill tone={it.overdue ? 'bad' : 'warn'}>{dueText(it.dueDate, it.overdue)}</Pill>}
      {it.auto && !it.done && it.dueDate && <Pill tone={it.overdue ? 'bad' : 'warn'}>{dueText(it.dueDate, it.overdue)}</Pill>}
      {editable && !it.auto && (
        <>
          <button type="button" className="text-gray-400 hover:text-gray-600" aria-label={`Add a note to ${it.label}`} onClick={() => setNoting((v) => !v)}><StickyNote className="w-3.5 h-3.5" /></button>
          <button type="button" className="text-gray-400 hover:text-red-600" aria-label={`Remove ${it.label}`} onClick={() => onRemove(it)}><X className="w-3.5 h-3.5" /></button>
        </>
      )}
    </li>
  );
};

const OnboardingCard = ({ employeeId, name, onMissing }) => {
  const [data, setData] = useState(undefined);   // undefined = loading; null = hidden
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDue, setNewDue] = useState('');
  const [confirm, setConfirm] = useState(null);   // 'close' | 'remove:<id>'

  const load = useCallback(async () => {
    try {
      const res = await staffService.getOnboarding(employeeId);
      setData(res?.data || null);
    } catch {
      setData(null);
      onMissing?.();
    }
  }, [employeeId, onMissing]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      setData((d) => ({ ...d, checklist: res?.data ?? d.checklist }));
      if (okMsg) notify('success', okMsg);
      return true;
    } catch (err) {
      notify('error', err.message || 'Something went wrong');
      return false;
    } finally { setBusy(false); }
  };

  if (data === undefined || data === null) return null;
  const c = data.checklist;
  const open = c?.status === 'open';

  if (!c) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Onboarding</h3>
            <p className="text-sm text-gray-600">No onboarding checklist{data.templateItems ? '' : ' — this role has no template yet'}.</p>
          </div>
          {data.templateItems > 0 && (
            <button type="button" className={buttonCls} disabled={busy}
              onClick={() => act(() => staffService.startOnboarding(employeeId), 'Checklist started')}>
              Start onboarding checklist
            </button>
          )}
        </div>
      </section>
    );
  }

  const tick = (it) => act(() => staffService.updateOnboardingItem(employeeId, it.id, { done: !it.done }));
  const saveNote = (it, note) => act(() => staffService.updateOnboardingItem(employeeId, it.id, { note }));
  const add = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    if (await act(() => staffService.addOnboardingItem(employeeId, { label: newLabel.trim(), dueDate: newDue || null }))) {
      setNewLabel(''); setNewDue('');
    }
  };

  const statusPill = c.status === 'complete'
    ? <Pill tone="ok">Complete</Pill>
    : c.status === 'closed' ? <Pill tone="n">Closed</Pill>
      : c.progress.overdue ? <Pill tone="bad">{c.progress.overdue} overdue</Pill> : <Pill tone="info">In progress</Pill>;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Onboarding{c.startDate ? ` · started ${new Date(`${c.startDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}` : ''}
        </h3>
        <span className="flex items-center gap-2 text-xs text-gray-500">
          {c.progress.done} of {c.progress.total} done {statusPill}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden my-2" aria-hidden="true">
        <span className="block h-full bg-primary transition-all" style={{ width: `${c.progress.percent}%` }} />
      </div>
      {c.status === 'closed' && c.closedNote && <p className="text-xs text-gray-500 mb-2">Closed early: {c.closedNote}</p>}
      <ul>
        {c.items.map((it) => (
          <ItemRow key={it.id} it={it} editable={open && !busy} onTick={tick} onNote={saveNote} onRemove={() => setConfirm(`remove:${it.id}`)} />
        ))}
      </ul>
      {open && (
        <form onSubmit={add} className="mt-3 flex flex-wrap gap-2">
          <input aria-label="New item for this person" placeholder={`Add an item for ${name || 'this person'} only`} className={`${inputCls} flex-1 min-w-[12rem]`}
            value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <input type="date" aria-label="Due date" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
          <button type="submit" className={buttonCls} disabled={busy || !newLabel.trim()}><Plus className="w-3.5 h-3.5 inline -mt-0.5" /> Add</button>
        </form>
      )}
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-gray-400">
        <span>Items marked automatic tick themselves from the staff file.</span>
        {open && <button type="button" className="text-gray-500 hover:underline" onClick={() => setConfirm('close')}>Close checklist early</button>}
        {c.status === 'closed' && (
          <button type="button" className="text-gray-500 hover:underline" onClick={() => act(() => staffService.setOnboardingStatus(employeeId, 'reopen'), 'Checklist reopened')}>Reopen</button>
        )}
      </div>

      <ConfirmActionModal
        isOpen={confirm === 'close'}
        onClose={() => setConfirm(null)}
        title="Close the onboarding checklist?"
        message="Unfinished items stay on the record as they are. You can reopen it later."
        confirmLabel="Close checklist"
        withReason
        reasonLabel="Why are you closing it? (required)"
        onConfirm={async (note) => { setConfirm(null); await act(() => staffService.setOnboardingStatus(employeeId, 'close', note), 'Checklist closed'); }}
      />
      <ConfirmActionModal
        isOpen={!!confirm && confirm.startsWith('remove:')}
        onClose={() => setConfirm(null)}
        title="Remove this item?"
        message="It comes off this person's checklist only. The template is not changed."
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={async () => {
          const id = Number(confirm.split(':')[1]);
          setConfirm(null);
          await act(() => staffService.updateOnboardingItem(employeeId, id, { remove: true }));
        }}
      />
    </section>
  );
};

export default OnboardingCard;
