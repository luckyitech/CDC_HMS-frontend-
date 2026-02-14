import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import Button from "../shared/Button";
import Input from "../shared/Input";
import VoiceInput from "../shared/VoiceInput";

const NewPrescriptionForm = ({
  selectedPatient,
  fromConsultation = false,
  onSuccess,
  onCancel,
  addPrescription,
  currentDoctor,
  embedded = false, // New prop for embedded mode (no modal wrapper)
  initialMedications = [], // NEW: Accept pre-filled medications
  onMedicationsChange, // NEW: Callback when medications change
}) => {
  const commonMedications = [
    { name: "Metformin", defaultDosage: "500mg", type: "Oral" },
    { name: "Glimepiride", defaultDosage: "2mg", type: "Oral" },
    { name: "Insulin Glargine", defaultDosage: "10 units", type: "Injectable" },
    { name: "Insulin Aspart", defaultDosage: "5 units", type: "Injectable" },
    { name: "Atorvastatin", defaultDosage: "20mg", type: "Oral" },
    { name: "Amlodipine", defaultDosage: "5mg", type: "Oral" },
  ];

  const [formData, setFormData] = useState({
    patientUHID: selectedPatient?.uhid || "",
    patientName: selectedPatient?.name || "",
    diagnosis: "",
  });

  const [medications, setMedications] = useState([
  { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
]);

// Sync with initialMedications when they change
useEffect(() => {
  if (initialMedications && initialMedications.length > 0) {
    setMedications(initialMedications);
  }
}, [initialMedications]);

  // Notify parent when medications change
  useEffect(() => {
    if (onMedicationsChange) {
      onMedicationsChange(medications);
    }
  }, [medications, onMedicationsChange]);

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const handleRemoveMedication = (index) => {
    const newMeds = medications.filter((_, i) => i !== index);
    setMedications(newMeds);
  };

  const handleMedicationChange = (index, field, value) => {
    const newMeds = [...medications];
    newMeds[index][field] = value;

    if (field === "name") {
      const commonMed = commonMedications.find((m) => m.name === value);
      if (commonMed) {
        newMeds[index]["dosage"] = commonMed.defaultDosage;
      }
    }

    setMedications(newMeds);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate
    if (!formData.diagnosis.trim()) {
      toast.error("Please enter a diagnosis for the prescription", {
        duration: 3000,
        position: "top-right",
        icon: "❌",
        style: {
          background: "#EF4444",
          color: "#FFFFFF",
          fontWeight: "bold",
          padding: "16px",
        },
      });
      return;
    }

    const validMedications = medications.filter(
      (m) => m.name && m.dosage && m.frequency && m.duration
    );
    if (validMedications.length === 0) {
      toast.error("Please add at least one complete medication", {
        duration: 3000,
        position: "top-right",
        icon: "❌",
        style: {
          background: "#EF4444",
          color: "#FFFFFF",
          fontWeight: "bold",
          padding: "16px",
        },
      });
      return;
    }

    const newPrescription = {
      uhid: formData.patientUHID,
      patientName: formData.patientName,
      diagnosis: formData.diagnosis,
      doctorName: currentDoctor?.name || "Dr. Ahmed Hassan",
      doctorSpecialty: currentDoctor?.specialty || "Endocrinologist",
      medications: validMedications.map((med) => ({
        ...med,
        quantity: "30",
      })),
      notes: "",
    };

    addPrescription(newPrescription);

    toast.success("Prescription Created Successfully", {
      duration: 3000,
      position: "top-right",
      icon: "✅",
      style: {
        background: "#10B981",
        color: "#FFFFFF",
        fontWeight: "bold",
        padding: "16px",
      },
    });

    // Clear form
    setFormData({
      patientUHID: selectedPatient?.uhid || "",
      patientName: selectedPatient?.name || "",
      diagnosis: "",
    });
    setMedications([
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);

    if (onSuccess) onSuccess();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        embedded ? "space-y-6" : "space-y-4 max-h-[70vh] overflow-y-auto"
      }
    >
      {/* Patient Info - Show differently based on embedded mode */}
      {embedded ? (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <p className="text-sm font-semibold text-gray-700">
            Writing prescription for:
          </p>
          <p className="text-lg font-bold text-gray-800 mt-1">
            {selectedPatient.name} ({selectedPatient.uhid})
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Patient UHID"
            value={formData.patientUHID}
            onChange={(e) =>
              setFormData({ ...formData, patientUHID: e.target.value })
            }
            placeholder="CDC001"
            required
            disabled={fromConsultation}
          />
          <Input
            label="Patient Name"
            value={formData.patientName}
            onChange={(e) =>
              setFormData({ ...formData, patientName: e.target.value })
            }
            placeholder="John Doe"
            required
            disabled={fromConsultation}
          />
        </div>
      )}

      {/* Diagnosis */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Diagnosis *
        </label>
        <VoiceInput
          value={formData.diagnosis}
          onChange={(e) =>
            setFormData({ ...formData, diagnosis: e.target.value })
          }
          placeholder="Enter diagnosis for this prescription..."
          rows={2}
          required
        />
      </div>

      {/* Medications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-700">Medications *</h4>
          <button
            type="button"
            onClick={handleAddMedication}
            className="text-sm text-primary hover:underline font-semibold"
          >
            + Add Medication
          </button>
        </div>

        <div className="space-y-4">
          {medications.map((med, index) => (
            <div
              key={index}
              className="p-4 border-2 border-gray-200 rounded-lg relative"
            >
              {medications.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveMedication(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold w-6 h-6 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Medication Name
                  </label>
                  <select
                    value={med.name}
                    onChange={(e) =>
                      handleMedicationChange(index, "name", e.target.value)
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    required
                  >
                    <option value="">Select medication...</option>
                    {commonMedications.map((commonMed) => (
                      <option key={commonMed.name} value={commonMed.name}>
                        {commonMed.name} ({commonMed.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dosage
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) =>
                        handleMedicationChange(index, "dosage", e.target.value)
                      }
                      placeholder="500mg"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) =>
                        handleMedicationChange(
                          index,
                          "duration",
                          e.target.value
                        )
                      }
                      placeholder="30 days"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={med.frequency}
                    onChange={(e) =>
                      handleMedicationChange(index, "frequency", e.target.value)
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    required
                  >
                    <option value="">Select frequency...</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Before meals">Before meals</option>
                    <option value="After meals">After meals</option>
                    <option value="Bedtime">Bedtime</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) =>
                      handleMedicationChange(
                        index,
                        "instructions",
                        e.target.value
                      )
                    }
                    placeholder="Take with food"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`flex gap-3 pt-4 ${embedded ? "" : "border-t"}`}>
        <Button type="submit" className="flex-1">
          Create Prescription
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default NewPrescriptionForm;
