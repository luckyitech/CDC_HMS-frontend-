import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Loader, ShieldCheck, Archive, ArchiveRestore, KeyRound,
  LayoutGrid, Users, Package, Stethoscope, Briefcase,
} from 'lucide-react';
import staffService from '../../../services/staffService';
import api from '../../../services/api';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import AccordionPanel from '../../shared/AccordionPanel';
import { formatDateTime } from './staffFormat';
import { STAFF_TYPES } from '../../../utils/permissions';

// Keyed off the server's group keys. An unknown group still renders, with the
// generic shield — a group added on the server is never invisible here.
const GROUP_ICONS = {
  portals: LayoutGrid,
  'patient-admin': Users,
  clinical: Stethoscope,
  modules: Package,
  administration: ShieldCheck,
};

// The two halves of the staff bin, and what each one means in practice.
// Phrased as what the person DOES rather than as a category, because the admin
// setting this is thinking about a job, not about a data model.
const STAFF_TYPE_CHOICES = [
  {
    value: STAFF_TYPES.CLINICAL,
    label: 'Clinical',
    icon: Stethoscope,
    blurb: 'Sees and writes the clinical record — consultation notes, vitals, nursing notes.',
    examples: 'Doctors, nurses, clinical officers',
  },
  {
    value: STAFF_TYPES.NON_CLINICAL,
    label: 'Non-clinical',
    icon: Briefcase,
    blurb: 'Registration, queue, appointments, documents and billing. Cannot open the '
      + 'clinical record.',
    examples: 'Reception, accounts, records, administration',
  },
];

const EMPLOYMENT_STATUSES = ['Active', 'On Leave', 'Suspended', 'Resigned', 'Terminated'];

// The three states a capability can be in for one person. "Default" is not a
// stored value — it is the absence of both a grant and a withdrawal, which is
// what almost every row is, and it means "whatever this person's role allows".
const GRANTED = 'granted';
const DENIED = 'denied';
const DEFAULT = 'default';

// Labels are written as instructions to the system, not as adjectives. "Default"
// told an admin nothing — it named a mechanism rather than an outcome, and the
// outcome is the only thing they are actually deciding. Each button now says
// what it DOES; the row above it says what the result currently IS.
const CHOICES = [
  { value: DENIED,  label: 'Never',    tone: 'bg-red-600 text-white',
    title: 'Refuse this, even if their job would normally allow it' },
  { value: DEFAULT, label: 'Normal',   tone: 'bg-gray-500 text-white',
    title: 'Whatever their job normally allows — no exception either way' },
  { value: GRANTED, label: 'Always',   tone: 'bg-blue-600 text-white',
    title: 'Allow this, even if their job would not normally include it' },
];

