import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import OtpStep from '../../components/auth/OtpStep';
import LoginLayout from '../../layouts/LoginLayout';
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import { landingFor } from '../../utils/landing';
import { NO_PORTAL_MESSAGE } from '../../constants/accessMessages';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, verifyOtp, resendOtp } = useUserContext();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  // Set when two-factor is on and the password was accepted. Its presence is
  // what swaps the form for the code step — held in component state only, so a
  // refresh drops back to the password form rather than stranding the user on
  // a code box whose challenge it can no longer name.
  const [challenge, setChallenge] = useState(null);

  // Where a signed-in user lands. Shared by the password-only path and the
  // two-factor path so a session opened with a code cannot end up somewhere
  // different from one opened without.
  const goOnwards = (user) => {
    // An expired password (weekly rotation) goes straight to the change
    // screen. ProtectedRoute would bounce them there anyway; going direct
    // avoids a flash of the dashboard they cannot use.
    if (user.mustChangePassword) {
      navigate(`/${user.role}/change-password`);
      return;
    }

    // Decided by what this account can actually open, not by its role.
    // ROLE_DASHBOARDS maps a role to ONE dashboard, which is the same
    // "one home portal per role" assumption already removed from
    // ROLE_DEFAULT_PORTALS when it locked doctors out of the ward — it
    // just survived here. It is still the right key for the
    // change-password redirect above, where the role genuinely decides.
    const destination = landingFor(user);
    if (destination) {
      navigate(destination);
    } else {
      setError(NO_PORTAL_MESSAGE);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        goOnwards(result.user);
        return;
      }

      // Two-factor is on: the password was right and a code is in their inbox.
      if (result.otpRequired) {
        setChallenge({
          challengeId: result.challengeId,
          maskedEmail: result.maskedEmail,
          expiresMinutes: result.expiresMinutes,
        });
        return;
      }

      setError(result.message);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // The code step hands back whatever verifyOtp said, so OtpStep can show the
  // attempts left and decide whether this challenge is finished.
  const handleVerify = async (code) => {
    const result = await verifyOtp(challenge.challengeId, code);
    if (result.success) goOnwards(result.user);
    return result;
  };

  const restart = () => {
    setChallenge(null);
    setError('');
    // The password is cleared, the email is not: starting again almost always
    // means "I mistyped the password", not "I am a different person".
    setFormData((prev) => ({ ...prev, password: '' }));
  };

  return (
    <LoginLayout
      help={(
        <>
          <button type="button" onClick={() => navigate('/forgot-password')} className="text-primary font-semibold hover:underline">
            Forgot password?
          </button>
          <span className="login-secure">● Secure connection</span>
        </>
      )}
    >
      <Card title={challenge ? 'Check your email' : 'Welcome back'}>
        {challenge ? (
          <OtpStep
            challengeId={challenge.challengeId}
            maskedEmail={challenge.maskedEmail}
            expiresMinutes={challenge.expiresMinutes}
            onVerify={handleVerify}
            onResend={() => resendOtp(challenge.challengeId)}
            onRestart={restart}
          />
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter your email"
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter your password"
            required
          />

          <Button type="submit" className="w-full mt-6" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
            {/* Hover: the round arrow slides right (login.css .login-arrow). */}
            {!loading && <span className="login-arrow" aria-hidden="true"><ArrowRight className="w-4 h-4" /></span>}
          </Button>
        </form>
        )}
      </Card>
    </LoginLayout>
  );
};

export default LoginPage;
