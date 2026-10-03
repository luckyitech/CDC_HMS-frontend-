import { useEffect, useRef, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { useHrContext } from '../../contexts/HrContext';
import { canViewHr, canRunOnboarding } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import MyAttendance from '../../components/hr/MyAttendance';
import {
  dayLabel, hoursMinutes, initials, VerificationPill, Pill, roleLabel, greetingFor, titleFor, firstNameOf, hhmmOf,
} from '../../components/hr/hrFormat';

/**
 * HrDashboard — /hr/dashboard (HR Suite, B21). One page, two views.
 *
 * Everyone: their own attendance — <MyAttendance /> (Today · My working hours ·
 * My stars · My phones · Last 7 days; the same component My profile's Activity
 * tab shows, B27 phase 4). Nothing here can check anyone in.
 * hr.view holders additionally get the clinic's day at the top: five tiles,
 * Who's in now, Not yet in, Needs attention — polled every 60 s.
 */
const Card = ({ title, children, className = '', right }) => (
  <section className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between gap-3 mb-3">
        {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>}
        {right}
      </div>
    )}
    {children}
  </section>
);

const Tile = ({ value, of, label, tone = '', to }) => (
  <Link to={to} className={`block rounded-xl border bg-white px-4 py-3 hover:bg-gray-50 transition-colors ${tone === 'warn' ? 'border-amber-400' : tone === 'bad' ? 'border-red-500' : 'border-gray-200'}`}>
    <b className="block text-2xl font-bold leading-tight tabular-nums text-gray-800">
      {value}{of != null && <small className="text-sm font-medium text-gray-500"> of {of}</small>}
    </b>
    <span className="text-xs text-gray-500">{label}</span>
  </Link>
);

const PersonRow = ({ person, sub, right }) => (
  <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
    <div className="w-7 h-7 rounded-full bg-blue-50 text-primary text-[11px] font-bold flex items-center justify-center flex-none">{initials(person?.name)}</div>
    <div className="flex-1 min-w-0">
      <div className="text-sm text-gray-800 truncate">{person?.role === 'doctor' ? 'Dr ' : ''}{person?.name}</div>
      {sub && <div className="text-[11px] text-gray-500 truncate">{sub}</div>}
    </div>
    {right}
  </div>
);