// A three-way control rather than a switch, because a switch cannot say the
// third thing. "Off" would have to mean both "their role decides" and "refused
// even though their role allows it", and those are different instructions.
const TriState = ({ value, onChange, disabled, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
    {CHOICES.map((choice) => {
      const active = value === choice.value;
      return (
        <button
          key={choice.value}
          type="button"
          role="radio"
          aria-checked={active}
          title={choice.title}
          disabled={disabled}
          onClick={() => !active && onChange(choice.value)}
          className={`px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            active ? choice.tone : 'bg-white text-gray-500 hover:bg-blue-50'
          }`}
        >
          {choice.label}
        </button>
      );
    })}
  </div>
);

const AccessTab = ({ staff, currentUser, onChanged, onArchive, onRestore, onStatusChanged, busy }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [acting, setActing]   = useState(null);

  // The pending confirmation, or null. One piece of state for every
  // consequential action on this tab rather than a boolean each, so adding an
  // action does not add a state variable.
  //
  // window.confirm was doing this job. It is unstyled, cannot be themed to the
  // rest of the system, and blocks the whole browser tab while it is open —
  // which also stalls anything driving the page. ConfirmActionModal already
  // exists for exactly this ("replaces window.confirm / window.prompt") and is
  // what SystemSettings and ClinicalCatalog already use.
  const [confirmation, setConfirmation] = useState(null);

  // Which groups are expanded. Four groups of areas made this tab long enough
  // that the Archive button sat below the fold; collapsed, the whole picture
  // fits on one screen and the summary on each header says what is set inside
  // without opening it.
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (key) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Granting is restricted server-side to a real admin ACCOUNT rather than
  // anyone holding admin.access, so that the capability cannot propagate on its
  // own and become impossible to revoke. The controls mirror that rule rather
  // than offering an action that would be refused.
  const canGrant = currentUser?.role === 'admin';
  const locked = !canGrant || staff.isArchived;

  useEffect(() => {
    let cancelled = false;

    // The group/area list comes from the server so this screen cannot drift
    // from the vocabulary the routes actually enforce.
    staffService.getPermissionCatalog()
      .then((res) => { if (!cancelled) setGroups(res.data.groups || []); })
      .catch(() => { if (!cancelled) toast.error('Failed to load the permission list'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const granted = staff.permissions || [];
  const denied  = staff.deniedPermissions || [];

  // What this person can ACTUALLY do — resolved by the server, not recomputed
  // here. The two lists above are the inputs an admin sets; this is the result,
  // and it is what every row leads with.
  const effective = staff.effectivePermissions || [];
  const typeWord = (staff.staffType || STAFF_TYPES.CLINICAL) === STAFF_TYPES.CLINICAL
    ? 'clinical' : 'non-clinical';
  const stateOf = (capability) => {
    if (denied.includes(capability)) return DENIED;
    if (granted.includes(capability)) return GRANTED;
    return DEFAULT;
  };

  // Human names for whatever has been withdrawn, read off the same catalog the
  // rows render from — so a capability added on the server is never described
  // here by its raw string.
  const withdrawnLabels = groups
    .flatMap((g) => g.areas)
    .filter((a) => !a.broad)
    .flatMap((a) => [
      denied.includes(a.access) ? a.name : null,
      // A withdrawn write on an area whose access is still allowed is worth
      // naming separately — "Users and staff files" alone would overstate it.
      denied.includes(a.write) && !denied.includes(a.access) ? `${a.name} (editing)` : null,
    ])
    .filter(Boolean);

  /**
   * Reclassify someone clinical or non-clinical.
   *
   * This is the control that does most of the work on this tab. Almost nobody
   * needs a single checkbox ticked — they need to be the right kind of staff,
   * and the capabilities follow. The groups below are for the exceptions.
   *
   * The current grants are sent unchanged so a reclassification cannot disturb
   * what has been granted or withdrawn separately.
   */
  const changeStaffType = async (next) => {
    if (next === (staff.staffType || STAFF_TYPES.CLINICAL)) return;

    const run = async () => {
      setSaving('staffType');
      try {
        const res = await staffService.updateStaffType(staff.employeeId, granted, next);
        onChanged(res.data);
        toast.success(next === STAFF_TYPES.CLINICAL
          ? `${staff.firstName} is now clinical staff`
          : `${staff.firstName} is now non-clinical`);
      } catch (err) {
        toast.error(err.message || 'Failed to change this');
      } finally {
        setSaving(null);
      }
    };

    // Only the removing direction is confirmed. Making someone clinical gives
    // them access they can be talked through; making them non-clinical takes
    // away the screens they may have been using this morning, and the admin
    // should see that spelled out before it happens rather than after.
    if (next === STAFF_TYPES.NON_CLINICAL) {
      setConfirmation({
        title: `Make ${staff.firstName} non-clinical?`,
        message: 'They will no longer be able to open consultation notes, treatment plans, '
          + 'nursing notes, vitals or blood-sugar records for any patient, and will lose the '
          + 'ability to record vitals and nursing notes. Registration, the queue, appointments '
          + 'and documents are unaffected. This can be changed back at any time.',
        confirmLabel: 'Make non-clinical',
        confirmVariant: 'danger',
        onConfirm: run,
      });
      return;
    }
    run();
  };

  /**
   * Move one capability to a new state and save the whole picture.
   *
   * Both lists are rebuilt from the current ones, so changing a single area
   * can never drop what the person holds elsewhere. The two coupling rules
   * mirror the server's sanitizers exactly — a write cannot outlive the access
   * it acts within — so the screen never shows a state the server would quietly
   * rewrite underneath it.
   */
  const change = async (area, capability, next) => {
    const isAccess = capability === area.access;
    const nextGranted = new Set(granted);
    const nextDenied  = new Set(denied);

    nextGranted.delete(capability);
    nextDenied.delete(capability);
    if (next === GRANTED) nextGranted.add(capability);
    if (next === DENIED)  nextDenied.add(capability);

    if (area.write && area.access) {
      if (isAccess && next !== GRANTED) nextGranted.delete(area.write);
      if (isAccess && next === DENIED)  nextDenied.add(area.write);
      if (!isAccess && next === GRANTED) {
        nextGranted.add(area.access);
        nextDenied.delete(area.access);
      }
    }

    const save = async () => {
      setSaving(capability);
      try {
        const res = await staffService.updatePermissions(
          staff.employeeId, [...nextGranted], [...nextDenied]
        );
        onChanged(res.data);
        toast.success(`${area.name} updated`);
      } catch (err) {
        toast.error(err.message || 'Failed to update permissions');
      } finally {
        setSaving(null);
      }
    };

    // Confirm the two consequential directions: handing someone the admin
    // portal, and taking something away from someone whose role would normally
    // include it. Ordinary grants save straight away — a confirmation on every
    // toggle trains people to dismiss it without reading.
    const label = capability === area.access ? area.accessLabel : area.writeLabel;

    if (next === DENIED) {
      setConfirmation({
        title: `Withdraw ${area.name}?`,
        message: `“${label}” will be refused for ${staff.name} even though their role would `
          + 'otherwise allow it. Everything else they hold is unaffected.',
        confirmLabel: 'Withdraw',
        confirmVariant: 'danger',
        onConfirm: save,
      });
      return;
    }

    if (next === GRANTED && area.warning) {
      setConfirmation({
        title: `Grant ${area.name} to ${staff.name}?`,
        message: area.warning,
        confirmLabel: 'Grant',
        onConfirm: save,
      });
      return;
    }

    await save();
  };

  const resetPassword = () => {
    if (!staff.email) {
      toast.error('No email on file — add one on the Overview first.');
      return;
    }

    setConfirmation({
      title: 'Send a password reset link?',
      message: `A reset link will be emailed to ${staff.email}. Their current password keeps `
        + 'working until they use it.',
      confirmLabel: 'Send link',
      onConfirm: async () => {
        setActing('reset');
        try {
          await api.post('/auth/forgot-password', { email: staff.email });
          toast.success(`Reset link sent to ${staff.email}`);
        } catch (err) {
          toast.error(err.message || 'Failed to send reset link');
        } finally {
          setActing(null);
        }
      },
    });
  };

  const changeStatus = (employmentStatus) => {
    if (employmentStatus === staff.employmentStatus) return;

    // Naming the consequence, because the two are not the same thing: 'On Leave'
    // still permits login, everything below it does not.
    const stillAllowsLogin = employmentStatus === 'Active' || employmentStatus === 'On Leave';

    setConfirmation({
      title: `Set ${staff.name} to ${employmentStatus}?`,
      message: stillAllowsLogin
        ? 'They will still be able to log in.'
        : 'Their login will be disabled immediately, and any signed-in session ends at their next request.',
      confirmLabel: `Set ${employmentStatus}`,
      confirmVariant: stillAllowsLogin ? 'primary' : 'danger',
      onConfirm: async () => {
        setActing('status');
        try {
          const res = await staffService.updateStatus(staff.employeeId, employmentStatus);
          (onStatusChanged || onChanged)(res.data);
          toast.success(`Status set to ${employmentStatus}`);
        } catch (err) {
          toast.error(err.message || 'Failed to update status');
        } finally {
          setActing(null);
        }
      },
    });
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  // One row per capability. Sections with no meaningful write action render a
  // single row — a write toggle is not added where it would mean nothing.
  //
  // Each row leads with the ANSWER — can this person do this, yes or no — and
  // where that answer comes from. The three buttons only say how to change it.
  //
  // This was the tab's real problem. It showed the inputs (granted, withdrawn)
  // and never the outcome, so an admin asking "can Rahma record vitals?" saw
  // "Default" and was none the wiser: the default depends on whether she is
  // clinical, which is set on a different card. Two people with identical
  // settings could have opposite access and the screen looked the same for both.
  const renderRow = (area, capability, label) => {
    const state = stateOf(capability);
    const allowed = effective.includes(capability);

    // Why it resolved that way, in the admin's words rather than the model's.
    const because =
      state === GRANTED ? 'turned on for this person'
      : state === DENIED ? 'turned off for this person'
      : allowed ? `comes with being ${typeWord} staff`
      : `not part of being ${typeWord} staff`;

    return (
      <div key={capability} className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-700">{label}</p>
          <p className="text-xs mt-0.5">
            <span className={allowed ? 'font-semibold text-green-700' : 'font-semibold text-gray-400'}>
              {allowed ? 'Yes' : 'No'}
            </span>
            <span className="text-gray-400"> — {because}</span>
          </p>
        </div>
        {saving === capability
          ? <Loader className="w-4 h-4 animate-spin text-gray-400 mr-8" />
          : (
            <TriState
              value={state}
              onChange={(next) => change(area, capability, next)}
              disabled={locked}
              label={`${area.name} — ${label}`}
            />
          )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Account</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Role</dt>
            <dd className="text-gray-800 capitalize">{staff.role}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Can log in</dt>
            <dd className={staff.isActive ? 'text-green-700' : 'text-red-600'}>
              {staff.isActive ? 'Yes' : 'No'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Employment status</dt>
            <dd className="text-gray-800">{staff.employmentStatus}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Password last changed</dt>
            <dd className="text-gray-800">
              {staff.passwordChangedAt ? formatDateTime(staff.passwordChangedAt) : 'Never — still on the emailed password'}
            </dd>
          </div>
        </dl>

        {/* Account actions live here rather than in the name bar: they are
            infrequent and consequential, and the bar is for identity. */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={resetPassword}
            disabled={!!acting || staff.isArchived}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {acting === 'reset' ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Reset password
          </button>

          <label className="text-xs text-gray-500 ml-2">Employment status</label>
          <select
            value={staff.employmentStatus}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={!!acting || staff.isArchived}
            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs disabled:opacity-50"
          >
            {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Clinical or non-clinical.
          Above the permission groups on purpose: for almost everyone this is
          the only control that needs touching, and the groups below exist for
          the exceptions. Putting it underneath would invite an admin to tick
          six boxes to reproduce what one choice already does. */}
      {staff.canHoldPermissions && !staff.isTrueAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-1 px-1">
            <Stethoscope className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800">Kind of staff</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3 px-1">
            Whether this person works with patients. This sets most of what they can do —
            the groups below are only for exceptions.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {STAFF_TYPE_CHOICES.map((choice) => {
              const active = (staff.staffType || STAFF_TYPES.CLINICAL) === choice.value;
              const Icon = choice.icon;
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => changeStaffType(choice.value)}
                  disabled={locked || saving === 'staffType'}
                  aria-pressed={active}
                  className={[
                    'text-left rounded-xl border p-4 transition',
                    active
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                    (locked || saving === 'staffType') ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-semibold ${active ? 'text-blue-900' : 'text-gray-800'}`}>
                      {choice.label}
                    </span>
                    {active && saving === 'staffType' && (
                      <Loader className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{choice.blurb}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{choice.examples}</p>
                </button>
              );
            })}
          </div>

          {locked && (
            <p className="text-[11px] text-gray-400 mt-2 px-1">
              {staff.isArchived
                ? 'This staff file is archived.'
                : 'Only an administrator account can change this.'}
            </p>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-1 px-1">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Portal access</h3>
        </div>
        {/* Written as a worked example rather than as definitions. The previous
            version defined three words an admin had never met and left them to
            apply the definitions themselves; this says what they will see and
            what to press, which is the same information in the order it is
            actually needed. */}
        <div className="text-xs text-gray-500 mb-3 px-1 space-y-1">
          <p>
            Every line says whether {staff.firstName} can do that thing right now, and why.
            Most lines will say <b>Normal</b> — that means nothing special has been set and
            their job decides.
          </p>
          <p>
            Press <b className="text-blue-700">Always</b> to let them do something their job
            would not normally include — a receptionist who also does triage.
            Press <b className="text-red-700">Never</b> to stop them doing something their job
            normally would — a nurse who should not be signing reports.
          </p>
        </div>

        {staff.isTrueAdmin ? (
          <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-5">
            This is an administrator account. It holds every permission implicitly and cannot be
            withdrawn from, so there is nothing to set here.
          </p>
        ) : !staff.canHoldPermissions ? (
          <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-5">
            A {staff.role} account cannot hold permissions.
          </p>
        ) : !groups.length ? (
          // An empty list here means the catalog request came back without one —
          // in practice a frontend running ahead of the backend it is talking to.
          // Rendering nothing at all just looks like a broken screen, so say so.
          <div className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-semibold text-gray-700">No permission list available.</p>
            <p className="mt-1">
              The server did not return one. This usually means the API is running an older
              version than this screen — check that the backend is on the same branch and has
              been restarted.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              // A collapsed group still has to say whether anything is set
              // inside it, or an admin has to open all four to find out.
              const caps = group.areas.flatMap((a) => [a.access, a.write]).filter(Boolean);
              const nGranted = caps.filter((c) => stateOf(c) === GRANTED).length;
              const nDenied  = caps.filter((c) => stateOf(c) === DENIED).length;

              return (
                <AccordionPanel
                  key={group.key}
                  icon={GROUP_ICONS[group.key] || ShieldCheck}
                  label={group.name}
                  isOpen={!!openGroups[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                  badge={
                    <span className="flex items-center gap-1.5">
                      {nGranted > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">
                          {nGranted} granted
                        </span>
                      )}
                      {nDenied > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-semibold">
                          {nDenied} withdrawn
                        </span>
                      )}
                      {nGranted === 0 && nDenied === 0 && (
                        <span className="text-xs text-gray-400">Role defaults</span>
                      )}
                    </span>
                  }
                >
                  {group.description && (
                    <p className="text-xs text-gray-400 mb-3">{group.description}</p>
                  )}
                  <div className="space-y-2">
                {group.areas.map((area) => (
                  <div key={area.key} className="border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{area.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        {/* Where this applies. A capability is global, so the
                            same one can show up in several portals — naming
                            them stops the grid reading as if it were per
                            portal. */}
                        {area.appliesIn && <span>In: {area.appliesIn}</span>}
                        {area.roleDefault && <span>By role: {area.roleDefault}</span>}
                      </div>
                    </div>
                    {area.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{area.description}</p>
                    )}

                    <div className="divide-y divide-gray-100 mt-2">
                      {area.access && renderRow(area, area.access, area.accessLabel)}
                      {area.write && renderRow(area, area.write, area.writeLabel)}
                    </div>

                    {/* A broad grant with withdrawals elsewhere is not a
                        contradiction — the withdrawal wins, and the person
                        really is refused those endpoints. But a card reading
                        "can do everything an admin can" next to a red
                        Withdrawn looks like the screen is lying, so name the
                        exceptions here rather than leaving it to be inferred. */}
                    {area.broad && stateOf(area.access) === GRANTED && withdrawnLabels.length > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                        Except {withdrawnLabels.join(', ')} — withdrawn below, and a withdrawal
                        always overrides this.
                      </p>
                    )}
                  </div>
                ))}
                  </div>
                </AccordionPanel>
              );
            })}

            {!canGrant && (
              <p className="text-xs text-gray-400 pt-1">
                Only an administrator account can change permissions.
              </p>
            )}
            {staff.isArchived && (
              <p className="text-xs text-gray-400 pt-1">
                This account is archived. Restore it before changing what it can reach.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Separated and bordered rather than sitting in the header, so it cannot
          be hit by accident. The wording says what actually happens. */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-800 mb-1">
          {staff.isArchived ? 'Restore this account' : 'Archive this account'}
        </h3>
        <p className="text-xs text-red-700 mb-3">
          {staff.isArchived
            ? 'Brings them back into staff lists. Login stays disabled until you set their employment status back to Active.'
            : 'Disables login and hides them from staff lists. Their name stays on past prescriptions, notes and lab results, and this can be undone.'}
        </p>
        <button
          onClick={staff.isArchived ? onRestore : onArchive}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-60"
        >
          {staff.isArchived
            ? <><ArchiveRestore className="w-4 h-4" /> Restore</>
            : <><Archive className="w-4 h-4" /> Archive</>}
        </button>
      </div>

      {/* One modal for every confirmation on this tab. Rendered once at the end
          rather than per action, so the markup does not grow with the number of
          things that need confirming. Portaled by Modal, so the floating
          sidebar cannot clip it. */}
      <ConfirmActionModal
        isOpen={!!confirmation}
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          const action = confirmation?.onConfirm;
          setConfirmation(null);   // close first, so the tab is responsive while the request runs
          if (action) action();
        }}
        title={confirmation?.title || ''}
        message={confirmation?.message || ''}
        confirmLabel={confirmation?.confirmLabel || 'Confirm'}
        confirmVariant={confirmation?.confirmVariant || 'primary'}
      />
    </div>
  );
};

export default AccessTab;
