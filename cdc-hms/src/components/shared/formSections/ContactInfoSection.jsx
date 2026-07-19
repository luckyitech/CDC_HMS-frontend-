import { MapPin } from 'lucide-react';
import Card from '../Card';
import CardTitle from '../CardTitle';
import Input from '../Input';

// Shared "Contact Information" section for user-creation forms.
// data: the form state object; onChange: (field, value) => void
const ContactInfoSection = ({ data, onChange }) => (
  <Card title={<CardTitle icon={MapPin}>Contact Information</CardTitle>} className="mb-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Address</label>
        <textarea
          value={data.address}
          onChange={(e) => onChange('address', e.target.value)}
          placeholder="Full address"
          rows="2"
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
        />
      </div>

      <Input
        label="City"
        type="text"
        value={data.city}
        onChange={(e) => onChange('city', e.target.value)}
        placeholder="City"
      />

      <Input
        label="Emergency Contact Name"
        type="text"
        value={data.emergencyContact}
        onChange={(e) => onChange('emergencyContact', e.target.value)}
        placeholder="Emergency contact person"
      />

      <Input
        label="Emergency Contact Phone"
        type="tel"
        value={data.emergencyPhone}
        onChange={(e) => onChange('emergencyPhone', e.target.value)}
        placeholder="+254 712 345 678"
      />
    </div>
  </Card>
);

export default ContactInfoSection;
