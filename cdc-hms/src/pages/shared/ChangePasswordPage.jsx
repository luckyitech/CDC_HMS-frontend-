import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CalendarClock } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import authService from '../../services/authService';
import { useUserContext } from '../../contexts/UserContext';

const ROLE_DASHBOARDS = {
  doctor:  '/doctor/dashboard',
  staff:   '/staff/dashboard',
  lab:     '/lab/dashboard',
  patient: '/patient/dashboard',
  admin:   '/admin/dashboard',
};

// 'YYYY-MM-DD' → 'Monday, 10 August'. Split rather than new Date(str) so a
// plain date string is never shifted a day by the browser's timezone.
const formatDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
};

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { currentUser, patchCurrentUser } = useUserContext();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scheduled rotation has expired this password: the rest of the app is locked
  // until a new one is set, so there is nothing to go "back" to.
  const isForced = !!currentUser?.mustChangePassword;
  const expiresOn = currentUser?.passwordExpiresOn;
  // "every Monday" / "every second Monday" / "the first Monday of the month" —
  // whatever the admin has the policy set to, so this never contradicts it.
  const policyLabel = currentUser?.passwordPolicyLabel;

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = form;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('New password must be different from your current password', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!', {
        duration: 4000, position: 'top-right',
        style: { background: '#10B981', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      // Clearing mustChangePassword unlocks the UI; the API already unlocked
      // on its side the moment passwordChangedAt was stamped.
      patchCurrentUser({
        mustChangePassword: false,
        passwordExpiresOn: res?.data?.passwordExpiresOn ?? expiresOn,
        passwordPolicyLabel: res?.data?.passwordPolicyLabel ?? policyLabel,
      });

      if (isForced) navigate(ROLE_DASHBOARDS[currentUser.role] || '/');
    } catch (err) {
      toast.error(err.message || 'Failed to change password. Please try again.', {
        duration: 5000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          {isForced ? 'Set a New Password' : 'Change Password'}
        </h2>
        {/* No way back while forced — every other page is locked anyway */}
        {!isForced && (
          <Button variant="outline" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        )}
      </div>

      {isForced && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500 flex gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Your password has expired</p>
            <p className="mt-1 text-sm text-gray-700">
              This clinic requires staff to set a new password
              {policyLabel ? ` ${policyLabel}` : ' regularly'}. Please choose a new one now —
              the rest of the system stays locked until you do.
            </p>
          </div>
        </div>
      )}

      {!isForced && expiresOn && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500 flex gap-3">
          <CalendarClock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            Your current password is valid until <strong>{formatDate(expiresOn)}</strong>.
            {policyLabel && ` Staff passwords are renewed ${policyLabel}.`}
          </p>
        </div>
      )}

      <Card title="🔐 Update Your Password">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current Password *"
            type="password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            placeholder="Enter your current password"
            required
          />

          <Input
            label="New Password *"
            type="password"
            value={form.newPassword}
            onChange={set('newPassword')}
            placeholder="At least 6 characters"
            required
          />

          <Input
            label="Confirm New Password *"
            type="password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            placeholder="Re-enter new password"
            required
          />

          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-700">
              <strong>Tips for a strong password:</strong>
            </p>
            <ul className="mt-1 text-sm text-gray-600 list-disc list-inside space-y-0.5">
              <li>At least 6 characters long</li>
              <li>Mix of uppercase, lowercase, numbers and symbols</li>
              <li>Do not share your password with anyone</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}
            >
              Clear
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Changing...' : '✓ Change Password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
