import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import LoginLayout from '../../layouts/LoginLayout';
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useUserContext();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // login() is now async - need await
      const result = await login(credentials.email, credentials.password, 'Admin');

      if (result.success) {
        navigate('/admin/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout>
      <Card>
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-lg">
            🔒
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Admin Portal</h2>
          <p className="text-gray-600 mt-2">System Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            value={credentials.email}
            onChange={(e) =>
              setCredentials({ ...credentials, email: e.target.value })
            }
            placeholder="admin@cdc.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={credentials.password}
            onChange={(e) =>
              setCredentials({ ...credentials, password: e.target.value })
            }
            placeholder="Enter your password"
            required
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login as Admin'}
          </Button>

          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-primary hover:underline text-sm"
            >
              Forgot password?
            </button>
          </div>

        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline text-sm"
          >
            ← Back to Portal Selection
          </button>
        </div>
      </Card>
    </LoginLayout>
  );
};

export default AdminLoginPage;