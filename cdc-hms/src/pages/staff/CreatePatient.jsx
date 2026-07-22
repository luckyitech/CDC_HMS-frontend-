import { useNavigate } from 'react-router-dom';
import PatientForm from '../../components/shared/PatientForm';

// Staff patient registration — the form itself is shared with the admin
// portal (components/shared/PatientForm). After a successful registration
// the staff member is returned to their dashboard.
const CreatePatient = () => {
  const navigate = useNavigate();

  return (
    <PatientForm
      backPath="/staff/dashboard"
      onCreated={() => setTimeout(() => navigate('/staff/dashboard'), 2000)}
    />
  );
};

export default CreatePatient;