const HrDashboard = () => {
  const { currentUser } = useUserContext();
  const { today: hrToday, loadToday } = useHrContext();
  const isHr = canViewHr(currentUser);
  // HR Tier 3 Phase 3: how many onboarding checklists are in progress (in scope).
  const runsOnboarding = canRunOnboarding(currentUser);
  const [onboardingOpen, setOnboardingOpen] = useState(null);
  useEffect(() => {
    if (!runsOnboarding) return;
    hrService.onboardingCount().then((res) => setOnboardingOpen(res?.data?.open ?? 0)).catch(() => setOnboardingOpen(null));
  }, [runsOnboarding]);

  // HR view: today at the clinic, polled every 60 s while the page is open.
  const pollRef = useRef(null);
  const refreshToday = useCallback(() => {
    loadToday().catch(() => { /* a failed poll keeps the last good copy */ });
  }, [loadToday]);
  useEffect(() => {
    if (!isHr) return undefined;
    refreshToday();
    pollRef.current = setInterval(refreshToday, 60000);
    return () => clearInterval(pollRef.current);
  }, [isHr, refreshToday]);
  const greeting = `${greetingFor()}, ${[titleFor(currentUser), firstNameOf(currentUser)].filter(Boolean).join(' ')}`;
  const subtitle = [
    new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    currentUser?.position, currentUser?.employeeId,
  ].filter(Boolean).join(' · ');

  const t = hrToday;
  const inNow = (t?.people || []).filter((p) => p.state === 'in');
  const notIn = (t?.people || []).filter((p) => p.state === 'not_in' || p.state === 'on_leave');

  return (
    <div>
      <PageHeader title={greeting} subtitle={subtitle} />

      {isHr && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-800">Today at the clinic</h3>
              <p className="text-xs text-gray-500">{t ? `${dayLabel(t.clinicDate, true)}${t.holiday ? ` · ${t.holiday} (public holiday — nobody is expected in unless rostered)` : ''} · ${hhmmOf(t.now)} · updates every minute` : 'Loading…'}</p>
            </div>
            <Link to="/hr/register?preset=today" className="text-sm font-semibold text-primary hover:underline">Open register</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <Tile value={t?.counts?.inNow ?? '—'} of={t?.counts?.total} label="In now" to="/hr/register?preset=today&status=open" />
            <Tile value={t?.counts?.notYetIn ?? '—'} label="Not yet in" tone={t?.counts?.notYetIn ? 'warn' : ''} to="/hr/register?preset=today" />
            <Tile value={t?.counts?.lateToday ?? '—'} label="Late today" tone={t?.counts?.lateToday ? 'warn' : ''} to="/hr/register?preset=today&status=late" />
            <Tile value={t?.counts?.flaggedToday ?? '—'} label="Flagged today" tone={t?.counts?.flaggedToday ? 'warn' : ''} to="/hr/register?preset=today&status=flagged" />
            <Tile value={t?.counts?.missedCheckouts ?? '—'} label="Missed check-out to resolve" tone={t?.counts?.missedCheckouts ? 'bad' : ''} to="/hr/register?preset=month&status=missed" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Card title="Who's in now">
              {inNow.length === 0 && <p className="text-sm text-gray-500">Nobody has checked in yet.</p>}
              {inNow.map((p) => (
                <PersonRow key={p.person.id} person={p.person}
                  sub={[roleLabel(p.person.role), `in ${p.session?.checkInHHMM}`, p.lateIn ? `${p.lateIn} min late` : null].filter(Boolean).join(' · ')}
                  right={<VerificationPill session={p.session} />} />
              ))}
            </Card>
            <div className="space-y-3">
              <Card title="Not yet in">
                {notIn.length === 0 && <p className="text-sm text-gray-500">{t?.holiday ? 'Public holiday — nobody is expected in.' : 'Everyone expected today is in.'}</p>}
                {notIn.map((p) => (
                  <PersonRow key={p.person.id} person={p.person}
                    sub={[roleLabel(p.person.role), p.expected?.start ? `expected ${p.expected.start}` : null].filter(Boolean).join(' · ')}
                    right={p.state === 'on_leave' ? <Pill>On leave</Pill> : p.lateMinutes > 0 ? <Pill tone="warn">{hoursMinutes(p.lateMinutes)} late</Pill> : <Pill>Not yet</Pill>} />
                ))}
              </Card>
              <Card title="Needs attention">
                {(t?.attention || []).length === 0 && <p className="text-sm text-gray-500">Nothing to resolve.</p>}
                {(t?.attention || []).map((a) => {
                  const s = a.session;
                  const sub = a.kind === 'missed_checkout' ? `Checked in ${s.checkInHHMM}, never checked out`
                    : a.kind === 'flagged' ? `Valid tag, request came from ${s.checkInIp || 'an unexpected network'}`
                      : `Tag "${s.door || '?'}" · ${s.diagnostics?.reason === 'replayed_counter' ? 'counter already used' : s.diagnostics?.reason === 'bad_signature' ? 'bad signature' : 'unknown tag'}${s.device ? ` · phone remembered as ${s.person?.name}` : ''}`;
                  const status = a.kind === 'missed_checkout' ? 'missed' : a.kind === 'flagged' ? 'flagged' : 'refused';
                  return (
                    <PersonRow key={`${a.kind}-${s.id}`} person={a.kind === 'refused' ? { name: `Refused tap · ${s.person?.name || '?'}` } : { ...s.person, name: `${s.person?.name} · ${dayLabel(s.clinicDate, true)}` }}
                      sub={sub}
                      right={<Link to={`/hr/register?preset=month&status=${status}&focus=${s.id}`} className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">{a.kind === 'missed_checkout' ? 'Resolve' : 'Review'}</Link>} />
                  );
                })}
              </Card>
            </div>
          </div>
        </div>
      )}

      {runsOnboarding && onboardingOpen > 0 && (
        <Link to="/hr/onboarding" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50">
          <span className="text-sm text-gray-700"><b className="tabular-nums">{onboardingOpen}</b> onboarding checklist{onboardingOpen === 1 ? '' : 's'} in progress</span>
          <span className="text-sm font-semibold text-primary">Open</span>
        </Link>
      )}

      <MyAttendance />
    </div>
  );
};

export default HrDashboard;
