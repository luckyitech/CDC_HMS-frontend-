import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import LoginLayout from '../../layouts/LoginLayout';
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import { Mail, CheckCircle } from 'lucide-react';
import authService from '../../services/authService';

// ─── Step 1: Request reset email ────────────────────────────────────────────
const RequestResetStep = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      // Always show the same message — don't reveal whether email exists
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <LoginLayout>
        <Card>
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Check Your Email</h2>
            <p className="text-gray-600 mb-2">
              If <span className="font-semibold text-gray-800">{email}</span> is registered, you will receive a password reset link shortly.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Please check your inbox and spam folder. The link expires in 1 hour.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Back to Login
            </Button>
          </div>
        </Card>
      </LoginLayout>
    );
  }

  return (
    <LoginLayout>
      <Card title="Forgot Password">
        <p className="text-gray-600 mb-6 -mt-2">
          Enter your registered email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            required
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="text-primary hover:underline mt-6 text-sm w-full text-center"
        >
          ← Back to portal selection
        </button>
      </Card>
    </LoginLayout>
  );
};

// ─── Step 2: Set new password (user arrived via email link with token) ───────
const ResetPasswordStep = ({ token }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { password, confirm } = form;

    if (!password || !confirm) {
      toast.error('Please fill in both fields', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      toast.error(err.message || 'Reset link is invalid or has expired. Please request a new one.', {
        duration: 6000, position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <LoginLayout>
        <Card>
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Password Reset!</h2>
            <p className="text-gray-600 mb-8">
              Your password has been changed successfully. You can now log in with your new password.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Login
            </Button>
          </div>
        </Card>
      </LoginLayout>
    );
  }

  return (
    <LoginLayout>
      <Card title="Set New Password">
        <p className="text-gray-600 mb-6 -mt-2">
          Enter and confirm your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password *"
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="At least 6 characters"
            required
          />
          <Input
            label="Confirm New Password *"
            type="password"
            value={form.confirm}
            onChange={set('confirm')}
            placeholder="Re-enter new password"
            required
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="text-primary hover:underline mt-6 text-sm w-full text-center"
        >
          ← Back to portal selection
        </button>
      </Card>
    </LoginLayout>
  );
};

// ─── Main component — decides which step to show ─────────────────────────────
const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // If URL has ?token=..., show the "set new password" form
  // Otherwise show the "enter your email" form
  return token ? <ResetPasswordStep token={token} /> : <RequestResetStep />;
};

export default ForgotPasswordPage;
