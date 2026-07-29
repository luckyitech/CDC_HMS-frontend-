import { AlertTriangle } from 'lucide-react';

/**
 * The one place that says a planned doctor review is outstanding on a GLP-1
 * course. Rendered on the nurse's injection card and again beside the
 * "Patient won't see doctor" option in triage, so the same fact reaches the
 * nurse whether they are looking at the injection or at the routing decision.
 *
 * Whether a review is outstanding is decided by the server
 * (utils/glp1ReviewStatus) and arrives on the /full response as `reviewStatus`.
 * This component only phrases it — keeping the rule and its wording apart means
 * a change to either does not drag the other along.
 *
 * Renders nothing when nothing is due, so callers can drop it in unguarded.
 *
 * Props:
 *   reviewStatus — the API's reviewStatus block:
 *                  { due, week, weeksOverdue, outstandingWeeks }
 *   emphasis     — 'warning' (default, amber) when the nurse is only being
 *                  informed; 'urgent' (red) once they have actually chosen to
 *                  bypass the doctor, which is the moment it matters most.
 *   className    — spacing for the surrounding layout
 */

const TONE = {
  warning: {
    box:  'bg-amber-50 border-amber-300',
    icon: 'text-amber-500',
    head: 'text-amber-900',
    body: 'text-amber-800',
  },
  urgent: {
    box:  'bg-red-50 border-red-300',
    icon: 'text-red-500',
    head: 'text-red-900',
    body: 'text-red-800',
  },
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const Glp1ReviewDueBanner = ({ reviewStatus, emphasis = 'warning', className = '' }) => {
  if (!reviewStatus?.due) return null;

  const { week, weeksOverdue = 0, outstandingWeeks = [] } = reviewStatus;
  const tone = TONE[emphasis] || TONE.warning;

  // Overdue reads differently from due-now and carries different urgency, so it
  // gets its own sentence rather than a shared one with a number in it.
  const heading = weeksOverdue > 0
    ? `Doctor review overdue — week ${week} was planned ${plural(weeksOverdue, 'week')} ago`
    : `Doctor review due this week (week ${week})`;

  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 ${tone.box} ${className}`}>
      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tone.icon}`} />
      <div>
        <p className={`text-sm font-semibold ${tone.head}`}>{heading}</p>
        <p className={`text-xs mt-0.5 ${tone.body}`}>
          The doctor planned to see this patient at this point in the course, not
          only to have them injected. Assign a doctor unless the patient genuinely
          cannot wait.
        </p>
        {outstandingWeeks.length > 1 && (
          <p className={`text-xs mt-1 ${tone.body}`}>
            {plural(outstandingWeeks.length, 'planned review')} still unrecorded:
            {' '}weeks {outstandingWeeks.join(', ')}.
          </p>
        )}
      </div>
    </div>
  );
};

export default Glp1ReviewDueBanner;
