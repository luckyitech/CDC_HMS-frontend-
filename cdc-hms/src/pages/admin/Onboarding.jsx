import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IdCard, UserPlus } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import PatientForm from '../../components/shared/PatientForm';
import StaffWizard from '../../components/admin/onboarding/StaffWizard';
import { useUserContext } from '../../contexts/UserContext';

// Onboard someone — one entry point for both kinds of person the clinic adds.
//
// Staff: the three-step wizard (Identity → Role and position → Access).
// Patient: the existing shared registration form, hosted unchanged — no new
// backend, no change to how a patient is registered.
//
// Reached from the Admin portal (/admin/onboard, replacing Create Users) and
// from the HR Suite's Staff directory (/hr/onboard); the path decides where
// Cancel and "done" navigate, the same way StaffFile's back-nav is path-aware.
// Design + decisions: claude/onboarding-wizard-build-spec.md.

const FLOWS = [
  { key: 'staff',   label: 'New staff member', hint: 'Doctor, nurse, lab technician or front-desk / support staff', Icon: IdCard },
  { key: 'patient', label: 'New patient',      hint: 'Opens the patient registration form',                       Icon: UserPlus },
];

const Onboarding = () => {
  const { currentUser } = useUserContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fromHr = pathname.startsWith('/hr');
  const backPath = fromHr ? '/hr/staff' : '/admin/dashboard';

  const [flow, setFlow] = useState('staff');

  return (
    <div>
      <PageHeader title="Onboard someone" subtitle="Add a member of staff or register a patient." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {FLOWS.map(({ key, label, hint, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFlow(key)}
            className={`text-left p-4 rounded-xl border-2 transition-colors ${flow === key ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
          >
            <Icon className={`w-5 h-5 mb-2 ${flow === key ? 'text-primary' : 'text-gray-400'}`} />
            <p className="font-semibold text-gray-800">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
          </button>
        ))}
      </div>

      {flow === 'staff' ? (
        <StaffWizard
          key="staff"
          currentUser={currentUser}
          backPath={backPath}
          onCreated={(user) => { if (fromHr && user?.employeeId) navigate(`/hr/staff/${user.employeeId}`); }}
        />
      ) : (
        <PatientForm key="patient" embedded backPath={backPath} />
      )}
    </div>
  );
};

export default Onboarding;
