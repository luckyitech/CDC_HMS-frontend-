import { useEffect, useState } from 'react';
import ReasonModal from '../../shared/ReasonModal';
import HistologyRequestForm from '../../histology/HistologyRequestForm';
import HistologyRequestList from '../../histology/HistologyRequestList';
import { useDermContext } from '../../../contexts/DermContext';
import { useUserContext } from '../../../contexts/UserContext';
import { canRecordHistology } from '../../../utils/permissions';
import { dermService } from '../../../services/dermService';
import { fmtDay } from './dermFormat';
import { notify } from '../../../utils/notify';

/**
 * DermProceduresTab — a finding's "Biopsy & procedures" tab (Phase 3).
 *
 * Histology / cytology (only while that module is on): the requests taken
 * from this finding with their results — the same list and request form as
 * Orders tab 3, narrowed to this finding.
 *
 * Procedures (H8): recorded, not billed. Name from the clinic's list, details,
 * the findings treated (this one ticked). The author edits the same day;
 * otherwise an amendment with a reason (kept in the amendment trail);
 * "entered in error" instead of delete.
 *
 * Props: finding, histology (array, or null = module off), procedures,
 *        today, uhid, canWrite, currentUserId
 */
const inputCls = 'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

const ProcedureForm = ({ initial, list, findings, onSave, onCancel, saveLabel }) => {
  const [v, setV] = useState(initial);
  const names = list.includes(initial.name) || !initial.name ? list : [initial.name, ...list];
  const toggle = (id) => setV((x) => ({ ...x, findingIds: x.findingIds.includes(id) ? x.findingIds.filter((i) => i !== id) : [...x.findingIds, id] }));
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-blue-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="proc-name" className="text-xs font-semibold text-gray-500">Procedure</label>
          <select id="proc-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls}>
            <option value="">Choose…</option>
            {names.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-500">Findings treated</span>
          <div className="flex flex-wrap gap-1.5">
            {findings.map((f) => (
              <label key={f.id} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${v.findingIds.includes(f.id) ? 'border-primary bg-white text-primary' : 'border-gray-300 bg-white text-gray-600'}`}>
                <input type="checkbox" className="h-3.5 w-3.5" checked={v.findingIds.includes(f.id)} onChange={() => toggle(f.id)} />
                {f.label} {f.title}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="proc-details" className="text-xs font-semibold text-gray-500">Details</label>
        <textarea id="proc-details" rows={2} value={v.details} onChange={(e) => setV({ ...v, details: e.target.value })} placeholder="e.g. 4 mm, 1 suture 5/0, lidocaine 1% 1 ml" className={inputCls} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave(v)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">{saveLabel}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">Cancel</button>
      </div>
      <p className="text-xs text-gray-500">Recorded on the skin record — not billed.</p>
    </div>
  );
};

const DermProceduresTab = ({ finding, histology, procedures, today, uhid, canWrite, currentUserId }) => {
  const { board, openFinding, refresh } = useDermContext();
  const { currentUser } = useUserContext();
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);     // procedure being edited
  const [requesting, setRequesting] = useState(false);
  const [ask, setAsk] = useState(null);
  const [histoKey, setHistoKey] = useState(0);
  const histologyOn = Array.isArray(histology);
  const canRequest = histologyOn && canRecordHistology(currentUser) && canWrite;
  const findings = (board?.findings || []).filter((f) => f.status !== 'entered_in_error');

  useEffect(() => {
    let alive = true;
    dermService.procedureList().then((res) => { if (alive) setList(res.data?.procedures || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const reload = async () => { await openFinding(finding.id); refresh(); };

  const create = async (v) => {
    try {
      await dermService.createProcedure(uhid, { name: v.name, details: v.details || null, findingIds: v.findingIds });
      notify('success', 'Procedure recorded');
      setAdding(false);
      reload();
    } catch (err) { if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not record the procedure'); }
  };

  const update = async (p, v, reason = null) => {
    const changes = {};
    if (v.name !== p.name) changes.name = v.name;
    if ((v.details || null) !== (p.details || null)) changes.details = v.details || null;
    if (JSON.stringify([...v.findingIds].sort((a, b) => a - b)) !== JSON.stringify(p.findingIds)) changes.findingIds = v.findingIds;
    if (!Object.keys(changes).length) { setEditing(null); return; }
    try {
      await dermService.updateProcedure(p.id, { ...changes, ...(reason ? { reason } : {}) });
      notify('success', reason ? 'Procedure amended' : 'Procedure updated');
      setEditing(null);
      reload();
    } catch (err) {
      if (err?.data?.code === 'REASON_REQUIRED') {
        setAsk({ title: `Amend ${p.name} of ${fmtDay(p.procedureDate)}`, message: 'It was recorded on an earlier day or by someone else. Your change and this reason are kept in the amendment trail.', confirmLabel: 'Amend', run: (r) => update(p, v, r) });
      } else if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save');
    }
  };

  const shownProcedures = procedures.filter((p) => p.status === 'active' || p.status === 'entered_in_error');

  return (
    <div className="flex flex-col gap-5">
      {histologyOn && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="ui-box-title">Histology / cytology</h3>
            {canRequest && !requesting && (
              <button type="button" onClick={() => setRequesting(true)} className="ml-auto rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                + Request histology / cytology
              </button>
            )}
          </div>
          {requesting && (
            <div className="flex flex-col gap-2">
              <HistologyRequestForm uhid={uhid} presetFindingId={finding.id} onCreated={() => { setRequesting(false); setHistoKey((k) => k + 1); reload(); }} />
              <button type="button" onClick={() => setRequesting(false)} className="self-start text-xs text-gray-500 underline">Close the form</button>
            </div>
          )}
          <HistologyRequestList
            uhid={uhid}
            findingId={finding.id}
            canWrite={canRecordHistology(currentUser) && canWrite}
            reloadKey={histoKey}
            onChanged={reload}
            emptyText="No specimen has been sent from this finding."
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="ui-box-title">Procedures</h3>
          {canWrite && !adding && (
            <button type="button" onClick={() => setAdding(true)} className="ml-auto rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              + Record procedure
            </button>
          )}
        </div>
        {adding && (
          <ProcedureForm
            initial={{ name: '', details: '', findingIds: [finding.id] }}
            list={list}
            findings={findings}
            onSave={create}
            onCancel={() => setAdding(false)}
            saveLabel="Record procedure"
          />
        )}
        {shownProcedures.length === 0 ? (
          <p className="text-sm text-gray-500">No procedures recorded on this finding.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="ui-thead">
                <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Procedure</th><th className="px-3 py-2">Findings</th><th className="px-3 py-2">Details</th><th className="px-3 py-2">By</th><th className="px-3 py-2" /></tr>
              </thead>
              <tbody>
                {shownProcedures.map((p) => (
                  editing?.id === p.id ? (
                    <tr key={p.id}><td colSpan={6} className="p-2">
                      <ProcedureForm
                        initial={{ name: p.name, details: p.details || '', findingIds: p.findingIds }}
                        list={list}
                        findings={findings}
                        onSave={(v) => update(p, v)}
                        onCancel={() => setEditing(null)}
                        saveLabel={p.performedById === currentUserId && p.procedureDate === today ? 'Save' : 'Save amendment…'}
                      />
                    </td></tr>
                  ) : (
                    <tr key={p.id} className={`border-t border-gray-100 align-top ${p.status === 'entered_in_error' ? 'text-gray-400 line-through' : ''}`}>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{p.procedureDate === today ? 'Today' : fmtDay(p.procedureDate)}</td>
                      <td className="px-3 py-2 font-medium">{p.name}{p.histology && <span className="block font-mono text-[11px] font-normal text-gray-500 no-underline">{p.histology.specimenNumber}</span>}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.findings.map((f) => f.label).join(', ')}</td>
                      <td className="px-3 py-2">{p.details || '—'}{p.amendedByName && <span className="block text-[11px] text-amber-700">amended by {p.amendedByName}</span>}{p.status === 'entered_in_error' && <span className="block text-[11px] no-underline">Entered in error — {p.errorReason}</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{p.performedByName}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {canWrite && p.status === 'active' && (
                          <span className="flex justify-end gap-3">
                            <button type="button" onClick={() => setEditing(p)} className="text-xs font-medium text-primary hover:underline">{p.performedById === currentUserId && p.procedureDate === today ? 'Edit' : 'Amend'}</button>
                            <button type="button" className="text-xs font-medium text-red-600 hover:underline"
                              onClick={() => setAsk({ title: `Mark ${p.name} entered in error`, message: 'It stays on record, struck through, with your reason. It cannot be undone here.', confirmLabel: 'Mark entered in error', destructive: true,
                                run: async (reason) => { try { await dermService.procedureInError(p.id, reason); notify('success', 'Marked entered in error'); reload(); } catch (err) { if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save'); } } })}>
                              Entered in error
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ReasonModal
        isOpen={!!ask}
        onClose={() => setAsk(null)}
        title={ask?.title}
        message={ask?.message}
        confirmLabel={ask?.confirmLabel}
        destructive={ask?.destructive}
        onConfirm={async (reason) => { const job = ask; setAsk(null); await job.run(reason); }}
      />
    </div>
  );
};

export default DermProceduresTab;
