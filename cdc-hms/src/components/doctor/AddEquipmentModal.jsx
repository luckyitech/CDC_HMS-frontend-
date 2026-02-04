import { useState } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';

const AddEquipmentModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  deviceType, // 'pump' or 'transmitter'
  existingData = null, // For editing
  mode = 'add' // 'add', 'edit', or 'replace'
}) => {
  const [formData, setFormData] = useState({
    type: existingData?.type || 'new',
    serialNo: existingData?.serialNo || '',
    model: existingData?.model || '',
    manufacturer: existingData?.manufacturer || '',
    startDate: existingData?.startDate || new Date().toISOString().split('T')[0],
    warrantyStartDate: existingData?.warrantyStartDate || new Date().toISOString().split('T')[0],
    warrantyYears: existingData?.warrantyYears || (deviceType === 'pump' ? 4 : 1),
    reason: '' // For replacements
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const calculateWarrantyEndDate = (startDate, years) => {
    const date = new Date(startDate);
    date.setFullYear(date.getFullYear() + parseInt(years));
    return date.toISOString().split('T')[0];
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.serialNo.trim()) {
      newErrors.serialNo = 'Serial number is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.warrantyStartDate) {
      newErrors.warrantyStartDate = 'Warranty start date is required';
    }

    if (mode === 'replace' && !formData.reason.trim()) {
      newErrors.reason = 'Reason for replacement is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const warrantyEndDate = calculateWarrantyEndDate(
      formData.warrantyStartDate, 
      formData.warrantyYears
    );

    const equipmentData = {
      deviceType,
      type: formData.type,
      serialNo: formData.serialNo,
      ...(deviceType === 'pump' && {
        model: formData.model,
        manufacturer: formData.manufacturer
      }),
      startDate: formData.startDate,
      warrantyStartDate: formData.warrantyStartDate,
      warrantyEndDate: warrantyEndDate,
      warrantyYears: formData.warrantyYears
    };

    onSave(equipmentData, formData.reason);
    onClose();
  };

  const getTitle = () => {
    if (mode === 'add') return `Add ${deviceType === 'pump' ? 'Insulin Pump' : 'Transmitter'}`;
    if (mode === 'edit') return `Edit ${deviceType === 'pump' ? 'Insulin Pump' : 'Transmitter'}`;
    if (mode === 'replace') return `Replace ${deviceType === 'pump' ? 'Insulin Pump' : 'Transmitter'}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <div className="space-y-4">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Type *
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          >
            <option value="new">New Patient - New {deviceType === 'pump' ? 'Pump' : 'Transmitter'}</option>
            <option value="upgrade">Existing Patient - Upgrade</option>
            <option value="replacement">Existing Patient - Replacement</option>
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

        {/* Model & Manufacturer (Pump only) */}
        {deviceType === 'pump' && (
          <>
            <Input
              label="Model"
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="e.g., MiniMed 780G"
            />

            <Input
              label="Manufacturer"
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              placeholder="e.g., Medtronic"
            />
          </>
        )}

        {/* Start Date */}
        <Input
          label="Start Date *"
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          error={errors.startDate}
        />

        {/* Warranty Start Date */}
        <Input
          label="Warranty Start Date *"
          type="date"
          name="warrantyStartDate"
          value={formData.warrantyStartDate}
          onChange={handleChange}
          error={errors.warrantyStartDate}
        />

        {/* Warranty Duration */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Warranty Duration (Years) *
          </label>
          <select
            name="warrantyYears"
            value={formData.warrantyYears}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          >
            <option value="1">1 Year</option>
            <option value="2">2 Years</option>
            <option value="3">3 Years</option>
            <option value="4">4 Years</option>
            <option value="5">5 Years</option>
            <option value="6">6 Years</option>
            <option value="7">7 Years</option>
            <option value="8">8 Years</option>
            <option value="9">9 Years</option>
            <option value="10">10 Years</option>
            
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Warranty will expire on: {calculateWarrantyEndDate(formData.warrantyStartDate, formData.warrantyYears)}
          </p>
        </div>

        {/* Reason for Replacement (only for replace mode) */}
        {mode === 'replace' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Replacement *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g., Warranty expired, Device malfunction, Upgrade to newer model"
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
            />
            {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSubmit} className="flex-1">
            {mode === 'add' ? '✅ Add Equipment' : mode === 'edit' ? '💾 Save Changes' : '🔄 Replace Equipment'}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddEquipmentModal;