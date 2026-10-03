import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Archive, RotateCcw, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canRunOnboarding, canEditOnboardingTemplates } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import { notify } from '../../utils/notify';
import { Pill } from '../../components/hr/hrFormat';
import { Section, inputCls, buttonCls } from '../../components/hr/hrUi';
import { ROLE_LABEL, dueText, clinicToday } from '../../components/hr/onboarding/onboardingFormat';

/**
 * OnboardingChecklists — /hr/onboarding (HR Tier 3 Phase 3, mockup C;
 * decisions T3-4 = a, O-1…O-8).
 *
 * In progress / Completed: every checklist in the viewer's hr.onboarding scope,
 * with progress and the next date due; each opens the staff file, where it is
 * ticked. Templates: the checklist each role starts with (hr.onboarding.templates
 * to change; hr.onboarding may read). A new hire's checklist is a COPY of the
 * template at that moment, so editing here never changes a list in progress.
 */

const ProgressRow = ({ r }) => {
  const today = clinicToday();
  return (
    <li className="py-3 flex flex-wrap items-center gap-3 border-t border-gray-100 first:border-0">
      <div className="flex-1 min-w-[12rem]">
        <Link to={`/hr/staff/${r.person.employeeId}`} className="text-sm font-semibold text-gray-800 hover:underline">{r.person.name}</Link>
        <span className="block text-xs text-gray-500">
          {[ROLE_LABEL[r.person.role] || r.person.role, r.person.position, r.person.department].filter(Boolean).join(' · ')}
          {r.startDate ? ` · started ${new Date(`${r.startDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}` : ''}
        </span>
      </div>
      <div className="w-40 max-w-full">
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
          <span className={`block h-full ${r.status === 'complete' ? 'bg-green-600' : 'bg-primary'}`} style={{ width: `${r.progress.percent}%` }} />
        </div>
        <span className="text-[11px] text-gray-500 tabular-nums">{r.progress.done} of {r.progress.total} done</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {r.status === 'complete' && <Pill tone="ok">Complete</Pill>}
        {r.status === 'closed' && <Pill tone="n">Closed</Pill>}
        {r.status === 'open' && r.progress.overdue > 0 && <Pill tone="bad">{r.progress.overdue} overdue</Pill>}
        {r.status === 'open' && r.nextDue && !r.progress.overdue && <Pill tone="warn">{dueText(r.nextDue, r.nextDue < today)}</Pill>}
      </div>
    </li>
  );
};

const TemplateLine = ({ line, autoItems, editable, first, last, onSave, onMove }) => {
  const [edit, setEdit] = useState(null);
  const auto = autoItems.find((a) => a.key === line.autoKey);
  if (edit) {
    return (
      <li className="py-2 flex flex-wrap items-center gap-2 border-t border-gray-100 first:border-0">
        <input aria-label="Item" className={`${inputCls} flex-1 min-w-[12rem]`} value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
        <select aria-label="Ticks itself when" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={edit.autoKey || ''} onChange={(e) => setEdit({ ...edit, autoKey: e.target.value })}>
          <option value="">HR ticks it</option>
          {autoItems.map((a) => <option key={a.key} value={a.key}>Automatic: {a.label}</option>)}
        </select>
        <input aria-label="Due in days" type="number" min="0" max="365" className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm" placeholder="days" value={edit.dueDays ?? ''} onChange={(e) => setEdit({ ...edit, dueDays: e.target.value })} />
        <button type="button" className={buttonCls} aria-label="Save" onClick={async () => { if (await onSave(line, { label: edit.label, autoKey: edit.autoKey || null, dueDays: edit.dueDays === '' ? null : Number(edit.dueDays) })) setEdit(null); }}><Check className="w-3.5 h-3.5" /></button>
        <button type="button" className={buttonCls} aria-label="Cancel" onClick={() => setEdit(null)}><X className="w-3.5 h-3.5" /></button>
      </li>
    );
  }
  return (
    <li className={`py-2 flex flex-wrap items-center gap-2 border-t border-gray-100 first:border-0 text-sm ${line.status !== 'active' ? 'opacity-50' : ''}`}>
      <span className="flex-1 min-w-[12rem] text-gray-800">
        {line.label}
        {auto && <span className="block text-[11px] text-gray-400">Ticks itself: {auto.hint}</span>}
      </span>
      <Pill tone={auto ? 'n' : 'info'}>{auto ? 'automatic' : 'HR ticks'}</Pill>
      <span className="text-xs text-gray-500 w-24 tabular-nums">{line.dueDays === null ? 'no due date' : `due in ${line.dueDays} d`}</span>
      {line.status !== 'active' && <Pill tone="warn">archived</Pill>}
      {editable && (
        <span className="flex gap-1">
          {line.status === 'active' && (
            <>
              <button type="button" className={buttonCls} disabled={first} aria-label={`Move ${line.label} up`} onClick={() => onMove(line, -1)}><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" className={buttonCls} disabled={last} aria-label={`Move ${line.label} down`} onClick={() => onMove(line, 1)}><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" className={buttonCls} aria-label={`Edit ${line.label}`} onClick={() => setEdit({ label: line.label, autoKey: line.autoKey || '', dueDays: line.dueDays ?? '' })}><Pencil className="w-3.5 h-3.5" /></button>
            </>
          )}
          <button type="button" className={buttonCls} aria-label={line.status === 'active' ? `Archive ${line.label}` : `Restore ${line.label}`}
            onClick={() => onSave(line, { status: line.status === 'active' ? 'archived' : 'active' })}>
            {line.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>
        </span>
      )}
    </li>
  );
};

const Templates = ({ editable }) => {
  const [data, setData] = useState(null);
  const [role, setRole] = useState('nurse');
  const [label, setLabel] = useState('');
  const [autoKey, setAutoKey] = useState('');
  const [dueDays, setDueDays] = useState('7');

  const load = useCallback(async () => {
    try { setData((await hrService.onboardingTemplates())?.data || null); }
    catch (err) { notify('error', err.message || 'Could not load the templates'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Spinner />;
  const lines = data.items.filter((l) => l.role === role);
  const active = lines.filter((l) => l.status === 'active');
  const archived = lines.filter((l) => l.status !== 'active');

  const save = async (line, body) => {
    try {
      const res = await hrService.updateTemplateItem(line.id, body);
      setData((d) => ({ ...d, items: d.items.map((x) => (x.id === line.id ? res.data : x)) }));
      return true;
    } catch (err) { notify('error', err.message || 'Could not save'); return false; }
  };
  const move = async (line, dir) => {
    const i = active.findIndex((l) => l.id === line.id);
    const other = active[i + dir];
    if (!other) return;
    await save(line, { sortOrder: other.sortOrder });
    await save(other, { sortOrder: line.sortOrder });
  };
  const add = async (e) => {
    e.preventDefault();
    try {
      const res = await hrService.addTemplateItem({ role, label: label.trim(), autoKey: autoKey || null, dueDays: dueDays === '' ? null : Number(dueDays) });
      setData((d) => ({ ...d, items: [...d.items, res.data] }));
      setLabel(''); setAutoKey('');
    } catch (err) { notify('error', err.message || 'Could not add the item'); }
  };

  return (
    <Section title="Checklist each role starts with">
      <div className="flex flex-wrap gap-1 mb-3" role="tablist" aria-label="Role">
        {data.roles.map((r) => (
          <button key={r.key} type="button" role="tab" aria-selected={role === r.key}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${role === r.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setRole(r.key)}>
            {r.label} <span className="opacity-70">{data.items.filter((l) => l.role === r.key && l.status === 'active').length}</span>
          </button>
        ))}
      </div>
      {!active.length && <p className="text-sm text-gray-500 mb-2">No items — a new {ROLE_LABEL[role]?.toLowerCase()} gets no checklist until you add some.</p>}
      <ul>
        {[...active, ...archived].map((l) => (
          <TemplateLine key={l.id} line={l} autoItems={data.autoItems} editable={editable}
            first={l.id === active[0]?.id} last={l.id === active[active.length - 1]?.id} onSave={save} onMove={move} />
        ))}
      </ul>
      {editable ? (
        <form onSubmit={add} className="mt-3 flex flex-wrap gap-2">
          <input aria-label="New template item" placeholder={`Add an item for every new ${ROLE_LABEL[role]?.toLowerCase()}`} className={`${inputCls} flex-1 min-w-[12rem]`} value={label} onChange={(e) => setLabel(e.target.value)} />
          <select aria-label="New item ticks itself when" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={autoKey} onChange={(e) => setAutoKey(e.target.value)}>
            <option value="">HR ticks it</option>
            {data.autoItems.map((a) => <option key={a.key} value={a.key}>Automatic: {a.label}</option>)}
          </select>
          <input aria-label="New item due in days" type="number" min="0" max="365" className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm" value={dueDays} onChange={(e) => setDueDays(e.target.value)} placeholder="days" />
          <button type="submit" className={buttonCls} disabled={label.trim().length < 2}><Plus className="w-3.5 h-3.5 inline -mt-0.5" /> Add</button>
        </form>
      ) : (
        <p className="text-xs text-gray-500 mt-3">Changing the templates needs &quot;Onboarding templates&quot;.</p>
      )}
      <p className="text-[11px] text-gray-400 mt-3">Due dates count from the start date on the staff file. Changes apply to new checklists only — lists already in progress keep the items they started with.</p>
    </Section>
  );
};

const OnboardingChecklists = () => {
  const { currentUser } = useUserContext();
  const canRun = canRunOnboarding(currentUser);
  const canEdit = canEditOnboardingTemplates(currentUser);
  const [tab, setTab] = useState(canRun ? 'open' : 'templates');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!canRun || tab === 'templates') return;
    setRows(null);
    hrService.onboardingList(tab === 'done' ? 'all' : 'open')
      .then((res) => setRows((res?.data || []).filter((r) => (tab === 'done' ? r.status !== 'open' : true))))
      .catch((err) => { notify('error', err.message || 'Could not load checklists'); setRows([]); });
  }, [canRun, tab]);

  if (!canRun && !canEdit) {
    return (
      <div className="p-4">
        <PageHeader title="Onboarding" />
        <p className="text-sm text-gray-500">You don&apos;t have access to onboarding checklists.</p>
      </div>
    );
  }

  const tabs = [
    ...(canRun ? [{ key: 'open', label: 'In progress' }, { key: 'done', label: 'Completed' }] : []),
    { key: 'templates', label: 'Templates' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-5xl">
      <PageHeader title="Onboarding" subtitle="New colleagues' checklists, and the template each role starts with" />
      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold -mb-px border-b-2 ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'templates' ? <Templates editable={canEdit} /> : (
        <Section>
          {!rows ? <Spinner /> : rows.length === 0 ? (
            <p className="text-sm text-gray-500">{tab === 'open' ? 'Nobody is being onboarded right now. A checklist starts by itself when the Onboard wizard creates an account.' : 'No completed or closed checklists yet.'}</p>
          ) : (
            <ul>{rows.map((r) => <ProgressRow key={r.id} r={r} />)}</ul>
          )}
        </Section>
      )}
    </div>
  );
};

export default OnboardingChecklists;
