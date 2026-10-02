import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw, Check, X } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canManageLists } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import { notify } from '../../utils/notify';
import { Pill } from '../../components/hr/hrFormat';
import { Section, inputCls, buttonCls, primaryButtonCls } from '../../components/hr/hrUi';

/**
 * StaffLists — /hr/lists (HR Tier 3 Phase 1, mockup A of hr-tier3-mockup).
 *
 * The clinic's Departments and Positions lists that staff files pick from, and
 * the one-off TIDY screen: the free text typed on staff files before the lists
 * existed, grouped by spelling, each mapped onto a list entry. Nothing changes
 * until "Apply". Gate: hr.lists (canManageLists) — reading the lists is open
 * to every member of staff (pickers), changing them is not.
 *
 * Archiving refuses while an active staff file uses the entry (the API says
 * how many). A rename reaches every file that uses it.
 */

const CADRES = [
  { value: '', label: 'Any cadre' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'lab', label: 'Lab' },
  { value: 'staff', label: 'Staff' },
];
const cadreLabel = (c) => CADRES.find((x) => x.value === (c || ''))?.label || 'Any cadre';

const ListCard = ({ title, list, entries, onAdd, onRename, onStatus, withCadre }) => {
  const [name, setName] = useState('');
  const [cadre, setCadre] = useState('');
  const [editing, setEditing] = useState(null);   // { id, name, cadre }
  const [busy, setBusy] = useState(false);
  const singular = list === 'departments' ? 'department' : 'position';

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const ok = await onAdd({ name: name.trim(), ...(withCadre ? { cadre: cadre || null } : {}) });
    setBusy(false);
    if (ok) { setName(''); setCadre(''); }
  };
  const save = async () => {
    setBusy(true);
    const ok = await onRename(editing.id, { name: editing.name, ...(withCadre ? { cadre: editing.cadre || null } : {}) });
    setBusy(false);
    if (ok) setEditing(null);
  };

  const active = entries.filter((x) => x.status === 'active');
  const archived = entries.filter((x) => x.status !== 'active');

  return (
    <Section title={title} className="min-w-0">
      {entries.length === 0 && <p className="text-sm text-gray-500 mb-3">No {singular} on the list yet.</p>}
      <ul className="divide-y divide-gray-100">
        {[...active, ...archived].map((x) => (
          <li key={x.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
            {editing?.id === x.id ? (
              <>
                <input aria-label={`Rename ${x.name}`} className={`${inputCls} flex-1 min-w-[10rem]`} value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                {withCadre && (
                  <select aria-label="Cadre" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={editing.cadre || ''}
                    onChange={(e) => setEditing({ ...editing, cadre: e.target.value })}>
                    {CADRES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                )}
                <button type="button" className={buttonCls} onClick={save} disabled={busy} aria-label="Save"><Check className="w-3.5 h-3.5" /></button>
                <button type="button" className={buttonCls} onClick={() => setEditing(null)} aria-label="Cancel"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <span className={`flex-1 min-w-[9rem] ${x.status !== 'active' ? 'text-gray-400' : 'text-gray-800'}`}>{x.name}</span>
                {withCadre && <span className="text-xs text-gray-500">{cadreLabel(x.cadre)}</span>}
                <span className="text-xs text-gray-500 tabular-nums">{x.staffCount} staff</span>
                <Pill tone={x.status === 'active' ? 'n' : 'warn'}>{x.status}</Pill>
                {x.status === 'active' && (
                  <button type="button" className={buttonCls} aria-label={`Rename ${x.name}`}
                    onClick={() => setEditing({ id: x.id, name: x.name, cadre: x.cadre || '' })}><Pencil className="w-3.5 h-3.5" /></button>
                )}
                <button type="button" className={buttonCls}
                  aria-label={x.status === 'active' ? `Archive ${x.name}` : `Restore ${x.name}`}
                  title={x.status === 'active' && x.staffCount ? 'Move its staff to another entry first' : undefined}
                  onClick={() => onStatus(x)}>
                  {x.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex flex-wrap gap-2">
        <input aria-label={`New ${singular}`} placeholder={`Add a ${singular}`} className={`${inputCls} flex-1 min-w-[10rem]`}
          value={name} onChange={(e) => setName(e.target.value)} />
        {withCadre && (
          <select aria-label="Cadre for the new position" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={cadre} onChange={(e) => setCadre(e.target.value)}>
            {CADRES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
        <button type="submit" className={buttonCls} disabled={busy || !name.trim()}><Plus className="w-3.5 h-3.5 inline -mt-0.5" /> Add</button>
      </form>
    </Section>
  );
};

/** One tidy table: today's spellings → a list entry. */
const TidyTable = ({ kind, groups, entries, choice, setChoice, onAddFrom }) => {
  if (!groups.length) return <p className="text-sm text-gray-500">Every staff file is already linked to a {kind}.</p>;
  const active = entries.filter((x) => x.status === 'active');
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-3 font-semibold">Typed today</th>
            <th className="py-2 pr-3 font-semibold">Staff</th>
            <th className="py-2 font-semibold">Becomes</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key || '_blank'} className="border-b border-gray-100 align-top">
              <td className="py-2 pr-3">
                {g.key ? g.spellings.map((s) => `“${s}”`).join(', ') : <span className="text-gray-400">(blank)</span>}
              </td>
              <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                {g.staff}{g.archived ? <span className="text-gray-400"> + {g.archived} archived</span> : null}
              </td>
              <td className="py-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <select aria-label={`${kind} for ${g.key || 'blank'}`} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm max-w-full"
                    value={choice[g.key] ?? ''} onChange={(e) => setChoice({ ...choice, [g.key]: e.target.value })}>
                    <option value="">Leave as it is</option>
                    {active.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  {g.key && !active.some((x) => x.id === Number(choice[g.key])) && (
                    <button type="button" className={buttonCls} onClick={() => onAddFrom(g)}>
                      Add “{g.spellings[0]}” to the list
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const StaffLists = () => {
  const { currentUser } = useUserContext();
  const allowed = canManageLists(currentUser);
  const [lists, setLists] = useState(null);
  const [tidy, setTidy] = useState(null);
  const [deptChoice, setDeptChoice] = useState({});
  const [posChoice, setPosChoice] = useState({});
  const [confirm, setConfirm] = useState(null);   // { kind: 'status', list, entry } | { kind: 'tidy' }
  const [applying, setApplying] = useState(false);

  const preselect = (groups, set) => set(Object.fromEntries(groups.filter((g) => g.suggestedId).map((g) => [g.key, String(g.suggestedId)])));

  const load = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([hrService.lists(), hrService.listsTidy()]);
      setLists(l?.data || { departments: [], positions: [] });
      const td = t?.data || { departments: [], positions: [] };
      setTidy(td);
      preselect(td.departments, setDeptChoice);
      preselect(td.positions, setPosChoice);
    } catch (e) { notify('error', e?.message || 'Could not load the lists'); }
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const refreshLists = async () => {
    const l = await hrService.lists();
    if (l?.success) setLists(l.data);
    return l?.data;
  };

  const add = (list) => async (body) => {
    try {
      const res = await hrService.addListEntry(list, body);
      if (!res?.success) { notify('error', res?.message || 'Could not add it'); return null; }
      notify('success', `${res.data.name} added.`);
      await refreshLists();
      return res.data;
    } catch (e) { notify('error', e?.message || 'Could not add it'); return null; }
  };
  const rename = (list) => async (id, body) => {
    try {
      const res = await hrService.updateListEntry(list, id, body);
      if (!res?.success) { notify('error', res?.message || 'Could not save'); return false; }
      notify('success', res.data.filesRenamed ? `Saved — ${res.data.filesRenamed} staff file${res.data.filesRenamed === 1 ? '' : 's'} updated.` : 'Saved.');
      await refreshLists();
      return true;
    } catch (e) { notify('error', e?.message || 'Could not save'); return false; }
  };
  const doStatus = async () => {
    const { list, entry } = confirm;
    setConfirm(null);
    try {
      const res = await hrService.updateListEntry(list, entry.id, { status: entry.status === 'active' ? 'archived' : 'active' });
      if (!res?.success) { notify('error', res?.message || 'Could not change it'); return; }
      await refreshLists();
    } catch (e) { notify('error', e?.message || 'Could not change it'); }
  };

  const addFrom = (list, setChoice, choice) => async (group) => {
    const created = await add(list)({ name: group.spellings[0] });
    if (created) setChoice({ ...choice, [group.key]: String(created.id) });
  };

  const counts = useMemo(() => {
    if (!tidy) return { files: 0 };
    const n = (groups, choice) => groups.filter((g) => choice[g.key]).reduce((s, g) => s + g.staff + g.archived, 0);
    return { files: n(tidy.departments, deptChoice) + n(tidy.positions, posChoice) };
  }, [tidy, deptChoice, posChoice]);

  const applyTidy = async () => {
    setConfirm(null);
    setApplying(true);
    try {
      const body = {
        departments: Object.entries(deptChoice).filter(([, v]) => v).map(([key, v]) => ({ key, departmentId: Number(v) })),
        positions: Object.entries(posChoice).filter(([, v]) => v).map(([key, v]) => ({ key, positionId: Number(v) })),
      };
      const res = await hrService.applyListsTidy(body);
      if (!res?.success) { notify('error', res?.message || 'Could not apply'); return; }
      const { departments: nd = 0, positions: np = 0 } = res.data.linked || {};
      notify('success', `Linked ${nd} department and ${np} position${np === 1 ? '' : 's'} on staff files.`);
      await load();
    } catch (e) { notify('error', e?.message || 'Could not apply'); }
    finally { setApplying(false); }
  };

  if (!allowed) {
    return (
      <div className="space-y-4">
        <PageHeader title="Departments & positions" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          Managing departments and positions needs the “Departments and positions” permission.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Departments & positions" subtitle="The lists staff files pick from" />
      {!lists || !tidy ? <Spinner /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Departments" list="departments" entries={lists.departments}
              onAdd={add('departments')} onRename={rename('departments')} onStatus={(entry) => setConfirm({ kind: 'status', list: 'departments', entry })} />
            <ListCard title="Positions" list="positions" entries={lists.positions} withCadre
              onAdd={add('positions')} onRename={rename('positions')} onStatus={(entry) => setConfirm({ kind: 'status', list: 'positions', entry })} />
          </div>

          {(tidy.departments.length > 0 || tidy.positions.length > 0) && (
            <Section title="Tidy what's already typed" className="ring-2 ring-primary/30">
              <p className="text-sm text-gray-600 mb-3">
                The text on staff files from before the lists, grouped by spelling. Choose the list entry each one becomes;
                nothing changes until you press Apply. Rows left as they are stay unlinked, and anyone without a department
                is visible only to colleagues who look after all staff.
              </p>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-2 mb-1">Departments</h4>
              <TidyTable kind="department" groups={tidy.departments} entries={lists.departments}
                choice={deptChoice} setChoice={setDeptChoice} onAddFrom={addFrom('departments', setDeptChoice, deptChoice)} />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-1">Positions</h4>
              <TidyTable kind="position" groups={tidy.positions} entries={lists.positions}
                choice={posChoice} setChoice={setPosChoice} onAddFrom={addFrom('positions', setPosChoice, posChoice)} />
              <div className="mt-4 flex justify-end">
                <button type="button" className={primaryButtonCls} disabled={applying || counts.files === 0}
                  onClick={() => setConfirm({ kind: 'tidy' })}>
                  {applying ? 'Applying…' : `Apply to ${counts.files} staff file${counts.files === 1 ? '' : 's'}`}
                </button>
              </div>
            </Section>
          )}
        </>
      )}

      <ConfirmActionModal
        isOpen={confirm?.kind === 'status'}
        onClose={() => setConfirm(null)}
        onConfirm={doStatus}
        title={confirm?.entry?.status === 'active' ? `Archive “${confirm?.entry?.name}”?` : `Restore “${confirm?.entry?.name}”?`}
        message={confirm?.entry?.status === 'active'
          ? 'It will no longer be offered on staff files. It can be restored later. Staff files still using it must be moved first.'
          : 'It will be offered on staff files again.'}
        confirmLabel={confirm?.entry?.status === 'active' ? 'Archive' : 'Restore'}
      />
      <ConfirmActionModal
        isOpen={confirm?.kind === 'tidy'}
        onClose={() => setConfirm(null)}
        onConfirm={applyTidy}
        title="Link staff files to the lists?"
        message={`${counts.files} staff file${counts.files === 1 ? '' : 's'} will be linked to the entries you chose. Each change is logged on the person's file.`}
        confirmLabel="Apply"
      />
    </div>
  );
};

export default StaffLists;
