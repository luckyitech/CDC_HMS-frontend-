import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Check } from 'lucide-react';
import Card from '../../components/shared/Card';
import CardTitle from '../../components/shared/CardTitle';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import authService from '../../services/authService';
import { useUserContext } from '../../contexts/UserContext';
import { dashboardFor } from '../../constants/roleDashboards';

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
  // "every week" / "every two weeks" / "every month" — whatever the admin has
  // the policy set to, so this never contradicts the System Settings page.
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

      if (isForced) navigate(dashboardFor(currentUser.role));
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
      <div className="flex items-start justify-between gap-4 mb-2">
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

      {/* The state is the page's subject, so it reads as the subtitle rather
          than a tinted callout shouting at someone already held here. */}
      <p className="mb-6 text-sm text-gray-600 leading-relaxed">
        {isForced
          ? `Your password has reached the end of its ${policyLabel ? policyLabel.replace(/^every /, '') : 'current'} period. Choose a new one to carry on — the rest of the system stays locked until you do.`
          : 'Choose a new password for your account.'}
      </p>

      <Card title={<CardTitle icon={KeyRound}>Update Your Password</CardTitle>}>
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
          <p className="-mt-2 text-xs text-gray-500">
            Must be different from your current password.
          </p>

          <Input
            label="Confirm New Password *"
            type="password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            placeholder="Re-enter new password"
            required
          />

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
              {isSubmitting ? 'Changing...' : (<><Check className="w-4 h-4" /> Change Password</>)}
            </Button>
          </div>

          {expiresOn && (
            <p className="text-xs text-gray-500">
              Next change due {formatDate(expiresOn)}.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
