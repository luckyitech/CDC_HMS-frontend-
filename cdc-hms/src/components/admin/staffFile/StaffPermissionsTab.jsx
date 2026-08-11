import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Package, AlertTriangle, KeyRound, UserCheck, UserX, Trash2 } from 'lucide-react';
import Card from '../../shared/Card';
import Button from '../../shared/Button';
import { PERMISSIONS } from '../../../utils/permissions';
import staffFileService from '../../../services/staffFileService';
import toast from 'react-hot-toast';

// The capabilities that can be granted, mirroring constants/permissions.js.
// Adding one here + on the backend is all it takes — no migration.
const CATALOGUE = [
  {
    key: PERMISSIONS.ADMIN_ACCESS,
    name: 'Admin Access',
    code: 'admin.access',
    Icon: ShieldCheck,
    description: 'Reach the admin portal and every admin-gated endpoint.',
    warning:
      'They will be able to do everything an administrator can, except grant permissions to others.',
  },
  {
    key: PERMISSIONS.STOCK_MANAGE,
    name: 'Stock Management',
    code: 'stock.manage',
    Icon: Package,
    description: 'Manage the stock / inventory module.',
  },
];

const Toggle = ({ on, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`relative w-11 h-6 rounded-full transition flex-shrink-0 ${
      on ? 'bg-primary' : 'bg-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
        on ? 'left-[22px]' : 'left-0.5'
      }`}
    />
  </button>
);

const StaffPermissionsTab = ({ staff, onSaved }) => {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState(staff.permissions || []);
  const [busy, setBusy] = useState(null);
  const [acting, setActing] = useState(null);
  const isActive = staff.status === 'Active';

  const resetPassword = async () => {
    if (!staff.email) return toast.error('No email on file — add one via Edit details first.');
    if (!window.confirm(`Send a password reset link to ${staff.email}?`)) return;
    setActing('reset');
    try {
      await staffFileService.resetPassword(staff.email);
      toast.success(`Reset link sent to ${staff.email}.`);
    } catch (err) {
      toast.error(err?.message || 'Failed to send reset link.');
    } finally {
      setActing(null);
    }
  };

  const toggleStatus = async () => {
    const activate = !isActive;
    if (!window.confirm(`${activate ? 'Activate' : 'Deactivate'} ${staff.name}?`)) return;
    setActing('status');
    try {
      await staffFileService.setStatus(staff.id, activate);
      toast.success(`${staff.name} ${activate ? 'activated' : 'deactivated'}.`);
      onSaved?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to update status.');
    } finally {
      setActing(null);
    }
  };

  const removeUser = async () => {
    if (!window.confirm(`Delete ${staff.name}? This cannot be undone.`)) return;
    if (!window.confirm(`Are you absolutely sure you want to permanently delete ${staff.name}?`)) return;
    setActing('delete');
    try {
      await staffFileService.deleteUser(staff.id);
      toast.success(`${staff.name} deleted.`);
      navigate('/admin/manage-users');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete user.');
      setActing(null);
    }
  };

  const toggle = async (perm) => {
    const held = permissions.includes(perm.key);
    if (!held && perm.warning && !window.confirm(perm.warning)) return;

    const next = held
      ? permissions.filter((p) => p !== perm.key)
      : [...permissions, perm.key];

    setBusy(perm.key);
    try {
      await staffFileService.setPermissions(staff.id, next);
      setPermissions(next);
      toast.success(`${perm.name} ${held ? 'revoked' : 'granted'}.`);
      onSaved?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to update permission.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Only a real admin account can change these. Granting admin access lets this user do
          everything an admin can, except grant permissions to others.
        </span>
      </div>

      <Card shadow={false} className="border border-gray-100">
        <div className="space-y-3">
          {CATALOGUE.map((perm) => {
            const on = permissions.includes(perm.key);
            return (
              <div
                key={perm.key}
                className="flex items-center justify-between gap-4 border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <perm.Icon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">
                      {perm.name}{' '}
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {perm.code}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{perm.description}</p>
                  </div>
                </div>
                <Toggle on={on} disabled={busy === perm.key} onClick={() => toggle(perm)} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card shadow={false} className="border border-gray-100">
        <h4 className="text-sm font-bold text-gray-700 mb-3">Account</h4>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={resetPassword} disabled={acting === 'reset'} className="flex items-center gap-1.5">
            <KeyRound className="w-4 h-4" /> {acting === 'reset' ? 'Sending…' : 'Reset password'}
          </Button>
          <Button variant="outline" onClick={toggleStatus} disabled={acting === 'status'} className="flex items-center gap-1.5">
            {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {acting === 'status' ? 'Saving…' : isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="danger" onClick={removeUser} disabled={acting === 'delete'} className="flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> {acting === 'delete' ? 'Deleting…' : 'Delete account'}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Edit personal &amp; employment details from the Overview panel (click the name bar).
        </p>
      </Card>
    </div>
  );
};

export default StaffPermissionsTab;
