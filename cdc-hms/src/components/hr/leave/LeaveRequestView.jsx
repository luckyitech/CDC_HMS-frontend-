import { useState } from 'react';
import { Undo2, CalendarX2 } from 'lucide-react';
import hrSelfService from '../../../services/hrSelfService';
import { notify } from '../../../utils/notify';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import { Pill } from '../hrFormat';
import { buttonCls } from '../hrUi';
import DayCalculator from './DayCalculator';
import LeaveStatusTrack from './LeaveStatusTrack';
import LeaveThread from './LeaveThread';
import AttachLeaveDocument from './AttachLeaveDocument';
import {
  fmtDays, longDate, returnLabel, partsNote, progressLabel, STATUS_TONES,
} from './leaveFormat';

/**
 * One of MY leave requests, opened from My leave (B27 phase 2).
 *
 * Status track, the calculator as it stood when I applied (a snapshot — never
 * recomputed, so a later policy change can't restate it), the thread with a
 * reply box when an approver has asked something, the document I owe, and
 * the two things I can do: Withdraw while it is waiting, Ask to cancel once it
 * is approved and hasn't started.
 *
 * props:
 *   application  formatApplication() shape
 *   employeeId   for uploading the owed document to my staff file
 *   onChanged    (application) => void — after any action
 */
const Section = ({ title, children }) => (
  <div className="pt-4 mt-4 border-t border-gray-100">
    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h4>
    {children}
  </div>
);

const LeaveRequestView = ({ application: app, employeeId, onChanged }) => {
  const [confirm, setConfirm] = useState(null);   // 'withdraw' | 'cancel'
  const [busy, setBusy] = useState(false);

  const run = async (fn, done) => {
    setBusy(true);
    try {
      const res = await fn();
      onChanged(res.data);
      if (done) notify('success', done);
    } catch (err) {
      notify('error', err.message || 'That did not work');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const parts = partsNote(app.startPart, app.endPart);

  return (
    <div data-testid="leave-request">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-gray-900">{app.typeName} leave</div>
          <div className="text-xs text-gray-500">
            {longDate(app.startDate)}{app.startDate !== app.endDate ? ` – ${longDate(app.endDate)}` : ''}
            {' · '}{fmtDays(app.days)} day{app.days === 1 ? '' : 's'}
            {parts ? ` · ${parts}` : ''}
            {app.returnDate ? ` · back ${returnLabel(app.returnDate, app.endPart === 'am' ? 'pm' : 'full')}` : ''}
          </div>
        </div>
        <Pill tone={STATUS_TONES[app.status] || 'n'} className="flex-none">{progressLabel(app)}</Pill>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {app.flags?.backdated && <Pill tone="info">Backdated</Pill>}
        {app.flags?.shortNotice && <Pill tone="info">Short notice</Pill>}
        {app.flags?.documentOwed && <Pill tone="warn">Document owed</Pill>}
        {app.onBehalf && <Pill tone="n">Recorded by HR</Pill>}
      </div>

      <div className="mt-3">
        <LeaveStatusTrack application={app} />
      </div>

      {(app.can?.withdraw || app.can?.cancelRequest) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {app.can.withdraw && (
            <button type="button" className={`${buttonCls} inline-flex items-center gap-1.5`} disabled={busy} onClick={() => setConfirm('withdraw')}>
              <Undo2 className="w-4 h-4" /> Withdraw request
            </button>
          )}
          {app.can.cancelRequest && (
            <button type="button" className={`${buttonCls} inline-flex items-center gap-1.5`} disabled={busy} onClick={() => setConfirm('cancel')}>
              <CalendarX2 className="w-4 h-4" /> Ask to cancel
            </button>
          )}
        </div>
      )}

      {app.can?.addDocument && (
        <Section title="Supporting document">
          <p className="text-xs text-gray-600 mb-2">This leave needs a supporting document. Add it here — your approvers are waiting for it.</p>
          <AttachLeaveDocument
            employeeId={employeeId}
            leaveType={app.leaveType}
            value={null}
            label="Add the document"
            onChange={(doc) => doc && run(() => hrSelfService.addDocument(app.id, doc.id))}
          />
        </Section>
      )}
      {app.attachment && (
        <Section title="Supporting document">
          <p className="text-sm text-gray-700">{app.attachment.fileName} <span className="text-gray-400">· on your staff file</span></p>
        </Section>
      )}

      {(app.reason || app.reachable !== null) && (
        <Section title="Details">
          {app.reason && <p className="text-sm text-gray-700 whitespace-pre-line">{app.reason}</p>}
          {app.reachable !== null && (
            <p className="text-xs text-gray-500 mt-1">Reachable while away: {app.reachable ? `yes${app.contactNote ? ` · ${app.contactNote}` : ''}` : 'no'}</p>
          )}
        </Section>
      )}

      <Section title="How the days were counted">
        <DayCalculator
          compact
          breakdown={app.breakdown}
          total={app.days}
          typeName={(app.charges || []).map((c) => c.leaveType).join(' + ') || app.typeName}
          usedPolicy={app.breakdown?.usedPolicy !== false && !!app.breakdown?.groups}
        />
        {app.clashNames?.length > 0 && (
          <p className="text-[11px] text-gray-500 mt-1.5">When you applied, also away: {app.clashNames.join(', ')}.</p>
        )}
      </Section>

      <Section title="History">
        <LeaveThread application={app} onReply={(note) => run(() => hrSelfService.reply(app.id, note), 'Answer sent')} />
      </Section>

      <ConfirmActionModal
        isOpen={confirm === 'withdraw'}
        onClose={() => setConfirm(null)}
        title="Withdraw this request?"
        message="Your approvers will be told, and the days go back to your balance."
        confirmLabel="Withdraw"
        confirmVariant="danger"
        withReason
        reasonLabel="Note for your approvers (optional)"
        onConfirm={(note) => run(() => hrSelfService.withdraw(app.id, note), 'Request withdrawn')}
      />
      <ConfirmActionModal
        isOpen={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        title="Ask to cancel this leave?"
        message="It stays approved until an approver or HR cancels it. They will be told you asked."
        confirmLabel="Ask to cancel"
        withReason
        reasonLabel="Why (optional)"
        onConfirm={(note) => run(() => hrSelfService.cancelRequest(app.id, note), 'Cancellation asked for')}
      />
    </div>
  );
};

export default LeaveRequestView;
