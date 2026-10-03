import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Archive, RotateCcw, Check, X, Lock, Unlock, UserPlus } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canRunAppraisals, canReadAppraisals } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import { notify } from '../../utils/notify';
import { Pill } from '../../components/hr/hrFormat';
import { Section, Field, inputCls, buttonCls, primaryButtonCls } from '../../components/hr/hrUi';
import { STATUS_TONE, APPRAISALS_CHANGED, shortDate } from '../../components/hr/appraisals/appraisalFormat';

/**
 * Appraisals — /hr/appraisals (HR Tier 3 Phase 5, mockup E; T3-9 a, T3-10 a).
 *
 * Mine: my own appraisals and the ones I review — everyone.
 * Cycle: the year's window (hr.appraisals.run to run; hr.appraisals to read).
 *   A runner sees WHO is at WHICH step and acts on it (reviewer, skip the
 *   self-assessment, return, cancel) — never what anyone wrote; opening an
 *   appraisal needs "Read appraisals". The window's dates and the
 *   competencies need a runner for all staff.
 * Competencies: what everyone is rated on.
 */

const Row = ({ r, sub }) => (
  <li className="flex flex-wrap items-center gap-3 border-t border-gray-100 py-2.5 first:border-0">
    <div className="min-w-[12rem] flex-1">
      <Link to={`/hr/appraisals/${r.id}`} className="text-sm font-semibold text-gray-800 hover:underline">{sub}</Link>
      <span className="block text-xs text-gray-500">{r.cycle?.name}{r.reviewer ? ` · reviewer ${r.reviewer.name}` : ''}</span>
    </div>
    <Pill tone={STATUS_TONE[r.status]}>{r.statusLabel}</Pill>
  </li>
);

const Mine = ({ data }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <Section title="My appraisals">
      {!data.mine.length ? <p className="text-sm text-gray-500">Nothing yet. HR opens appraisals once a year.</p>
        : <ul>{data.mine.map((r) => <Row key={r.id} r={r} sub={r.cycle?.name} />)}</ul>}
    </Section>
    <Section title="Appraisals I review">
      {!data.reviewing.length ? <p className="text-sm text-gray-500">Nobody has you as their reviewer.</p>
        : <ul>{data.reviewing.map((r) => <Row key={r.id} r={r} sub={r.person.name} />)}</ul>}
    </Section>
  </div>
);

const AddPeople = ({ cycleId, open, onClose, onDone }) => {
  const [people, setPeople] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setPeople(null); setPicked(new Set());
    hrService.cycleEligible(cycleId).then((r) => setPeople(r?.data?.people || [])).catch((err) => { notify('error', err.message || 'Could not load staff'); setPeople([]); });
  }, [open, cycleId]);
  const add = async (all) => {
    setBusy(true);
    try {
      const res = await hrService.addToCycle(cycleId, all ? { all: true } : { userIds: [...picked] });
      notify('success', `Added ${res?.data?.added || 0} — each is asked to complete their self-assessment`);
      onDone();
    } catch (err) { notify('error', err.message || 'Could not add'); }
    finally { setBusy(false); }
  };
  return (
    <Modal isOpen={open} onClose={onClose} title="Add people to this appraisal" size="lg">
      {!people ? <Spinner /> : !people.length ? <p className="text-sm text-gray-500">Everyone within your reach is already in.</p> : (
        <>
          <ul className="max-h-[50vh] divide-y divide-gray-100 overflow-y-auto">
            {people.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-3 py-2 text-sm">
                  <input type="checkbox" checked={picked.has(p.id)} onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(p.id); else n.delete(p.id); setPicked(n); }} />
                  <span className="flex-1">{p.name}<span className="block text-xs text-gray-500">{[p.position, p.department].filter(Boolean).join(' · ')}</span></span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" className={buttonCls} disabled={busy || !picked.size} onClick={() => add(false)}>Add {picked.size || ''} chosen</button>
            <button type="button" className={primaryButtonCls} disabled={busy} onClick={() => add(true)}>Add all {people.length}</button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">The reviewer starts as whoever they report to on their staff file; change it in the list. You are never added by yourself — someone else runs your own appraisal.</p>
        </>
      )}
    </Modal>
  );
};

