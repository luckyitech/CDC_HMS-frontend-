import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';

const RELATIONSHIP_OPTIONS = [
  'Parent', 'Spouse', 'Sibling', 'Child', 'Caregiver', 'Guardian', 'Other',
];

const emptyForm = () => ({
  firstName:    '',
  lastName:     '',
  email:        '',
  relationship: 'Parent',
  phone:        '',
});

const AddCareLinkPartnerModal = ({
  isOpen,
  onClose,
  onSave,
  existingData = null,
  mode = 'add',     // 'add' | 'edit'
}) => {
  const [formData, setFormData] = useState(emptyForm());
  const [errors,   setErrors]   = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setFormData(
      existingData
        ? {
            firstName:    existingData.firstName    || '',
            lastName:     existingData.lastName     || '',
            email:        existingData.email        || '',
            relationship: existingData.relationship || 'Parent',
            phone:        existingData.phone        || '',
          }
        : emptyForm()
    );
    setErrors({});
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim())    newErrors.firstName    = 'First name is required';
    if (!formData.lastName.trim())     newErrors.lastName     = 'Last name is required';
    if (!formData.email.trim())        newErrors.email        = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Enter a valid email address';
    if (!formData.relationship.trim()) newErrors.relationship = 'Relationship is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      firstName:    formData.firstName.trim(),
      lastName:     formData.lastName.trim(),
      email:        formData.email.trim(),
      relationship: formData.relationship,
      phone:        formData.phone.trim() || null,
    });
  };

  const selectClass = 'w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add CareLink Partner' : 'Edit CareLink Partner'}
    >
      <div className="space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name *"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="e.g., Jane"
            error={errors.firstName}
          />
          <Input
            label="Last Name *"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="e.g., Doe"
            error={errors.lastName}
          />
        </div>

        <Input
          label="Email Address *"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g., partner@email.com"
          error={errors.email}
        />

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship *</label>
          <select name="relationship" value={formData.relationship} onChange={handleChange} className={selectClass}>
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.relationship && <p className="text-red-500 text-sm mt-1">{errors.relationship}</p>}
        </div>

        <Input
          label="Phone Number"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="e.g., +27 82 000 0000 (optional)"
        />

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSubmit} className="flex-1">
            {mode === 'add' ? 'Add Partner' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>

      </div>
    </Modal>
  );
};

export default AddCareLinkPartnerModal;
