import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Paperclip } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canApproveProfileChanges, canVerifyCpd, canViewStaff } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import { notify } from '../../utils/notify';
import { Pill, initials, PROFILE_REQUESTS_CHANGED } from '../../components/hr/hrFormat';
import { buttonCls, primaryButtonCls } from '../../components/hr/hrUi';

/**
 * Profile requests — /hr/requests. Two queues, each behind its own permission
 * (B27 phases 4 & 5):
 *   - Profile changes (hr.profile.approve): what colleagues asked to change on
 *     their own record. Approve writes it to the staff file and logs it.
 *   - CPD to verify (cpd.verify): colleagues' CPD entries; verify (adjusting
 *     the points if needed) or reject with a note. Verifying locks the row.
 * Nobody decides their own — the server refuses, and the screen doesn't offer it.
 */
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) : '');
const dayShort = (iso) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const show = (v) => (v === null || v === undefined || v === '' ? '—' : v);
const CATEGORY_LABEL = { conference: 'Conference', course: 'Course', webinar: 'Webinar', workshop: 'Workshop', 'self-study': 'Self-study', other: 'Other' };

const InnerTabs = ({ tab, setTab, decidedLabel }) => (
  <div className="flex gap-1 p-2 border-b border-gray-100" role="tablist">
    {[['pending', 'Waiting'], ['decided', decidedLabel]].map(([id, label]) => (
      <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{label}</button>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Profile changes (hr.profile.approve)
// ---------------------------------------------------------------------------
const ProfileChanges = ({ currentUser }) => {
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try { setRows((await hrService.changeRequests(tab)).data); } catch { setRows([]); }
  }, [tab]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const openCopy = async (row) => {
    try {
      const blob = await hrService.changeAttachment(row.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { notify('error', err.message || 'Could not open the document'); }
  };

  const decide = async (row, decision, note) => {
    setBusy(row.id);
    try {
      await hrService.decideChange(row.id, { decision, note: note || null });
      notify('success', decision === 'approve' ? `${row.label} updated on ${row.person.name}'s file` : 'Request not approved');
      window.dispatchEvent(new CustomEvent(PROFILE_REQUESTS_CHANGED));
      load();
    } catch (err) { notify('error', err.message || 'That did not work'); }
    finally { setBusy(null); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <InnerTabs tab={tab} setTab={setTab} decidedLabel="Decided" />
      {rows === null ? <div className="p-4"><Spinner /></div> : rows.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">{tab === 'pending' ? 'Nothing is waiting.' : 'No requests decided yet.'}</p>
      ) : (
        <ul className="divide-y divide-gray-100" data-testid="profile-requests">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start gap-3 p-3 text-sm">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">{initials(r.person?.name)}</span>
              <div className="flex-1 min-w-[12rem]">
                <div className="text-gray-900">
                  {canViewStaff(currentUser) && r.person?.employeeId
                    ? <Link to={`/hr/staff/${r.person.employeeId}`} className="font-semibold hover:underline">{r.person.name}</Link>
                    : <b className="font-semibold">{r.person?.name}</b>}
                  <span className="text-gray-500"> · {r.label}</span>
                </div>
                <div className="text-gray-800 mt-0.5">{show(r.oldValue)} <span className="text-gray-400">→</span> <b>{show(r.newValue)}</b></div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Asked {day(r.createdAt)}{r.reason ? ` · “${r.reason}”` : ''}
                  {r.attachment && (
                    <button type="button" onClick={() => openCopy(r)} className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline">
                      <Paperclip className="w-3 h-3" /> copy attached
                    </button>
                  )}
                  {r.decidedAt && ` · ${r.status} ${day(r.decidedAt)}${r.decidedBy ? ` by ${r.decidedBy}` : ''}${r.decisionNote ? ` · ${r.decisionNote}` : ''}`}
                </div>
              </div>
              {tab === 'pending' ? (
                r.mine ? <Pill>Your own — someone else decides</Pill> : (
                  <div className="flex gap-2">
                    <button type="button" className={`${buttonCls} inline-flex items-center gap-1 text-red-700`} disabled={busy === r.id} onClick={() => setRejecting(r)}><X className="w-3.5 h-3.5" /> Reject</button>
                    <button type="button" className={`${primaryButtonCls} inline-flex items-center gap-1`} disabled={busy === r.id} onClick={() => decide(r, 'approve')}><Check className="w-4 h-4" /> Approve</button>
                  </div>
                )
              ) : <Pill tone={r.status === 'approved' ? 'ok' : 'bad'}>{r.status === 'approved' ? 'Approved' : 'Not approved'}</Pill>}
            </li>
          ))}
        </ul>
      )}
      <ConfirmActionModal
        isOpen={!!rejecting} onClose={() => setRejecting(null)}
        title="Don't approve this change?"
        message={rejecting ? `${rejecting.person?.name} will be told. Their ${rejecting.label.toLowerCase()} stays as it is.` : ''}
        confirmLabel="Reject" confirmVariant="danger" withReason reasonLabel="Why (they will see this)"
        onConfirm={(note) => { const r = rejecting; setRejecting(null); if (!note) { notify('error', 'Say why it is rejected'); return; } decide(r, 'reject', note); }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// CPD to verify (cpd.verify)
// ---------------------------------------------------------------------------
const CpdToVerify = ({ currentUser }) => {
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState(null);
  const [pointsBy, setPointsBy] = useState({});
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await hrService.cpdToVerify(tab);
      setRows(res.data);
      setPointsBy(Object.fromEntries(res.data.map((r) => [r.id, String(r.points)])));
    } catch { setRows([]); }
  }, [tab]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const decide = async (row, decision, note) => {
    setBusy(row.id);
    try {
      const body = decision === 'verify' ? { decision, points: Number(pointsBy[row.id]) } : { decision, note };
      await hrService.verifyCpd(row.id, body);
      notify('success', decision === 'verify' ? `Verified · ${Number(pointsBy[row.id])} pts to ${row.person.name}` : 'CPD not approved');
      load();
    } catch (err) { notify('error', err.message || 'That did not work'); }
    finally { setBusy(null); }
  };

  const openCert = async (row) => {
    try {
      const blob = await hrService.cpdCertificate(row.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { notify('error', err.message || 'Could not open the certificate'); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <InnerTabs tab={tab} setTab={setTab} decidedLabel="Decided" />
      {rows === null ? <div className="p-4"><Spinner /></div> : rows.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">{tab === 'pending' ? 'No CPD waiting to verify.' : 'No CPD decided yet.'}</p>
      ) : (
        <ul className="divide-y divide-gray-100" data-testid="cpd-verify">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">{initials(r.person?.name)}</span>
              <div className="flex-1 min-w-[14rem]">
                <div className="text-gray-900">
                  {canViewStaff(currentUser) && r.person?.employeeId
                    ? <Link to={`/hr/staff/${r.person.employeeId}`} className="font-semibold hover:underline">{r.person.name}</Link>
                    : <b className="font-semibold">{r.person?.name}</b>}
                  <span className="text-gray-500"> · {r.title}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {CATEGORY_LABEL[r.category] || r.category}{r.provider ? ` · ${r.provider}` : ''} · {dayShort(r.date)}
                  {r.document
                    ? <button type="button" onClick={() => openCert(r)} className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"><Paperclip className="w-3 h-3" /> certificate</button>
                    : <span className="ml-1 text-red-600">no certificate</span>}
                  {r.status !== 'pending' && r.decisionNote && ` · ${r.decisionNote}`}
                </div>
              </div>
              {tab === 'pending' ? (
                <>
                  <label className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <input type="number" min="0" step="0.5" value={pointsBy[r.id] ?? ''} onChange={(e) => setPointsBy((p) => ({ ...p, [r.id]: e.target.value }))}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm tabular-nums" aria-label="Points" /> pts
                  </label>
                  <div className="flex gap-2">
                    <button type="button" className={`${buttonCls} inline-flex items-center gap-1 text-red-700`} disabled={busy === r.id} onClick={() => setRejecting(r)}><X className="w-3.5 h-3.5" /> Reject</button>
                    <button type="button" className={`${primaryButtonCls} inline-flex items-center gap-1`} disabled={busy === r.id} onClick={() => decide(r, 'verify')}><Check className="w-4 h-4" /> Verify · {Number(pointsBy[r.id] || 0)} pts</button>
                  </div>
                </>
              ) : <Pill tone={r.status === 'verified' ? 'ok' : 'bad'}>{r.status === 'verified' ? `Verified · ${Number(r.points)} pts` : 'Rejected'}</Pill>}
            </li>
          ))}
        </ul>
      )}
      <ConfirmActionModal
        isOpen={!!rejecting} onClose={() => setRejecting(null)}
        title="Don't approve this CPD?"
        message={rejecting ? `${rejecting.person?.name} will be told. "${rejecting.title}" will be marked rejected.` : ''}
        confirmLabel="Reject" confirmVariant="danger" withReason reasonLabel="Why (they will see this)"
        onConfirm={(note) => { const r = rejecting; setRejecting(null); if (!note) { notify('error', 'Say why it is rejected'); return; } decide(r, 'reject', note); }}
      />
    </div>
  );
};

const ProfileRequests = () => {
  const { currentUser } = useUserContext();
  const canProfile = canApproveProfileChanges(currentUser);
  const canCpd = canVerifyCpd(currentUser);
  const sections = [
    canProfile && { id: 'profile', label: 'Profile changes' },
    canCpd && { id: 'cpd', label: 'CPD to verify' },
  ].filter(Boolean);
  const [section, setSection] = useState(sections[0]?.id);

  if (!sections.length) {
    return (
      <div>
        <PageHeader title="Profile requests" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          This page needs the “Profile change requests” or “Verify CPD &amp; credentials” permission.
        </div>
      </div>
    );
  }

  const active = sections.some((s) => s.id === section) ? section : sections[0].id;

  return (
    <div>
      <PageHeader title="Profile requests" subtitle="Changes colleagues asked for, and CPD to verify." />
      {sections.length > 1 && (
        <div className="flex gap-2 mb-3" role="tablist">
          {sections.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={active === s.id} onClick={() => setSection(s.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${active === s.id ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s.label}</button>
          ))}
        </div>
      )}
      {active === 'profile' ? <ProfileChanges currentUser={currentUser} /> : <CpdToVerify currentUser={currentUser} />}
    </div>
  );
};

export default ProfileRequests;
