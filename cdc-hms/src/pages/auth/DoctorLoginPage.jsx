import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import LoginLayout from "../../layouts/LoginLayout";
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';

const DoctorLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useUserContext();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // login() is now async - need await
      const result = await login(formData.email, formData.password, 'Doctor');

      if (result.success) {
        navigate('/doctor/dashboard');
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
      <Card title="Doctor Login">
        <form onSubmit={handleSubmit} className="space-y-8">
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
            placeholder="doctor@cdc.com"
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

        </form>
        
        <button
          onClick={() => navigate('/')}
          className="text-primary hover:underline mt-4 text-xl w-full text-center"
        >
          ← Back to portal selection
        </button>
      </Card>
    </LoginLayout>
  );
};

export default DoctorLoginPage;