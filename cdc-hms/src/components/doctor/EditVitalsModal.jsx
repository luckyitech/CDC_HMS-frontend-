import { useState } from "react";
import { usePatientContext } from "../../contexts/PatientContext";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import toast from "react-hot-toast";

const FIELDS = [
  { key: "bp",                label: "Blood Pressure",     placeholder: "e.g. 120/80",  unit: " mmHg", type: "text"   },
  { key: "heartRate",         label: "Heart Rate",         placeholder: "e.g. 72",      unit: " bpm",  type: "number" },
  { key: "temperature",       label: "Temperature",        placeholder: "e.g. 36.6",    unit: "°C",    type: "number", step: "0.1" },
  { key: "oxygenSaturation",  label: "O2 Saturation",     placeholder: "e.g. 98",      unit: "%",     type: "number" },
  { key: "weight",            label: "Weight",             placeholder: "e.g. 75",      unit: " kg",   type: "number", step: "0.1" },
  { key: "height",            label: "Height",             placeholder: "e.g. 170",     unit: " cm",   type: "number", step: "0.1" },
  { key: "waistCircumference",label: "Waist Circumference",placeholder: "e.g. 85",      unit: " cm",   type: "number", step: "0.1" },
  { key: "rbs",               label: "RBS",                placeholder: "e.g. 6.5",     unit: " mmol/L", type: "number", step: "0.1" },
  { key: "hba1c",             label: "HbA1c",              placeholder: "e.g. 7.2",     unit: "%",     type: "number", step: "0.1" },
  { key: "ketones",           label: "Ketones",            placeholder: "e.g. 0.5",     unit: " mmol/L", type: "number", step: "0.1" },
];

// Strip the unit suffix from a formatted vitals value so it can be pre-filled
const stripUnit = (value, unit) => {
  if (!value) return "";
  return String(value).replace(unit, "").trim();
};

const EditVitalsModal = ({ vitals, uhid, onClose, onSaved }) => {
  const { recordVitalsDoctor } = usePatientContext();

  const [form, setForm] = useState(() => {
    const v = vitals || {};
    const initial = {};
    FIELDS.forEach(({ key, unit }) => {
      initial[key] = stripUnit(v[key], unit);
    });
    initial.chiefComplaint = v.chiefComplaint || "";
    return initial;
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    // Only send fields that have a value
    const payload = {};
    FIELDS.forEach(({ key, type }) => {
      const val = form[key];
      if (val === "" || val === null || val === undefined) return;
      payload[key] = type === "number" ? Number(val) : val;
    });
    if (form.chiefComplaint.trim()) {
      payload.chiefComplaint = form.chiefComplaint.trim();
    }

    setSaving(true);
    const result = await recordVitalsDoctor(uhid, payload);
    setSaving(false);

    if (result.success) {
      toast.success("Vitals updated successfully");
      onSaved();
      onClose();
    } else {
      toast.error(result.message || "Failed to update vitals");
    }
  };

  return (
    <Modal isOpen title="Edit Vitals" onClose={onClose} size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {FIELDS.map(({ key, label, placeholder, type, step }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <input
              type={type}
              step={step}
              placeholder={placeholder}
              value={form[key]}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Chief Complaint</label>
          <input
            type="text"
            placeholder="e.g. Routine checkup, high blood sugar"
            value={form.chiefComplaint}
            onChange={e => handleChange("chiefComplaint", e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Vitals"}
        </Button>
      </div>
    </Modal>
  );
};

export default EditVitalsModal;
