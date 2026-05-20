import { useUserContext } from '../../contexts/UserContext';

const DoctorSelector = ({ value, onChange, className = '' }) => {
  const { getDoctors } = useUserContext();
  const doctors = getDoctors();

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary ${className}`}
    >
      <option value="">Select doctor</option>
      {doctors.map(d => (
        <option key={d.id} value={d.id}>
          {d.name}
          {d.specialty ? ` — ${d.specialty}` : ''}
        </option>
      ))}
    </select>
  );
};

export default DoctorSelector;
