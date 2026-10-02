import { useCallback, useEffect, useState } from 'react';
import { FileText, CalendarX2 } from 'lucide-react';
import leaveService from '../../../services/leaveService';
import { notify } from '../../../utils/notify';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import Spinner from '../../shared/Spinner';
import { Pill } from '../hrFormat';
import { inputCls, buttonCls, primaryButtonCls } from '../hrUi';
import LeaveStatusTrack from './LeaveStatusTrack';
import LeaveThread from './LeaveThread';
import AwayStrip from './AwayStrip';
import ChargeSplit from './ChargeSplit';
import {
  fmtDays, longDate, returnLabel, partsNote, progressLabel, STATUS_TONES, splitReady, splitLabel,
} from './leaveFormat';

/**
 * ApprovalPanel — a colleague's leave request as an approver sees it
 * (B27 phase 3; mockup 3 + revision B). Also what HR sees from the staff file.
 *
 * Three tiles (left now / after this / taken this year), the approvers and
 * where each stands, the document, who else in the same role is away, the
 * charge split for an approver holding leave.approve, and Ask / Decline /
 * Approve. Deciding and cancelling are the server's call — the panel shows
 * only what GET /api/leave/requests/:id says this viewer may do (`me`).
 *
 * props:
 *   requestId
 *   onChanged  (detail) => void  — after a decision or a cancel
 */
const DECISION_MARK = {
  approved: { mark: '✓', cls: 'text-green-700', text: 'approved' },
  declined: { mark: '✕', cls: 'text-red-700', text: 'declined' },
  info_requested: { mark: '?', cls: 'text-amber-700', text: 'asked a question' },
  pending: { mark: '…', cls: 'text-gray-400', text: 'waiting' },
};

const shortStamp = (iso) => (iso
  ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Nairobi' })
  : '');

const Tile = ({ label, value }) => (
  <div className="rounded-lg bg-gray-50 px-3 py-2 min-w-0">
    <div className="text-[11px] text-gray-500 truncate">{label}</div>
    <div className="text-lg font-semibold text-gray-900 tabular-nums">{value}</div>
  </div>
);

const Block = ({ title, children }) => (
  <div className="pt-4 mt-4 border-t border-gray-100">
    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h4>
    {children}
  </div>
);

