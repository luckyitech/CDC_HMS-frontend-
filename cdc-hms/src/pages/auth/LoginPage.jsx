import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import LoginLayout from '../../layouts/LoginLayout';
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import { landingFor } from '../../utils/landing';
import { NO_PORTAL_MESSAGE } from '../../constants/accessMessages';
import CheckinGateCard from '../../components/auth/CheckinGateCard';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, gateCheck } = useUserContext();
  const [formData, setFormData] = useState({ email: '', password: '' });
  // A session the network lock ended (services/api.js) leaves its reason here.
  const [error, setError]       = useState(() => {
    try { return sessionStorage.getItem('signoutReason') || ''; } catch { return ''; }
  });
  useEffect(() => { try { sessionStorage.removeItem('signoutReason'); } catch { /* private mode */ } }, []);
  const [loading, setLoading]   = useState(false);

  // The check-in gate (2 Nov 2026): the 423 body while the person is held.
  const [gate, setGate] = useState(null);

  // What happens with any sign-in answer — from the form (password) or from
  // the gate card's "check again" (the gate ticket, never the password).
  const settle = (result) => {
    if (result.success) {
      setGate(null);
      // An expired password (weekly rotation) goes straight to the change
      // screen. ProtectedRoute would bounce them there anyway; going direct
      // avoids a flash of the dashboard they cannot use.
      if (result.user.mustChangePassword) {
        navigate(`/${result.user.role}/change-password`);
        return;
      }

      // Decided by what this account can actually open, not by its role.
      // ROLE_DASHBOARDS maps a role to ONE dashboard, which is the same
      // "one home portal per role" assumption already removed from
      // ROLE_DEFAULT_PORTALS when it locked doctors out of the ward — it
      // just survived here. It is still the right key for the
      // change-password redirect above, where the role genuinely decides.
      const destination = landingFor(result.user);
      if (destination) {
        navigate(destination);
      } else {
        setError(NO_PORTAL_MESSAGE);
      }
    } else if (result.code === 'CHECKIN_REQUIRED') {
      // Held at the check-in gate: the password is no longer needed here.
      setGate(result.data || {});
      setFormData((f) => ({ ...f, password: '' }));
    } else {
      setGate(null);
      setError(result.message);
    }
  };

  const checkAgain = async () => settle(await gateCheck(gate?.ticket));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      settle(await login(formData.email, formData.password));
    } catch {
      setGate(null);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const leaveGate = () => {
    setGate(null);
    setFormData({ email: '', password: '' });
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
      {gate ? (
        <CheckinGateCard details={gate} onRetry={checkAgain} onCancel={leaveGate} />
      ) : (
      <Card title="Welcome back">
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
      </Card>
      )}
    </LoginLayout>
  );
};

export default LoginPage;