const CycleView = ({ me }) => {
  const [cycles, setCycles] = useState(null);
  const [cycleId, setCycleId] = useState(null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [adding, setAdding] = useState(false);
  const [cancel, setCancel] = useState(null);

  const loadCycles = useCallback(async () => {
    try {
      const list = (await hrService.appraisalCycles())?.data?.cycles || [];
      setCycles(list);
      setCycleId((c) => c || list[0]?.id || null);
    } catch (err) { notify('error', err.message || 'Could not load appraisal cycles'); setCycles([]); }
  }, []);
  useEffect(() => { loadCycles(); }, [loadCycles]);
  const load = useCallback(async () => {
    if (!cycleId) return;
    try { setData((await hrService.appraisalCycle(cycleId))?.data || null); }
    catch (err) { notify('error', err.message || 'Could not load the cycle'); }
  }, [cycleId]);
  useEffect(() => { setData(null); load(); }, [load]);

  const counts = useMemo(() => {
    const c = { self: 0, review: 0, sent: 0, acknowledged: 0, cancelled: 0 };
    (data?.rows || []).forEach((r) => { c[r.status] += 1; });
    return c;
  }, [data]);

  const act = async (row, body) => {
    try { await hrService.runAppraisal(row.id, body); await load(); window.dispatchEvent(new Event(APPRAISALS_CHANGED)); }
    catch (err) { notify('error', err.message || 'Could not update'); }
  };
  const saveCycle = async (e) => {
    e.preventDefault();
    try {
      if (form.id) await hrService.updateCycle(form.id, { name: form.name, selfDueOn: form.selfDueOn || null, reviewDueOn: form.reviewDueOn || null });
      else {
        const res = await hrService.openCycle({ year: Number(form.year), name: form.name, selfDueOn: form.selfDueOn || null, reviewDueOn: form.reviewDueOn || null });
        setCycleId(res.data.id);
      }
      setForm(null); await loadCycles(); await load();
    } catch (err) { notify('error', err.message || 'Could not save'); }
  };
  const toggleClosed = async () => {
    try { await hrService.updateCycle(data.cycle.id, { status: data.cycle.status === 'open' ? 'closed' : 'open' }); await loadCycles(); await load(); }
    catch (err) { notify('error', err.message || 'Could not change the window'); }
  };

  if (!cycles) return <Spinner />;
  const canRunAll = data ? data.canRunAll : cycles && canRunAppraisals(me);
  const year = new Date().getFullYear();
  const open = data?.cycle?.status === 'open';

  return (
    <div className="space-y-4">
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {cycles.length ? (
              <select aria-label="Appraisal year" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={cycleId || ''} onChange={(e) => setCycleId(Number(e.target.value))}>
                {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : <span className="text-sm text-gray-500">No appraisal opened yet.</span>}
            {data && (open ? <Pill tone="ok">open</Pill> : <Pill tone="n"><Lock className="h-3 w-3" />closed</Pill>)}
            {data && <span className="text-xs text-gray-500">{data.cycle.selfDueOn && `self due ${shortDate(data.cycle.selfDueOn)}`}{data.cycle.reviewDueOn && ` · review due ${shortDate(data.cycle.reviewDueOn)}`}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {data?.canRun && open && <button type="button" className={buttonCls} onClick={() => setAdding(true)}><UserPlus className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />Add people</button>}
            {canRunAll && data && <button type="button" className={buttonCls} onClick={() => setForm({ id: data.cycle.id, name: data.cycle.name, selfDueOn: data.cycle.selfDueOn || '', reviewDueOn: data.cycle.reviewDueOn || '' })}><Pencil className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />Dates</button>}
            {canRunAll && data && <button type="button" className={buttonCls} onClick={toggleClosed}>{open ? <><Lock className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />Close window</> : <><Unlock className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />Reopen</>}</button>}
            {canRunAll && <button type="button" className={primaryButtonCls} onClick={() => setForm({ year: cycles.some((c) => c.year === year) ? year + 1 : year, name: '', selfDueOn: '', reviewDueOn: '' })}><Plus className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />Open a year</button>}
          </div>
        </div>
        {form && (
          <form onSubmit={saveCycle} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-4">
            {!form.id && <Field label="Year"><input type="number" min="2020" max="2100" className={inputCls} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>}
            <Field label="Name"><input className={inputCls} placeholder={`${form.year || ''} appraisal`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Self-assessment due"><input type="date" className={inputCls} value={form.selfDueOn} onChange={(e) => setForm({ ...form, selfDueOn: e.target.value })} /></Field>
            <Field label="Review due"><input type="date" className={inputCls} value={form.reviewDueOn} onChange={(e) => setForm({ ...form, reviewDueOn: e.target.value })} /></Field>
            <div className="flex items-end gap-2 sm:col-span-4 sm:justify-end">
              <button type="button" className={buttonCls} onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className={primaryButtonCls}>{form.id ? 'Save' : 'Open'}</button>
            </div>
          </form>
        )}
      </Section>

      {data && (
        <Section title={`${data.rows.length} ${data.rows.length === 1 ? 'person' : 'people'}`}
          actions={<span className="flex flex-wrap gap-1">{['self', 'review', 'sent', 'acknowledged'].map((s) => counts[s] > 0 && <Pill key={s} tone={STATUS_TONE[s]}>{counts[s]} {data.rows.find((r) => r.status === s)?.statusLabel.toLowerCase()}</Pill>)}</span>}>
          {!data.rows.length ? <p className="text-sm text-gray-500">Nobody in this appraisal yet{data.canRun && open ? ' — use Add people.' : '.'}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="text-left text-xs text-gray-500"><th className="py-2 font-semibold">Person</th><th className="py-2 font-semibold">Reviewer</th><th className="py-2 font-semibold">Step</th><th className="py-2" /></tr></thead>
                <tbody>
                  {data.rows.map((r) => {
                    const mine = r.person.id === me?.id;
                    const live = ['self', 'review', 'sent'].includes(r.status);
                    const runnable = data.canRun && open && live && !mine;
                    return (
                      <tr key={r.id} className="border-t border-gray-100 align-top">
                        <td className="py-2 pr-3">
                          {data.canRead ? <Link to={`/hr/appraisals/${r.id}`} className="font-semibold text-gray-800 hover:underline">{r.person.name}</Link> : <span className="font-semibold text-gray-800">{r.person.name}</span>}
                          <span className="block text-xs text-gray-500">{[r.person.position, r.person.department].filter(Boolean).join(' · ')}</span>
                        </td>
                        <td className="py-2 pr-3">
                          {runnable ? (
                            <select aria-label={`Reviewer for ${r.person.name}`} className="max-w-[12rem] rounded-lg border border-gray-300 px-2 py-1 text-sm" value={r.reviewer?.id || ''}
                              onChange={(e) => act(r, { action: 'reviewer', reviewerId: e.target.value ? Number(e.target.value) : null })}>
                              <option value="">Not chosen</option>
                              {data.reviewers.filter((p) => p.id !== r.person.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          ) : <span className="text-gray-600">{r.reviewer?.name || '—'}</span>}
                        </td>
                        <td className="py-2 pr-3"><Pill tone={STATUS_TONE[r.status]}>{r.statusLabel}</Pill></td>
                        <td className="py-2 text-right">
                          {runnable && (
                            <span className="inline-flex flex-wrap justify-end gap-1">
                              {r.status === 'self' && r.reviewer && <button type="button" className={buttonCls} onClick={() => act(r, { action: 'skipSelf' })}>Skip self-assessment</button>}
                              {r.status === 'sent' && <button type="button" className={buttonCls} onClick={() => act(r, { action: 'return' })}>Return to reviewer</button>}
                              <button type="button" className={buttonCls} onClick={() => setCancel(r)}>Cancel</button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!data.canRead && <p className="mt-3 text-[11px] text-gray-400">You can see who is at which step. Reading what anyone wrote needs &quot;Read appraisals&quot;.</p>}
        </Section>
      )}

      {data && <AddPeople cycleId={data.cycle.id} open={adding} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
      <ConfirmActionModal isOpen={!!cancel} onClose={() => setCancel(null)} withReason reasonLabel="Why (required)" reasonPlaceholder="e.g. left the clinic"
        title={cancel ? `Cancel ${cancel.person.name}'s appraisal?` : ''} message="It stays on record as cancelled. You can add them again later." confirmLabel="Cancel appraisal" confirmVariant="danger"
        onConfirm={async (reason) => { await act(cancel, { action: 'cancel', note: reason }); setCancel(null); }} />
    </div>
  );
};

const Competencies = ({ editable }) => {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  useEffect(() => { hrService.appraisalCompetencies().then((r) => setList(r?.data?.competencies || [])).catch(() => setList([])); }, []);
  const save = async (c, body) => {
    try { const res = await hrService.updateCompetency(c.id, body); setList((l) => l.map((x) => (x.id === c.id ? res.data : x))); setEdit(null); }
    catch (err) { notify('error', err.message || 'Could not save'); }
  };
  const add = async (e) => {
    e.preventDefault();
    try { const res = await hrService.addCompetency(form); setList((l) => [...l, res.data]); setForm({ name: '', description: '' }); }
    catch (err) { notify('error', err.message || 'Could not add'); }
  };
  if (!list) return <Spinner />;
  return (
    <Section title="What everyone is rated on">
      <ul>
        {list.map((c) => (
          <li key={c.id} className={`flex flex-wrap items-center gap-2 border-t border-gray-100 py-2.5 first:border-0 ${c.status !== 'active' ? 'opacity-50' : ''}`}>
            {edit?.id === c.id ? (
              <>
                <input aria-label="Competency" className={`${inputCls} min-w-[12rem] flex-1`} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                <input aria-label="Description" className={`${inputCls} min-w-[12rem] flex-1`} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                <button type="button" className={buttonCls} aria-label="Save" onClick={() => save(c, { name: edit.name, description: edit.description })}><Check className="h-3.5 w-3.5" /></button>
                <button type="button" className={buttonCls} aria-label="Cancel" onClick={() => setEdit(null)}><X className="h-3.5 w-3.5" /></button>
              </>
            ) : (
              <>
                <span className="min-w-[12rem] flex-1 text-sm text-gray-800">{c.name}{c.description && <span className="block text-xs text-gray-500">{c.description}</span>}</span>
                {c.status !== 'active' && <Pill tone="warn">archived</Pill>}
                {editable && (
                  <span className="flex gap-1">
                    {c.status === 'active' && <button type="button" className={buttonCls} aria-label={`Edit ${c.name}`} onClick={() => setEdit({ id: c.id, name: c.name, description: c.description })}><Pencil className="h-3.5 w-3.5" /></button>}
                    <button type="button" className={buttonCls} aria-label={c.status === 'active' ? `Archive ${c.name}` : `Restore ${c.name}`} onClick={() => save(c, { status: c.status === 'active' ? 'archived' : 'active' })}>
                      {c.status === 'active' ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    </button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <form onSubmit={add} className="mt-3 flex flex-wrap gap-2">
          <input aria-label="New competency" placeholder="New competency" className={`${inputCls} min-w-[12rem] flex-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input aria-label="New competency description" placeholder="What it means (optional)" className={`${inputCls} min-w-[12rem] flex-1`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" className={buttonCls} disabled={!form.name.trim()}><Plus className="-mt-0.5 inline h-3.5 w-3.5" /> Add</button>
        </form>
      )}
      <p className="mt-3 text-[11px] text-gray-400">Each appraisal copies the competencies when it starts, so changes here apply to people added from now on.{editable ? '' : ' Changing them needs "Run appraisals" for all staff.'}</p>
    </Section>
  );
};

const Appraisals = () => {
  const { currentUser } = useUserContext();
  const runs = canRunAppraisals(currentUser);
  const reads = canReadAppraisals(currentUser);
  const [tab, setTab] = useState('mine');
  const [mine, setMine] = useState(null);
  useEffect(() => {
    hrService.myAppraisals().then((r) => setMine(r?.data || { mine: [], reviewing: [] })).catch(() => setMine({ mine: [], reviewing: [] }));
  }, []);
  const tabs = [{ key: 'mine', label: 'Mine' }, ...(runs || reads ? [{ key: 'cycle', label: 'Cycle' }, { key: 'competencies', label: 'Competencies' }] : [])];
  return (
    <div className="max-w-6xl space-y-4 p-4">
      <PageHeader title="Appraisals" subtitle="Once a year: your self-assessment, then your reviewer's, then you acknowledge" />
      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'mine' && (mine ? <Mine data={mine} /> : <Spinner />)}
      {tab === 'cycle' && <CycleView me={currentUser} />}
      {tab === 'competencies' && <Competencies editable={runs} />}
    </div>
  );
};

export default Appraisals;
