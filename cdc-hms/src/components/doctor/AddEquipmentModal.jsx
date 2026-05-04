import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';

// ── Warranty year options ─────────────────────────────────────────────────────
const WARRANTY_YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// ── Type options per mode ─────────────────────────────────────────────────────
const TYPE_OPTIONS = {
  add: [
    { value: 'new',       label: 'New Patient Device' },
    { value: 'pre-owned', label: 'Pre-owned Device' },
  ],
  replace: [
    { value: 'replacement', label: 'Replacement' },
    { value: 'upgrade',     label: 'Upgrade' },
  ],
  edit: [
    { value: 'new',         label: 'New Patient Device' },
    { value: 'pre-owned',   label: 'Pre-owned Device' },
    { value: 'replacement', label: 'Replacement' },
    { value: 'upgrade',     label: 'Upgrade' },
  ],
};

const defaultType = (mode, existingType) => {
  if (mode === 'replace') return 'replacement';
  if (mode === 'edit')    return existingType || 'new';
  return 'new';
};

// ── CareLink fields config (pump only) ───────────────────────────────────────
// To add a new CareLink field: add one entry here — no other changes needed.
const CARELINK_FIELDS = [
  { name: 'careLinkCountry',  label: 'CareLink Country',  type: 'text',     placeholder: 'e.g., South Africa' },
  { name: 'careLinkEmail',    label: 'CareLink Email',    type: 'email',    placeholder: 'e.g., patient@email.com' },
  { name: 'careLinkPassword', label: 'CareLink Password', type: 'password', placeholder: 'CareLink account password' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const deriveWarrantyYears = (warrantyStartDate, warrantyEndDate, deviceType) => {
  if (warrantyStartDate && warrantyEndDate) {
    const years = new Date(warrantyEndDate).getFullYear() - new Date(warrantyStartDate).getFullYear();
    if (years >= 1 && years <= 10) return years;
  }
  return deviceType === 'pump' ? 4 : 1;
};

const calculateWarrantyEndDate = (startDate, years) => {
  const date = new Date(startDate);
  date.setFullYear(date.getFullYear() + parseInt(years));
  return date.toISOString().split('T')[0];
};

const MODAL_TITLES = {
  add:     (deviceType) => `Add ${deviceType === 'pump' ? 'Insulin Pump' : 'Transmitter'}`,
  edit:    (deviceType) => `Edit ${deviceType === 'pump' ? 'Insulin Pump' : 'Transmitter'}`,
  replace: (deviceType) => `Replace ${deviceType === 'pump' ? 'Insulin Pump' : 'Transmitter'}`,
};

// ── Component ─────────────────────────────────────────────────────────────────
const AddEquipmentModal = ({
  isOpen,
  onClose,
  onSave,
  deviceType,       // 'pump' | 'transmitter'
  existingData = null,
  mode = 'add',     // 'add' | 'edit' | 'replace'
}) => {
  const [formData, setFormData] = useState({
    type:              defaultType(mode, existingData?.type),
    serialNo:          existingData?.serialNo          || '',
    model:             existingData?.model             || '',
    manufacturer:      existingData?.manufacturer      || '',
    startDate:         existingData?.startDate         ? existingData.startDate.slice(0, 10)         : new Date().toISOString().split('T')[0],
    warrantyStartDate: existingData?.warrantyStartDate ? existingData.warrantyStartDate.slice(0, 10) : new Date().toISOString().split('T')[0],
    warrantyYears:     deriveWarrantyYears(existingData?.warrantyStartDate, existingData?.warrantyEndDate, deviceType),
    careLinkCountry:   existingData?.careLinkCountry   || '',
    careLinkEmail:     existingData?.careLinkEmail     || '',
    careLinkPassword:  existingData?.careLinkPassword  || '',
    reason:            '',
  });

  const [errors, setErrors]                     = useState({});
  const [showCareLinkPassword, setShowCareLink] = useState(false);

  // Re-populate form with current values every time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      type:              defaultType(mode, existingData?.type),
      serialNo:          existingData?.serialNo          || '',
      model:             existingData?.model             || '',
      manufacturer:      existingData?.manufacturer      || '',
      startDate:         existingData?.startDate         ? existingData.startDate.slice(0, 10)         : new Date().toISOString().split('T')[0],
      warrantyStartDate: existingData?.warrantyStartDate ? existingData.warrantyStartDate.slice(0, 10) : new Date().toISOString().split('T')[0],
      warrantyYears:     deriveWarrantyYears(existingData?.warrantyStartDate, existingData?.warrantyEndDate, deviceType),
      careLinkCountry:   existingData?.careLinkCountry   || '',
      careLinkEmail:     existingData?.careLinkEmail     || '',
      careLinkPassword:  existingData?.careLinkPassword  || '',
      reason:            '',
    });
    setErrors({});
    setShowCareLink(false);
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.serialNo.trim())        newErrors.serialNo        = 'Serial number is required';
    if (!formData.startDate)              newErrors.startDate        = 'Start date is required';
    if (!formData.warrantyStartDate)      newErrors.warrantyStartDate = 'Warranty start date is required';
    if (mode === 'replace' && !formData.reason.trim()) newErrors.reason = 'Reason for replacement is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const warrantyEndDate = calculateWarrantyEndDate(formData.warrantyStartDate, formData.warrantyYears);

    const equipmentData = {
      deviceType,
      type:             formData.type,
      serialNo:         formData.serialNo,
      startDate:        formData.startDate,
      warrantyStartDate: formData.warrantyStartDate,
      warrantyEndDate,
      ...(deviceType === 'pump' && {
        model:            formData.model,
        manufacturer:     formData.manufacturer,
        careLinkCountry:  formData.careLinkCountry  || null,
        careLinkEmail:    formData.careLinkEmail    || null,
        careLinkPassword: formData.careLinkPassword || null,
      }),
    };

    onSave(equipmentData, formData.reason);
  };

  const selectClass = 'w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={MODAL_TITLES[mode]?.(deviceType)}>
      <div className="space-y-4">

        {/* Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
          <select name="type" value={formData.type} onChange={handleChange} className={selectClass}>
            {(TYPE_OPTIONS[mode] ?? TYPE_OPTIONS.edit).map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Serial Number */}
        <Input
          label="Serial Number *"
          type="text"
          name="serialNo"
          value={formData.serialNo}
          onChange={handleChange}
          placeholder={`e.g., ${deviceType === 'pump' ? 'INS-2024-001' : 'TRX-2024-001'}`}
          error={errors.serialNo}
        />

        {/* Pump-only device fields */}
        {deviceType === 'pump' && (
          <>
            <Input label="Model"        type="text" name="model"        value={formData.model}        onChange={handleChange} placeholder="e.g., MiniMed 780G" />
            <Input label="Manufacturer" type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} placeholder="e.g., Medtronic" />
          </>
        )}

        {/* Start Date */}
        <Input label="Start Date *" type="date" name="startDate" value={formData.startDate} onChange={handleChange} error={errors.startDate} />

        {/* Warranty Start Date */}
        <Input label="Warranty Start Date *" type="date" name="warrantyStartDate" value={formData.warrantyStartDate} onChange={handleChange} error={errors.warrantyStartDate} />

        {/* Warranty Duration */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Warranty Duration (Years) *</label>
          <select name="warrantyYears" value={formData.warrantyYears} onChange={handleChange} className={selectClass}>
            {WARRANTY_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y} {y === 1 ? 'Year' : 'Years'}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Warranty will expire on: {calculateWarrantyEndDate(formData.warrantyStartDate, formData.warrantyYears)}
          </p>
        </div>

        {/* CareLink section — pump only */}
        {deviceType === 'pump' && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <p className="text-sm font-bold text-gray-700">CareLink Account</p>
            {CARELINK_FIELDS.map((field) => {
              const isPassword = field.type === 'password';
              return (
                <div key={field.name} className="relative">
                  <Input
                    label={field.label}
                    type={isPassword && !showCareLinkPassword ? 'password' : 'text'}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowCareLink((v) => !v)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showCareLinkPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Replacement reason */}
        {mode === 'replace' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Replacement *</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g., Warranty expired, Device malfunction, Upgrade to newer model"
              rows="3"
              className={selectClass}
            />
            {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSubmit} className="flex-1">
            {mode === 'add' ? '✅ Add Equipment' : mode === 'edit' ? '💾 Save Changes' : '🔄 Replace Equipment'}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>

      </div>
    </Modal>
  );
};

export default AddEquipmentModal;