const ApprovalPanel = ({ requestId, onChanged }) => {
  const [detail, setDetail] = useState(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState('');
  const [split, setSplit] = useState([]);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const show = useCallback((d) => {
    setDetail(d);
    setSplit((d.application.charges || []).map((c) => ({ leaveType: c.leaveType, days: String(c.days) })));
  }, []);

  useEffect(() => {
    let live = true;
    setDetail(null);
    setFailed(false);
    setNote('');
    leaveService.request(requestId)
      .then((res) => { if (live) show(res.data); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [requestId, show]);

  if (failed) return <p className="text-sm text-gray-600">This request could not be opened — it may not be one you are on.</p>;
  if (!detail) return <Spinner />;

  const { application: app, applicant, me, balances, chargeTypes, away } = detail;
  const approvers = app.participants.filter((p) => p.kind === 'approver');
  const mainType = app.charges?.[0]?.leaveType || app.leaveType;
  const tile = balances?.find((b) => b.leaveType === mainType);
  const parts = partsNote(app.startPart, app.endPart);
  const originalSplit = (app.charges || []).map((c) => ({ leaveType: c.leaveType, days: String(c.days) }));
  const splitChanged = JSON.stringify(split.map((r) => [r.leaveType, Number(r.days)]).sort())
    !== JSON.stringify(originalSplit.map((r) => [r.leaveType, Number(r.days)]).sort());
  const canApprove = !me.canSplit || splitReady(split, app.days);

  const act = async (decision) => {
    if (decision !== 'approve' && !note.trim()) {
      notify('error', decision === 'decline' ? 'Say why you are declining' : 'Write your question');
      return;
    }
    setBusy(true);
    try {
      const body = { decision, note: note.trim() || null };
      if (decision === 'approve' && me.canSplit && splitChanged) {
        body.charges = split.map((r) => ({ leaveType: r.leaveType, days: Number(r.days) }));
      }
      const res = await leaveService.decide(app.id, body);
      show(res.data);
      setNote('');
      notify('success', { approve: res.data.application.status === 'Approved' ? 'Approved' : 'Your approval is recorded', decline: 'Declined', info: 'Question sent' }[decision]);
      onChanged?.(res.data);
    } catch (err) {
      notify('error', err.message || 'That did not work');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (reason) => {
    setCancelling(false);
    setBusy(true);
    try {
      const res = await leaveService.cancel(app.id, reason);
      show(res.data);
      notify('success', 'Leave cancelled');
      onChanged?.(res.data);
    } catch (err) {
      notify('error', err.message || 'Could not cancel the leave');
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async () => {
    try {
      const blob = await leaveService.attachment(app.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (err) {
      notify('error', err.message || 'Could not open the document');
    }
  };

  return (
    <div data-testid="approval-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-gray-900">{applicant.name} — {app.typeName === 'Private' ? 'leave' : `${app.typeName} leave`}</div>
          <div className="text-xs text-gray-500">
            {longDate(app.startDate)}{app.startDate !== app.endDate ? ` – ${longDate(app.endDate)}` : ''} · {fmtDays(app.days)} day{app.days === 1 ? '' : 's'}
            {parts ? ` · ${parts}` : ''}
            {app.returnDate ? ` · back ${returnLabel(app.returnDate, app.endPart === 'am' ? 'pm' : 'full')}` : ''}
            {app.submittedAt ? ` · applied ${shortStamp(app.submittedAt)}` : ''}
          </div>
        </div>
        <Pill tone={STATUS_TONES[app.status] || 'n'} className="flex-none">{progressLabel(app)}</Pill>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {app.flags?.backdated && <Pill tone="info">Backdated</Pill>}
        {app.flags?.shortNotice && <Pill tone="info">Short notice</Pill>}
        {app.flags?.documentOwed && <Pill tone="warn">Document owed</Pill>}
        {app.onBehalf && <Pill tone="n">Recorded by HR</Pill>}
        {me.legacy && <Pill tone="n">Recorded before approvers were chosen</Pill>}
      </div>

      {tile && !tile.unlimited && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Tile label={`${tile.name} left now`} value={fmtDays(tile.leftBefore)} />
          <Tile label="After this" value={fmtDays(tile.leftAfter)} />
          <Tile label="Taken this year" value={fmtDays(tile.takenThisYear)} />
        </div>
      )}

      <Block title="Approvers">
        <ul className="space-y-1 text-sm">
          {approvers.map((p) => {
            const d = DECISION_MARK[p.decision] || DECISION_MARK.pending;
            return (
              <li key={p.userId}>
                <span className={`inline-block w-4 font-semibold ${d.cls}`} aria-hidden="true">{d.mark}</span>
                {p.name}{p.userId === me.userId ? ' (you)' : ''}
                <span className="text-[11px] text-gray-500"> {d.text}{p.decidedAt ? ` ${shortStamp(p.decidedAt)}` : ''}</span>
                {p.note && <span className="block ml-4 text-xs text-gray-600 whitespace-pre-line">“{p.note}”</span>}
              </li>
            );
          })}
          {approvers.length === 0 && <li className="text-gray-500">Nobody was listed — recorded before the approval wizard.</li>}
        </ul>
        <div className="mt-2"><LeaveStatusTrack application={app} /></div>
      </Block>

      {(app.reason || app.attachment || app.reachable !== null) && (
        <Block title="Details">
          {app.reason && <p className="text-sm text-gray-700 whitespace-pre-line">{app.reason}</p>}
          {app.reachable !== null && app.reachable !== undefined && (
            <p className="text-xs text-gray-500 mt-1">Reachable while away: {app.reachable ? `yes${app.contactNote ? ` · ${app.contactNote}` : ''}` : 'no'}</p>
          )}
          {app.attachment && me.canOpenDocument && (
            <button type="button" onClick={openDocument} className={`${buttonCls} inline-flex items-center gap-1.5 mt-2`}>
              <FileText className="w-4 h-4" /> Open {app.attachment.fileName}
            </button>
          )}
        </Block>
      )}

      <Block title={`Who else is away · ${app.startDate === app.endDate ? longDate(app.startDate) : `${longDate(app.startDate)} – ${longDate(app.endDate)}`}`}>
        <AwayStrip away={away} applicant={applicant.name} start={app.startDate} end={app.endDate} />
      </Block>

      {me.canDecide && (
        <Block title="Your decision">
          {me.canSplit && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">Charge these days to</div>
              <ChargeSplit rows={split} onChange={setSplit} total={app.days} types={chargeTypes || []} balances={balances || []} />
              <p className="text-[11px] text-gray-500 mt-1">
                {me.isLast
                  ? 'Your approval completes this request — the split you approve is final.'
                  : 'The last approver\'s split is final. Changes are logged and shown to the applicant.'}
              </p>
            </div>
          )}
          <textarea rows={2} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Note (required when declining or asking for more information)" aria-label="Note" />
          <div className="flex flex-wrap justify-end gap-2 mt-2">
            <button type="button" className={buttonCls} disabled={busy} onClick={() => act('info')}>Ask for more information</button>
            <button type="button" className={`${buttonCls} text-red-700`} disabled={busy} onClick={() => act('decline')}>Decline</button>
            <button type="button" className={primaryButtonCls} disabled={busy || !canApprove} onClick={() => act('approve')}>
              {me.canSplit && split.length ? `Approve · ${splitLabel(split, chargeTypes || [])}` : 'Approve'}
            </button>
          </div>
        </Block>
      )}

      {me.canCancel && (
        <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-600">
            {app.status === 'CancelRequested' ? `${applicant.name.split(' ')[0]} asked to cancel this leave.` : 'You can cancel this leave.'}
            {' '}The days go back on their balance.
          </p>
          <button type="button" className={`${buttonCls} inline-flex items-center gap-1.5 text-red-700`} disabled={busy} onClick={() => setCancelling(true)}>
            <CalendarX2 className="w-4 h-4" /> Cancel leave
          </button>
        </div>
      )}

      <Block title="History">
        <LeaveThread application={app} />
      </Block>

      <ConfirmActionModal
        isOpen={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancel this leave?"
        message={`${applicant.name} and everyone on the request will be told. The days go back on the balance${applicant.role === 'doctor' ? ' and the appointment book is opened again' : ''}.`}
        confirmLabel="Cancel leave"
        confirmVariant="danger"
        withReason
        reasonLabel="Note (optional)"
        onConfirm={cancel}
      />
    </div>
  );
};

export default ApprovalPanel;
