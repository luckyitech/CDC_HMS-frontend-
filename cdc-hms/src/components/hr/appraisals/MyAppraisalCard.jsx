import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import hrService from '../../../services/hrService';
import { Pill } from '../hrFormat';
import { STATUS_TONE, shortDate } from './appraisalFormat';

/**
 * My profile — my current appraisal, and any waiting on my review (HR Tier 3
 * Phase 5). Hidden when there is nothing open.
 */
const MyAppraisalCard = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    hrService.myAppraisals().then((r) => { if (live) setData(r?.data || null); }).catch(() => { if (live) setData(null); });
    return () => { live = false; };
  }, []);
  if (!data) return null;
  const current = data.mine.find((a) => a.cycle?.status === 'open' && a.status !== 'cancelled');
  const waiting = data.reviewing.filter((a) => a.status === 'review' && a.cycle?.status === 'open');
  if (!current && !waiting.length) return null;
  const hint = current && (current.status === 'self'
    ? `Complete your self-assessment${current.cycle.selfDueOn ? ` by ${shortDate(current.cycle.selfDueOn)}` : ''}.`
    : current.status === 'sent' ? 'Your review is ready — read it and acknowledge.'
      : current.status === 'review' ? `With ${current.reviewer?.name || 'your reviewer'}.` : 'Done for this year.');
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="my-appraisal">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Appraisal</h3>
      {current && (
        <Link to={`/hr/appraisals/${current.id}`} className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
          <span className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-800">{current.cycle.name}<Pill tone={STATUS_TONE[current.status]}>{current.statusLabel}</Pill></span>
          <span className="mt-1 block text-xs text-gray-500">{hint}</span>
        </Link>
      )}
      {waiting.length > 0 && (
        <Link to="/hr/appraisals" className="mt-2 block text-sm text-primary hover:underline">
          {waiting.length} appraisal{waiting.length === 1 ? '' : 's'} waiting for your review
        </Link>
      )}
    </div>
  );
};

export default MyAppraisalCard;
