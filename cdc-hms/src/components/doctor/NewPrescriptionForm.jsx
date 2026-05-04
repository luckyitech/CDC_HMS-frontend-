import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X, Pill } from "lucide-react";
import Button from "../shared/Button";
import Input from "../shared/Input";
import VoiceInput from "../shared/VoiceInput";
import MedicationSearchInput from "../shared/MedicationSearchInput";

const emptyMedication = () => ({
  name: "", dosage: "", frequency: "", customFrequency: "", duration: "", instructions: "",
});

const KNOWN_FREQUENCIES = [
  "Once daily", "Twice daily", "Three times daily",
  "Four times daily", "Every 8 hours", "Every 12 hours",
];

const NewPrescriptionForm = ({
  selectedPatient,
  fromConsultation = false,
  onSuccess,
  onCancel,
  addPrescription,
  currentDoctor,
  embedded = false,
  initialMedications = [],
  onMedicationRemoved,
}) => {
  const [formData, setFormData] = useState({
    patientUHID: selectedPatient?.uhid || "",
    patientName: selectedPatient?.name || "",
  });

  const [medications, setMedications] = useState([emptyMedication()]);

  // Sync with initialMedications when they change.
  useEffect(() => {
    if (initialMedications && initialMedications.length > 0) {
      setMedications(
        initialMedications.map((med) => {
          const freqIsKnown = KNOWN_FREQUENCIES.includes(med.frequency);
          return {
            name:            med.name        || '',
            dosage:          med.dosage      || '',
            frequency:       freqIsKnown ? med.frequency : 'Other',
            customFrequency: freqIsKnown ? '' : (med.frequency || ''),
            duration:        med.duration    || '',
            instructions:    med.instructions || '',
          };
        })
      );
    }
  }, [initialMedications]);

  const handleAddMedication = () => {
    setMedications([...medications, emptyMedication()]);
  };

  const handleRemoveMedication = (index) => {
    const removedName = medications[index]?.name;
    setMedications(medications.filter((_, i) => i !== index));
    if (removedName) {
      onMedicationRemoved?.(removedName);
      toast(`${removedName} removed from prescription`, {
        duration: 2500,
        position: "top-right",
        style: { background: "#6B7280", color: "#fff" },
      });
    }
  };

  const handleMedicationChange = (index, field, value) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  // Called when doctor picks a suggestion from the RxNorm dropdown.
  const handleMedicationSelect = (index, name, dosage) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], name, dosage: dosage || updated[index].dosage };
    setMedications(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validMedications = medications.filter((m) => {
      const freq = m.frequency === "Other" ? m.customFrequency?.trim() : m.frequency;
      return m.name.trim() && m.dosage.trim() && freq && m.duration.trim();
    });

    if (validMedications.length === 0) {
      toast.error("Please add at least one complete medication", {
        duration: 3000, position: "top-right",
        style: { background: "#EF4444", color: "#FFFFFF", fontWeight: "bold", padding: "16px" },
      });
      return;
    }

    const newPrescription = {
      patientId:       selectedPatient?.id,
      uhid:            formData.patientUHID,
      patientName:     formData.patientName,
      doctorName:      currentDoctor?.name || "Dr. Ahmed Hassan",
      doctorSpecialty: currentDoctor?.specialty || "Endocrinologist",
      medications:     validMedications.map(({ customFrequency, ...med }) => ({
        ...med,
        frequency: med.frequency === "Other" ? customFrequency.trim() : med.frequency,
        quantity:  "30",
      })),
      notes: "",
    };

    const result = await addPrescription(newPrescription);

    if (result) {
      toast.success("Prescription Created Successfully", {
        duration: 3000, position: "top-right",
        style: { background: "#10B981", color: "#FFFFFF", fontWeight: "bold", padding: "16px" },
      });

      setFormData({
        patientUHID: selectedPatient?.uhid || "",
        patientName: selectedPatient?.name || "",
      });
      setMedications([emptyMedication()]);

      if (onSuccess) onSuccess();
    } else {
      toast.error("Failed to create prescription. Please try again.", {
        duration: 3000, position: "top-right",
        style: { background: "#EF4444", color: "#FFFFFF", fontWeight: "bold", padding: "16px" },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={embedded ? "space-y-6" : "space-y-4 max-h-[70vh] overflow-y-auto"}>

      {/* Patient info */}
      {embedded ? (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <p className="text-sm font-semibold text-gray-700">Writing prescription for:</p>
          <p className="text-lg font-bold text-gray-800 mt-1">
            {selectedPatient.name} ({selectedPatient.uhid})
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Patient UHID"
            value={formData.patientUHID}
            onChange={(e) => setFormData({ ...formData, patientUHID: e.target.value })}
            placeholder="CDC001"
            required
            disabled={fromConsultation}
          />
          <Input
            label="Patient Name"
            value={formData.patientName}
            onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
            placeholder="John Doe"
            required
            disabled={fromConsultation}
          />
        </div>
      )}

      {/* Medications */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-3">Medications *</h4>

        <div className="space-y-4">
          {medications.map((med, index) => (
            <div key={index} className="p-4 border-2 border-gray-200 rounded-lg relative">

              {medications.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveMedication(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="space-y-3">

                {/* Medication name — RxNorm search */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Medication Name *
                  </label>
                  <MedicationSearchInput
                    value={med.name}
                    onChange={(val) => handleMedicationChange(index, 'name', val)}
                    onSelect={(name, dosage) => handleMedicationSelect(index, name, dosage)}
                  />
                </div>

                {/* Dosage + Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dosage *</label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)}
                      placeholder="e.g. 500 mg"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Duration *</label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => handleMedicationChange(index, "duration", e.target.value)}
                      placeholder="e.g. 30 days"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency *</label>
                  <select
                    value={med.frequency}
                    onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                  >
                    <option value="">Select frequency...</option>
                    {KNOWN_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="Other">Other (specify)</option>
                  </select>
                  {med.frequency === "Other" && (
                    <VoiceInput
                      value={med.customFrequency}
                      onChange={(e) => handleMedicationChange(index, "customFrequency", e.target.value)}
                      placeholder="Describe frequency e.g. every 6 hours..."
                      rows={1}
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Special instructions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Special Instructions</label>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) => handleMedicationChange(index, "instructions", e.target.value)}
                    placeholder="e.g. Take with food"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                  />
                </div>

              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddMedication}
          className="mt-4 w-full py-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-sm font-bold text-blue-600 flex items-center justify-center gap-2 active:bg-blue-200 hover:bg-blue-100 hover:border-blue-400 transition-colors cursor-pointer"
        >
          <Pill className="w-5 h-5" /> Add Medication
        </button>
      </div>

      {/* Actions */}
      <div className={`flex gap-3 pt-4 ${embedded ? "" : "border-t"}`}>
        <Button type="submit" className="flex-1">Create Prescription</Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        )}
      </div>

    </form>
  );
};

export default NewPrescriptionForm;
