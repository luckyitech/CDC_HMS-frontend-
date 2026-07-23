import { User } from 'lucide-react';
import Card from '../Card';
import CardTitle from '../CardTitle';
import Input from '../Input';

// Shared "Personal Information" section for user-creation forms.
// data: the form state object; onChange: (field, value) => void
const PersonalInfoSection = ({ data, onChange, emailPlaceholder = 'name@example.com' }) => (
  <Card title={<CardTitle icon={User}>Personal Information</CardTitle>} className="mb-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="First Name *"
        type="text"
        value={data.firstName}
        onChange={(e) => onChange('firstName', e.target.value)}
        placeholder="Enter first name"
        required
      />

      <Input
        label="Last Name *"
        type="text"
        value={data.lastName}
        onChange={(e) => onChange('lastName', e.target.value)}
        placeholder="Enter last name"
        required
      />

      <Input
        label="Email Address *"
        type="email"
        value={data.email}
        onChange={(e) => onChange('email', e.target.value)}
        placeholder={emailPlaceholder}
        required
      />

      <Input
        label="Phone Number *"
        type="tel"
        value={data.phone}
        onChange={(e) => onChange('phone', e.target.value)}
        placeholder="+254 712 345 678"
        required
      />

      <Input
        label="Date of Birth"
        type="date"
        value={data.dateOfBirth}
        onChange={(e) => onChange('dateOfBirth', e.target.value)}
      />

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
        <select
          value={data.gender}
          onChange={(e) => onChange('gender', e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          required
        >
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <Input
        label="ID/Passport Number *"
        type="text"
        value={data.idNumber}
        onChange={(e) => onChange('idNumber', e.target.value)}
        placeholder="ID or Passport Number"
        required
      />
    </div>
  </Card>
);

export default PersonalInfoSection;
