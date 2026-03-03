import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import authService from '../../services/authService';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!', {
        duration: 4000, position: 'top-right',
        style: { background: '#10B981', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Change Password</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </div>

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
