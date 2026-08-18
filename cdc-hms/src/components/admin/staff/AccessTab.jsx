import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader, ShieldCheck, Archive, ArchiveRestore, KeyRound } from 'lucide-react';
import staffService from '../../../services/staffService';
import api from '../../../services/api';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import { formatDateTime } from './staffFormat';

const EMPLOYMENT_STATUSES = ['Active', 'On Leave', 'Suspended', 'Resigned', 'Terminated'];

// The three states a capability can be in for one person. "Default" is not a
// stored value — it is the absence of both a grant and a withdrawal, which is
// what almost every row is, and it means "whatever this person's role allows".
const GRANTED = 'granted';
const DENIED = 'denied';
const DEFAULT = 'default';

const CHOICES = [
  { value: DENIED, label: 'Withdrawn', tone: 'bg-red-600 text-white',   title: 'Refused even if their role would allow it' },
  { value: DEFAULT, label: 'Default',  tone: 'bg-gray-500 text-white',  title: 'Whatever their role allows' },
  { value: GRANTED, label: 'Granted',  tone: 'bg-blue-600 text-white',  title: 'Allowed on top of their role' },
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
  const stateOf = (capability) => {
    if (denied.includes(capability)) return DENIED;
    if (granted.includes(capability)) return GRANTED;
    return DEFAULT;
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
  const renderRow = (area, capability, label) => (
    <div key={capability} className="flex items-center justify-between gap-4 py-2.5">
      <p className="text-sm text-gray-700">{label}</p>
      {saving === capability
        ? <Loader className="w-4 h-4 animate-spin text-gray-400 mr-8" />
        : (
          <TriState
            value={stateOf(capability)}
            onChange={(next) => change(area, capability, next)}
            disabled={locked}
            label={`${area.name} — ${label}`}
          />
        )}
    </div>
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

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Portal access</h3>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Which portals this person can open, and what they can do. <b>Default</b> leaves it to
          their role — <b>Granted</b> adds it on top, <b>Withdrawn</b> refuses it even when their
          role would allow. What they can do applies wherever it appears, not per portal.
        </p>

        {staff.isTrueAdmin ? (
          <p className="text-sm text-gray-500">
            This is an administrator account. It holds every permission implicitly and cannot be
            withdrawn from, so there is nothing to set here.
          </p>
        ) : !staff.canHoldPermissions ? (
          <p className="text-sm text-gray-500">
            A {staff.role} account cannot hold permissions.
          </p>
        ) : !groups.length ? (
          // An empty list here means the catalog request came back without one —
          // in practice a frontend running ahead of the backend it is talking to.
          // Rendering nothing at all just looks like a broken screen, so say so.
          <div className="text-sm text-gray-500">
            <p className="font-semibold text-gray-700">No permission list available.</p>
            <p className="mt-1">
              The server did not return one. This usually means the API is running an older
              version than this screen — check that the backend is on the same branch and has
              been restarted.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.key}>
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {group.name}
                </h4>
                {group.description && (
                  <p className="text-xs text-gray-400 mt-0.5 mb-2">{group.description}</p>
                )}

                <div className="space-y-2 mt-2">
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
                    </div>
                  ))}
                </div>
              </div>
            ))}

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
