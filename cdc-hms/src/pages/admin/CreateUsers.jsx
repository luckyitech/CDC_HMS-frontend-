import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { HeartPulse, Users, TestTube, UserPlus, BedDouble } from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import CreateDoctor from './CreateDoctor';
import CreateStaff from './CreateStaff';
import CreateNurse from './CreateNurse';
import CreateLabTech from './CreateLabTech';
import CreatePatient from './CreatePatient';

// One entry per user type — add a new role here and it appears in the
// switcher automatically. Each Form is the existing standalone create form.
const ROLES = [
  { key: 'doctor',  label: 'Doctor',   icon: <HeartPulse className="w-4 h-4" />, Form: CreateDoctor },
  { key: 'staff',   label: 'Staff',    icon: <Users className="w-4 h-4" />,      Form: CreateStaff },
  { key: 'nurse',   label: 'Nurse',    icon: <BedDouble className="w-4 h-4" />,  Form: CreateNurse },
  { key: 'lab',     label: 'Lab Tech', icon: <TestTube className="w-4 h-4" />,   Form: CreateLabTech },
  { key: 'patient', label: 'Patient',  icon: <UserPlus className="w-4 h-4" />,   Form: CreatePatient },
];

// Shown if a form crashes — keeps the rest of the page usable
const FormError = ({ resetErrorBoundary }) => (
  <Card>
    <div className="text-center py-10">
      <p className="text-gray-800 font-semibold mb-1">Something went wrong loading this form.</p>
      <p className="text-sm text-gray-500 mb-4">You can retry, or switch to another user type above.</p>
      <Button variant="outline" onClick={resetErrorBoundary}>Try again</Button>
    </div>
  </Card>
);

const CreateUsers = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role comes from ?role= so tabs are deep-linkable (old routes redirect
  // here). Unknown or missing values fall back to the first tab.
  const activeRole = ROLES.find((r) => r.key === searchParams.get('role')) || ROLES[0];
  const ActiveForm = activeRole.Form;

  const switchRole = (key) => setSearchParams({ role: key }, { replace: true });

  return (
    <div>
      <PageHeader
        title="Create Users"
        actions={
          <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
            ← Back to Dashboard
          </Button>
        }
      />

      {/* Role switcher — same pattern as the doctor dashboard queue tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
        {ROLES.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => switchRole(role.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeRole.key === role.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {role.icon}
            {role.label}
          </button>
        ))}
      </div>

      {/* key remounts the form on switch so state never leaks between roles */}
      <ErrorBoundary FallbackComponent={FormError} resetKeys={[activeRole.key]}>
        <ActiveForm key={activeRole.key} embedded />
      </ErrorBoundary>
    </div>
  );
};

export default CreateUsers;
