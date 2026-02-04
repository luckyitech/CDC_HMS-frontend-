import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginLayout from '../../layouts/LoginLayout';
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import { Mail } from 'lucide-react';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setSubmitted(true);
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
            {/* <p className="text-gray-600 mb-2">
              If <span className="font-semibold text-gray-800">{email}</span> is registered in our system, you will receive a password reset link shortly.
            </p> */}
            <p className="text-gray-500 text-sm mb-8">
              Please check your inbox and spam folder.
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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            required
          />

          <Button type="submit" className="w-full">
            Send Reset Link
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

export default ForgotPasswordPage;
