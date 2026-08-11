import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader, ShieldCheck, Archive, ArchiveRestore } from 'lucide-react';
import staffService from '../../../services/staffService';
import { formatDateTime } from './staffFormat';

// Labels for the capability strings the API returns. A permission with no entry
// here still renders — using the raw string — so a capability added on the
// server is never silently invisible in the UI.
const PERMISSION_LABELS = {
  'admin.access': {
    name: 'Admin access',
    description: 'Everything an administrator can do, except granting permissions to others.',
    warning: 'They will be able to do everything an administrator can, except grant permissions to others.',
  },
  'stock.manage': {
    name: 'Stock management',
    description: 'View and manage the stock module.',
  },
};

const Toggle = ({ on, onClick, disabled, label }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    role="switch"
    aria-checked={on}
    aria-label={label}
    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
      on ? 'bg-blue-600' : 'bg-gray-300'
    }`}
  >
    <span
      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
        on ? 'translate-x-5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

const AccessTab = ({ staff, currentUser, onChanged, onArchive, onRestore, busy }) => {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  // Granting is restricted server-side to a real admin ACCOUNT rather than
  // anyone holding admin.access, so that the capability cannot propagate on its
  // own and become impossible to revoke. The toggles mirror that rule rather
  // than offering an action that would be refused.
  const canGrant = currentUser?.role === 'admin';

  useEffect(() => {
    let cancelled = false;

    staffService.getPermissionCatalog()
      .then((res) => { if (!cancelled) setCatalog(res.data.permissions || []); })
      .catch(() => { if (!cancelled) toast.error('Failed to load the permission list'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const toggle = async (permission) => {
    const held = (staff.permissions || []).includes(permission);
    const meta = PERMISSION_LABELS[permission] || { name: permission };

    const message = held
      ? `Revoke ${meta.name} from ${staff.name}?`
      : `Grant ${meta.name} to ${staff.name}?${meta.warning ? `\n\n${meta.warning}` : ''}`;
    if (!window.confirm(message)) return;

    // Built from the full current list, so granting one capability cannot drop
    // the others the person already holds.
    const next = held
      ? (staff.permissions || []).filter((p) => p !== permission)
      : [...(staff.permissions || []), permission];

    setSaving(permission);
    try {
      const res = await staffService.updatePermissions(staff.employeeId, next);
      onChanged(res.data);
      toast.success(`${meta.name} ${held ? 'revoked' : 'granted'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update permissions');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

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
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Permissions</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Granted on top of what their role already allows.
        </p>

        {staff.isTrueAdmin ? (
          <p className="text-sm text-gray-500">
            This is an administrator account. It holds every permission implicitly, so there is
            nothing to grant.
          </p>
        ) : !staff.canHoldPermissions ? (
          <p className="text-sm text-gray-500">
            A {staff.role} account cannot hold permissions.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {catalog.map((permission) => {
              const meta = PERMISSION_LABELS[permission] || { name: permission, description: '' };
              const held = (staff.permissions || []).includes(permission);

              return (
                <div key={permission} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm text-gray-800">{meta.name}</p>
                    {meta.description && <p className="text-xs text-gray-400">{meta.description}</p>}
                  </div>
                  {saving === permission
                    ? <Loader className="w-4 h-4 animate-spin text-gray-400" />
                    : <Toggle on={held} onClick={() => toggle(permission)} disabled={!canGrant || staff.isArchived} label={meta.name} />}
                </div>
              );
            })}

            {!canGrant && (
              <p className="text-xs text-gray-400 pt-3">
                Only an administrator account can change permissions.
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
    </div>
  );
};

export default AccessTab;
