import { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, X, Lock } from 'lucide-react';
import staffService from '../../../services/staffService';
import hrSelfService from '../../../services/hrSelfService';
import { notify } from '../../../utils/notify';
import { Pill, initials } from '../hrFormat';
import { inputCls } from '../hrUi';

/**
 * Required approvers — the staff file's Leave tab (HR Tier 2, Emu 2 Oct 2026).
 * HR (leave.manage) names people who are added as approvers to every NEW leave
 * request this person makes; the person cannot remove them. Requests already
 * sent are not changed. Never on your own file (the server refuses it too).
 *
 * Shown to anyone who can open the Leave tab when someone is set; editable only
 * by leave.manage on someone else's file (`canEdit` from the server).
 *
 * props: employeeId, personName, personUserId
 */
const RequiredApprovers = ({ employeeId, personName, personUserId }) => {
  const [data, setData] = useState(null);     // { approvers, canEdit }
  const [colleagues, setColleagues] = useState(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    staffService.getRequiredApprovers(employeeId)
      .then((res) => { if (live) setData(res.data); })
      .catch(() => { if (live) setData({ approvers: [], canEdit: false }); });
    return () => { live = false; };
  }, [employeeId]);

  useEffect(() => {
    if (!data?.canEdit || colleagues) return;
    hrSelfService.approvers('', true).then((res) => setColleagues(res.data.people)).catch(() => setColleagues([]));
  }, [data?.canEdit, colleagues]);

  const listed = useMemo(() => new Set((data?.approvers || []).map((a) => a.userId)), [data]);
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !colleagues) return [];
    return colleagues.filter((c) => !listed.has(c.id) && c.id !== personUserId && c.name.toLowerCase().includes(term)).slice(0, 8);
  }, [q, colleagues, listed, personUserId]);

  if (!data) return null;
  if (!data.canEdit && data.approvers.length === 0) return null;

  const save = async (ids) => {
    setBusy(true);
    try {
      const res = await staffService.setRequiredApprovers(employeeId, ids);
      setData(res.data);
      setQ('');
      notify('success', 'Required approvers saved');
    } catch (err) {
      notify('error', err.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };
  const ids = data.approvers.map((a) => a.userId);
  const noHolder = data.approvers.length > 0 && !data.approvers.some((a) => a.canApprove);

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4" data-testid="required-approvers">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5" /> Always on {personName.split(' ')[0]}&apos;s leave requests
      </h3>
      <p className="text-[11px] text-gray-500 mb-2">
        Added as an approver to every new request; {personName.split(' ')[0]} cannot remove them. Requests already sent are not changed.
      </p>
      {data.approvers.length === 0 ? (
        <p className="text-sm text-gray-500">Nobody yet — {personName.split(' ')[0]} chooses their own approvers.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.approvers.map((a) => (
            <li key={a.userId} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">{initials(a.name)}</span>
              <span className="flex-1 min-w-[8rem]">{a.name} <span className="text-gray-400">· {a.position || a.role}</span></span>
              {a.canApprove && <Pill tone="ok">can approve leave</Pill>}
              {!a.active && <Pill tone="bad">no longer active — skipped</Pill>}
              {data.canEdit && (
                <button type="button" disabled={busy} onClick={() => save(ids.filter((id) => id !== a.userId))} className="p-1 text-gray-400 hover:text-gray-700" aria-label={`Remove ${a.name}`}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {noHolder && <p className="text-[11px] text-amber-700 mt-1">None of these can approve leave — {personName.split(' ')[0]} will still need to add someone who can.</p>}
      {data.canEdit && ids.length < 5 && (
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input className={`${inputCls} pl-9`} placeholder="Add a required approver…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search for a required approver" disabled={busy} />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
              {matches.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => save([...ids, c.id])} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                    <UserPlus className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 min-w-0 truncate">{c.name} <span className="text-gray-400">· {c.position || c.role}</span></span>
                    {c.canApprove && <Pill tone="ok">can approve leave</Pill>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default RequiredApprovers;
