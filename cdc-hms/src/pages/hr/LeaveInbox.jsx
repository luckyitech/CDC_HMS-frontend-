import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canManageLeave } from '../../utils/permissions';
import leaveService from '../../services/leaveService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import { Pill, initials } from '../../components/hr/hrFormat';
import ApprovalPanel from '../../components/hr/leave/ApprovalPanel';
import { fmtDays, rangeLabel, progressLabel, STATUS_TONES, LEAVE_CHANGED_EVENT } from '../../components/hr/leave/leaveFormat';

/**
 * Leave to approve — /hr/leave (B27 phase 3; mockup 3).
 *
 * Tabs: Waiting for me · Decided by me · All (leave.manage). The bell and the
 * emails link here with ?id=<request>, which opens that request whatever tab
 * is showing — the panel asks the server what this viewer may see and do.
 *
 * Anyone of staff can be chosen as an approver, so the page is open to every
 * internal role; the lists only ever contain requests they are on (or, on
 * All, everyone's for leave.manage).
 */
const LeaveInbox = () => {
  const { currentUser } = useUserContext();
  const manage = canManageLeave(currentUser);
  const [params, setParams] = useSearchParams();
  const tabs = [
    { id: 'waiting', label: 'Waiting for me' },
    { id: 'decided', label: 'Decided by me' },
    ...(manage ? [{ id: 'all', label: 'All' }] : []),
  ];
  const tab = tabs.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'waiting';
  const openId = Number(params.get('id')) || null;
  const [rows, setRows] = useState(null);
  const [waiting, setWaiting] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await leaveService.inbox(tab);
      setRows(res.data.rows);
      setWaiting(res.data.counts?.waiting || 0);
    } catch {
      setRows([]);
    }
  }, [tab]);

  useEffect(() => { setRows(null); load(); }, [load]);

  const choose = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, String(v))));
    setParams(next, { replace: !('id' in patch) });
  };

  const changed = () => {
    load();
    window.dispatchEvent(new CustomEvent(LEAVE_CHANGED_EVENT));
  };

  return (
    <div>
      <PageHeader title="Leave to approve" subtitle="Requests colleagues have listed you on." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <div className={`bg-white rounded-xl border border-gray-200 min-w-0 ${openId ? 'hidden lg:block' : ''}`}>
          <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => choose({ tab: t.id })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === t.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {t.label}{t.id === 'waiting' && waiting > 0 ? ` · ${waiting}` : ''}
              </button>
            ))}
          </div>
          {rows === null ? <div className="p-4"><Spinner /></div> : rows.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">
              {tab === 'waiting' ? 'Nothing is waiting for you.' : tab === 'decided' ? 'You haven\'t decided any leave yet.' : 'No leave this year.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100" data-testid="inbox-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => choose({ id: r.id })}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${openId === r.id ? 'bg-blue-50/60' : ''}`}>
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">{initials(r.applicant)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-gray-900">{r.applicant}</span>
                      <span className="block truncate text-[11px] text-gray-500">{r.typeName} · {rangeLabel(r.startDate, r.endDate)} · {fmtDays(r.days)} d</span>
                    </span>
                    {r.waitingOnMe
                      ? <Pill tone="warn">{r.status === 'CancelRequested' ? 'cancel?' : 'you'}</Pill>
                      : r.myDecision === 'info_requested'
                        ? <Pill tone="n">info asked</Pill>
                        : <Pill tone={STATUS_TONES[r.status] || 'n'}>{progressLabel(r)}</Pill>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-5 min-w-0 ${openId ? '' : 'hidden lg:block'}`}>
          {openId ? (
            <>
              <button type="button" className="lg:hidden mb-3 inline-flex items-center gap-1 text-xs font-semibold text-primary" onClick={() => choose({ id: null })}>
                <ChevronLeft className="w-4 h-4" /> Back to the list
              </button>
              <ApprovalPanel requestId={openId} onChanged={changed} />
            </>
          ) : (
            <p className="text-sm text-gray-500">Choose a request to see it here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveInbox;
