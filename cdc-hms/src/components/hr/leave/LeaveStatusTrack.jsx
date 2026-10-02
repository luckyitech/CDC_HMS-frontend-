import { Pill } from '../hrFormat';
import { STATUS_LABELS, STATUS_TONES, COVER_ANSWER } from './leaveFormat';

/**
 * Where a request stands, as a row of pills (mockup 3, "Ahmed's view"):
 *   Applied 27 Sep → Dr Omar approved → Dr Gaman waiting → Approved
 * Acknowledgers are listed underneath — they are told, they don't decide.
 */
const shortDay = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })
  : '');

const DECISION = {
  approved:       { tone: 'ok',   text: 'approved' },
  declined:       { tone: 'bad',  text: 'declined' },
  info_requested: { tone: 'warn', text: 'asked a question' },
  pending:        { tone: 'warn', text: 'waiting' },
};

const Arrow = () => <span className="text-gray-300" aria-hidden="true">→</span>;

const LeaveStatusTrack = ({ application }) => {
  const approvers = (application.participants || []).filter((p) => p.kind === 'approver');
  const acknowledgers = (application.participants || []).filter((p) => p.kind === 'acknowledger');
  const cover = (application.participants || []).find((p) => p.kind === 'cover') || null;
  const open = ['Pending', 'InfoRequested'].includes(application.status);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5" data-testid="status-track">
        <Pill tone="ok">Applied {shortDay(application.submittedAt)}</Pill>
        {approvers.map((p) => {
          const d = DECISION[p.decision] || DECISION.pending;
          return (
            <span key={p.userId} className="inline-flex items-center gap-1.5">
              <Arrow />
              <Pill tone={open || p.decision !== 'pending' ? d.tone : 'n'}>{p.name} {d.text}</Pill>
            </span>
          );
        })}
        <Arrow />
        <Pill tone={open ? 'n' : (STATUS_TONES[application.status] || 'n')}>
          {open ? 'Approved' : (STATUS_LABELS[application.status] || application.status)}
        </Pill>
      </div>
      {cover && (
        <div className="text-[11px] text-gray-500 mt-1.5 flex flex-wrap items-center gap-1.5" data-testid="cover-status">
          Cover: <span className="text-gray-700">{cover.name}</span>
          <Pill tone={(COVER_ANSWER[cover.decision] || COVER_ANSWER.pending).tone}>{(COVER_ANSWER[cover.decision] || COVER_ANSWER.pending).text}</Pill>
          {cover.note && <span className="text-gray-500">“{cover.note}”</span>}
        </div>
      )}
      {acknowledgers.length > 0 && (
        <div className="text-[11px] text-gray-500 mt-1.5">
          Told: {acknowledgers.map((p) => p.name).join(', ')}
        </div>
      )}
    </div>
  );
};

export default LeaveStatusTrack;
