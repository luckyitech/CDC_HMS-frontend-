import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import LoginLayout from "../../layouts/LoginLayout";
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';

const LabLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useUserContext();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = login(formData.email, formData.password, 'Lab');
      
      if (result.success) {
        navigate('/lab/dashboard');
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
      <Card title="Lab Technician Login">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="lab@cdc.com"
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
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
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

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-semibold text-blue-900 mb-2">Demo Credentials:</p>
            <p className="text-blue-700">📧 sarah.mwangi@cdc.com</p>
            <p className="text-blue-700">🔑 Any password</p>
          </div>
        </form>
        
        <button
          onClick={() => navigate('/')}
          className="text-primary hover:underline mt-4 text-sm w-full text-center"
        >
          ← Back to portal selection
        </button>
      </Card>
    </LoginLayout>
  );
};

export default LabLoginPage;