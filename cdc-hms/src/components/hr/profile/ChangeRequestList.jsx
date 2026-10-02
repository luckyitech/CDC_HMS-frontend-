import { useState } from 'react';
import { Pill } from '../hrFormat';
import ConfirmActionModal from '../../shared/ConfirmActionModal';

/**
 * My profile — the changes I asked HR to make (D11) and what became of them.
 * A request still waiting can be withdrawn.
 *
 * props:
 *   requests    GET /api/hr/me → requests
 *   onWithdraw  async (id) => void
 */
const STATUS = {
  pending: { tone: 'warn', label: 'Waiting for HR' },
  approved: { tone: 'ok', label: 'Approved' },
  rejected: { tone: 'bad', label: 'Not approved' },
  withdrawn: { tone: 'n', label: 'Withdrawn' },
};
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) : '');
const show = (v) => (v === null || v === undefined || v === '' ? '—' : v);

const ChangeRequestList = ({ requests = [], onWithdraw }) => {
  const [confirm, setConfirm] = useState(null);
  if (!requests.length) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="change-requests">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Changes you asked for</h3>
      <ul className="divide-y divide-gray-100">
        {requests.slice(0, 12).map((r) => {
          const s = STATUS[r.status] || STATUS.pending;
          return (
            <li key={r.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-gray-800">
                  <b className="font-semibold">{r.label}</b>: {show(r.oldValue)} → {show(r.newValue)}
                </span>
                <span className="flex items-center gap-2">
                  <Pill tone={s.tone}>{s.label}</Pill>
                  {r.status === 'pending' && (
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setConfirm(r)}>Withdraw</button>
                  )}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Asked {day(r.createdAt)}{r.reason ? ` · “${r.reason}”` : ''}
                {r.decidedAt && ` · ${r.status === 'approved' ? 'approved' : 'decided'} ${day(r.decidedAt)}${r.decidedBy ? ` by ${r.decidedBy}` : ''}`}
                {r.decisionNote && ` · ${r.decisionNote}`}
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmActionModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        title="Withdraw this request?"
        message={confirm ? `Your ${confirm.label.toLowerCase()} stays as it is.` : ''}
        confirmLabel="Withdraw"
        onConfirm={async () => { const r = confirm; setConfirm(null); await onWithdraw(r.id); }}
      />
    </div>
  );
};

export default ChangeRequestList;
