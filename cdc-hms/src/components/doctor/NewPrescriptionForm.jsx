import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X, Pill, Zap } from "lucide-react";
import Button from "../shared/Button";
import Input from "../shared/Input";
import VoiceInput from "../shared/VoiceInput";
import MedicationSearchInput from "../shared/MedicationSearchInput";
import prescriptionService from "../../services/prescriptionService";

const emptyMedication = () => ({
  name: "", dosage: "", quantity: "30", frequency: "", customFrequency: "", duration: "", instructions: "",
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
  loadKey = 0,
  onMedicationRemoved,
}) => {
  const [formData, setFormData] = useState({
    patientUHID: selectedPatient?.uhid || "",
    patientName: selectedPatient?.name || "",
  });

  const [medications, setMedications] = useState([emptyMedication()]);
  const [quickDrugs, setQuickDrugs]   = useState([]);

  useEffect(() => {
    prescriptionService.getTopDrugs(20)
      .then((res) => setQuickDrugs(res?.data || []))
      .catch(() => {}); // silent — Quick Add just stays empty on failure
  }, []);

  // Load medications only when loadKey increments (Renew All / + Add clicked).
  // Watching loadKey instead of initialMedications prevents the form from
  // resetting the doctor's edits when a medication is removed.
  useEffect(() => {
    if (loadKey === 0 || !initialMedications || initialMedications.length === 0) return;
    setMedications(
      initialMedications.map((med) => {
        const freqIsKnown = KNOWN_FREQUENCIES.includes(med.frequency);
        return {
          name:            med.name         || "",
          dosage:          med.dosage        || "",
          quantity:        med.quantity      || "30",
          frequency:       freqIsKnown ? med.frequency : "Other",
          customFrequency: freqIsKnown ? "" : (med.frequency || ""),
          duration:        med.duration      || "",
          instructions:    med.instructions  || "",
        };
      })
    );
  }, [loadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMedicationChange = (index, field, value) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleMedicationSelect = (index, name, dosage) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], name, dosage: dosage || updated[index].dosage };
    setMedications(updated);
  };

  const handleRemoveMedication = (index) => {
    const removedName = medications[index]?.name;
    setMedications(medications.filter((_, i) => i !== index));
    if (removedName) {
      onMedicationRemoved?.(removedName);
      toast(`${removedName} removed`, { duration: 2000, style: { background: "#6B7280", color: "#fff" } });
    }
  };

  // Quick-select a drug: fill the last empty row or add a new pre-filled row
  const handleQuickDrug = (drugName) => {
    const last = medications[medications.length - 1];
    if (!last.name.trim()) {
      handleMedicationChange(medications.length - 1, "name", drugName);
    } else {
      setMedications(prev => [...prev, { ...emptyMedication(), name: drugName }]);
    }
    toast.success(`${drugName} added to prescription`, { duration: 2000 });
  };

  // Auto-advance: when duration field loses focus and the row is complete,
  // automatically add the next empty row so the doctor never has to click "Add"
  const handleDurationBlur = (index) => {
    const med = medications[index];
    const freq = med.frequency === "Other" ? med.customFrequency?.trim() : med.frequency;
    const isComplete = med.name.trim() && med.dosage.trim() && freq && med.duration.trim();
    const isLastRow  = index === medications.length - 1;
    if (isComplete && isLastRow) {
      setMedications(prev => [...prev, emptyMedication()]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validMedications = medications.filter((m) => {
      const freq = m.frequency === "Other" ? m.customFrequency?.trim() : m.frequency;
      return m.name.trim() && m.dosage.trim() && freq && m.duration.trim();
    });

    if (validMedications.length === 0) {
      toast.error("Please add at least one complete medication");
      return;
    }

    const newPrescription = {
      patientId:       selectedPatient?.id,
      uhid:            formData.patientUHID,
      patientName:     formData.patientName,
      doctorName:      currentDoctor?.name     || "Dr. Ahmed Hassan",
      doctorSpecialty: currentDoctor?.specialty || "Endocrinologist",
      medications:     validMedications.map(({ customFrequency, ...med }) => ({
        ...med,
        frequency: med.frequency === "Other" ? customFrequency.trim() : med.frequency,
        quantity:  med.quantity || "30",
      })),
    };

    const result = await addPrescription(newPrescription);

    if (result) {
      toast.success("Prescription created successfully");
      setMedications([emptyMedication()]);
      if (onSuccess) onSuccess();
    } else {
      toast.error("Failed to create prescription. Please try again.");
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary";

  return (
    <form onSubmit={handleSubmit} className={embedded ? "space-y-5" : "space-y-4 max-h-[70vh] overflow-y-auto"}>

      {/* Patient UHID/Name — only shown outside consultation */}
      {!embedded && (
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
        <h4 className="font-semibold text-gray-700 mb-3">
          Medications <span className="text-red-400">*</span>
        </h4>

        {/* Quick-select drug chips */}
        <div className="mb-4 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
            <Zap className="w-3.5 h-3.5" /> Most Frequently Prescribed
            <span className="font-normal normal-case text-blue-400">— tap to add</span>
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-[108px] overflow-y-auto">
            {quickDrugs.length === 0 ? (
              <span className="text-xs text-blue-400 italic">Loading...</span>
            ) : quickDrugs.map(drug => (
              <button
                key={drug}
                type="button"
                onClick={() => handleQuickDrug(drug)}
                className="px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
              >
                {drug}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {medications.map((med, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Medication {index + 1}
                </span>
                {medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(index)}
                    className="text-red-400 hover:text-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3">

                {/* Medication name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Medication Name <span className="text-red-400">*</span>
                  </label>
                  <MedicationSearchInput
                    value={med.name}
                    onChange={(val) => handleMedicationChange(index, "name", val)}
                    onSelect={(name, dosage) => handleMedicationSelect(index, name, dosage)}
                  />
                </div>

                {/* Dosage + Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Dosage <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)}
                      placeholder="e.g. 500 mg"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={med.quantity}
                      onChange={(e) => handleMedicationChange(index, "quantity", e.target.value)}
                      placeholder="30"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Frequency + Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Frequency <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={med.frequency}
                      onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select...</option>
                      {KNOWN_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                      <option value="Other">Other (specify)</option>
                    </select>
                    {med.frequency === "Other" && (
                      <VoiceInput
                        value={med.customFrequency}
                        onChange={(e) => handleMedicationChange(index, "customFrequency", e.target.value)}
                        placeholder="e.g. every 6 hours..."
                        rows={1}
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Duration <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => handleMedicationChange(index, "duration", e.target.value)}
                      onBlur={() => handleDurationBlur(index)}
                      placeholder="e.g. 30 days"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Special Instructions</label>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) => handleMedicationChange(index, "instructions", e.target.value)}
                    placeholder="e.g. Take with food"
                    className={inputCls}
                  />
                </div>

              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMedications(prev => [...prev, emptyMedication()])}
          className="mt-3 w-full py-2.5 border border-dashed border-blue-300 rounded-lg text-sm font-semibold text-blue-600 flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
        >
          <Pill className="w-4 h-4" /> Add Another Medication
        </button>
      </div>

      {/* Actions */}
      <div className={`flex gap-3 ${embedded ? "" : "pt-4 border-t"}`}>
        <Button type="submit" className="flex-1">Create Prescription</Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        )}
      </div>

    </form>
  );
};

export default NewPrescriptionForm;
