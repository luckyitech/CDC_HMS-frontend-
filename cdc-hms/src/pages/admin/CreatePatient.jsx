import PatientForm from '../../components/shared/PatientForm';

// Admin patient registration — the form itself is shared with the staff
// portal (components/shared/PatientForm).
const CreatePatient = ({ embedded = false }) => (
  <PatientForm embedded={embedded} backPath="/admin/dashboard" />
);

export default CreatePatient;
