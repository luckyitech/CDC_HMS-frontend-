import { useCallback, useEffect, useState } from 'react';
import { notify } from '../../utils/notify';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, Download } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canViewAllLeave, canDownloadLeaveRegister } from '../../utils/permissions';
import leaveService from '../../services/leaveService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import { Pill, initials } from '../../components/hr/hrFormat';
import ApprovalPanel from '../../components/hr/leave/ApprovalPanel';
import { fmtDays, rangeLabel, progressLabel, STATUS_TONES, LEAVE_CHANGED_EVENT } from '../../components/hr/leave/leaveFormat';

/**
 * Leave to approve — /hr/leave (B27 phase 3; mockup 3).
 *
 * Tabs: Waiting for me · Decided by me · All (leave.view). The bell and the
 * emails link here with ?id=<request>, which opens that request whatever tab
 * is showing — the panel asks the server what this viewer may see and do.
 *
 * Anyone of staff can be chosen as an approver, so the page is open to every
 * internal role; the lists only ever contain requests they are on (or, on
 * All, everyone's for leave.view; the register download for leave.register — HR Tier 3).
 */
const LeaveInbox = () => {
  const { currentUser } = useUserContext();
  const manage = canViewAllLeave(currentUser);
  const canRegister = canDownloadLeaveRegister(currentUser);
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

  // The leave register (HR Tier 2): a .csv of everyone's leave for a year.
  // It names sick leave — health data once it leaves the HMS; the server logs
  // every download.
  const [downloading, setDownloading] = useState(false);
  const thisYear = new Date().getFullYear();
  const [regYear, setRegYear] = useState(thisYear);
  const download = async () => {
    setDownloading(true);
    try { await leaveService.downloadRegister(regYear); }
    catch (err) { notify('error', err.message || 'Could not download the leave register'); }
    finally { setDownloading(false); }
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
          {tab === 'all' && canRegister && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-100" data-testid="register-export">
              <select className="rounded-md border border-gray-300 px-2 py-1 text-xs" value={regYear} onChange={(e) => setRegYear(Number(e.target.value))} aria-label="Year to download">
                {[thisYear - 1, thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button type="button" onClick={download} disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                <Download className="w-3.5 h-3.5" /> {downloading ? 'Preparing…' : 'Download leave register (.csv)'}
              </button>
              <span className="text-[11px] text-gray-500 basis-full">Opens in Excel. Names sick leave — keep the file safe. Each download is logged.</span>
            </div>
          )}
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
                      ? <Pill tone="warn">{r.myKind === 'cover' ? 'cover?' : r.status === 'CancelRequested' ? 'cancel?' : 'you'}</Pill>
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
