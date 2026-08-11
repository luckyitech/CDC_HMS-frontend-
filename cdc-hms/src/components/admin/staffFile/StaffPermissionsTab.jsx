import { useState } from 'react';
import { ShieldCheck, Package, AlertTriangle } from 'lucide-react';
import Card from '../../shared/Card';
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
  const [permissions, setPermissions] = useState(staff.permissions || []);
  const [busy, setBusy] = useState(null);

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
    </div>
  );
};

export default StaffPermissionsTab;
