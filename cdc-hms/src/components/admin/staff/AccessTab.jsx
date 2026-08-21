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

// The tab is a list of checkboxes: ticked means this person can do it, empty
// means they cannot. That is the only question an admin has.
//
// It replaced a three-way control — Withdrawn / Default / Granted — which was
// accurate about the model and useless at the sink. "Default" named a mechanism
// rather than an outcome, and the outcome depended on a setting made on a
// different card, so two people with identical rows could have opposite access
// and the screen looked the same for both.
//
// Nothing is lost. The three stored states still exist; the screen just works
// out which one to write. See stateForTick below — unticking something a person
// would have anyway must record a REFUSAL, while unticking something they only
// had because it was ticked just removes the tick. The admin never needs to
// know the difference, and previously had to.
const Tick = ({ checked, onChange, disabled, label, busy }) => (
  <label
    className={`flex items-center gap-3 py-2.5 rounded-lg px-2 -mx-2 ${
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
    }`}
  >
    {busy
      ? <Loader className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
      : (
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0
                     disabled:cursor-not-allowed"
        />
      )}
    <span className={`text-sm ${checked ? 'text-gray-800' : 'text-gray-500'}`}>{label}</span>
  </label>
);

const AccessTab = ({ staff, currentUser, onChanged, onArchive, onRestore, onStatusChanged, busy }) => {
  const [groups, setGroups] = useState([]);
  // Served with the catalog: what full administrator access carries.
  const [catalog, setCatalog] = useState({});
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
      .then((res) => {
        if (cancelled) return;
        setGroups(res.data.groups || []);
        setCatalog(res.data || {});
      })
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
  // What they would hold with nothing ticked either way. Only used to work out
  // what a tick has to STORE — see change() — never shown.
  const byDefault = staff.defaultPermissions || [];
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
  const change = async (area, capability, ticked) => {
    const isAccess = capability === area.access;
    const nextGranted = new Set(granted);
    const nextDenied  = new Set(denied);

    /**
     * Turn "can they do this, yes or no" into what has to be STORED.
     *
     * Three stored states, one checkbox. The rule is that a tick only needs
     * recording when it disagrees with what this person would have anyway:
     *
     *   ticked   + would have it anyway -> store nothing (it is their normal)
     *   ticked   + would NOT have it    -> store a grant
     *   unticked + would have it anyway -> store a refusal
     *   unticked + would NOT have it    -> store nothing
     *
     * Without the middle two the checkbox could not express a receptionist who
     * also does triage, or a nurse held out of one thing — the two cases the
     * whole tab exists for.
     */
    const set = (cap, on) => {
      const normallyHas = byDefault.includes(cap);
      nextGranted.delete(cap);
      nextDenied.delete(cap);
      if (on && !normallyHas) nextGranted.add(cap);
      if (!on && normallyHas) nextDenied.add(cap);
    };

    set(capability, ticked);

    // A write cannot outlive the access it acts within, mirroring the server's
    // sanitizers — so the screen never shows a state the server would quietly
    // rewrite underneath it.
    if (area.write && area.access) {
      if (isAccess && !ticked) set(area.write, false);       // no read, no write
      if (!isAccess && ticked) set(area.access, true);        // writing implies reading
    }

    // A broad capability is a claim about everything beneath it, so unticking
    // any one child has to untick the parent: someone refused the activity log
    // cannot still be described as able to do everything an administrator can.
    //
    // The children they DO still have are written out individually, so nothing
    // is lost in the process — untick one of six and you keep five, each now
    // ticked in its own right.
    //
    // This only works because the parent is exactly the sum of what is shown
    // beneath it. Ten admin-only routes previously had no box at all, so
    // dropping the parent would have removed ten powers nothing on screen
    // mentioned; they now have boxes of their own (Merge and delete patient
    // records, Beds/catalog/stock setup) and are carried across like the rest.
    const broad = groups.flatMap((g) => g.areas).find((a) => a.broad);
    const broadCap = broad?.access || broad?.write;
    if (!ticked && broadCap && capability !== broadCap && effective.includes(broadCap)) {
      const covered = (catalog.adminAccessCovers || []).filter((c) => c !== capability);
      set(broadCap, false);
      covered.forEach((c) => set(c, true));
    }

    const label = isAccess ? area.accessLabel : area.writeLabel;

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

    // Confirm only the two consequential directions: taking away something this
    // person would normally have, and handing over something flagged as
    // consequential. An ordinary tick saves straight away — a confirmation on
    // every click trains people to dismiss it without reading.
    if (!ticked && byDefault.includes(capability)) {
      setConfirmation({
        title: `Stop ${staff.firstName} doing this?`,
        message: `“${label}” normally comes with their job. Unticking it refuses it for `
          + `${staff.name} specifically. Everything else they hold is unaffected, and you `
          + 'can tick it again at any time.',
        confirmLabel: 'Stop it',
        confirmVariant: 'danger',
        onConfirm: save,
      });
      return;
    }

    if (ticked && area.warning) {
      setConfirmation({
        title: `Allow ${staff.firstName} to do this?`,
        message: area.warning,
        confirmLabel: 'Allow',
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
  const renderRow = (area, capability, label) => (
    <Tick
      key={capability}
      checked={effective.includes(capability)}
      busy={saving === capability}
      disabled={locked}
      label={label}
      onChange={(ticked) => change(area, capability, ticked)}
    />
  );

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
        <p className="text-xs text-gray-500 mb-3 px-1">
          Ticked means {staff.firstName} can do it. Untick to stop them, tick to allow them —
          a receptionist who also does triage, a nurse who should not sign reports.
        </p>

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
              // A collapsed group counts what is ticked out of what is there,
              // which is the same thing the checkboxes inside say. It used to
              // report "granted" and "withdrawn" — storage words the admin
              // never sees any more.
              const caps = group.areas.flatMap((a) => [a.access, a.write]).filter(Boolean);
              const nOn = caps.filter((c) => effective.includes(c)).length;

              return (
                <AccordionPanel
                  key={group.key}
                  icon={GROUP_ICONS[group.key] || ShieldCheck}
                  label={group.name}
                  isOpen={!!openGroups[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                  badge={
                    <span className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        nOn > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {nOn} of {caps.length}
                      </span>
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
                    {area.broad && effective.includes(area.access) && withdrawnLabels.length > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                        Except {withdrawnLabels.join(', ')} — unticked below, and that wins.
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
