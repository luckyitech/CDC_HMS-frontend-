import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X, Pill, Zap, ChevronDown, ChevronUp } from "lucide-react";
import Button from "../shared/Button";
import Input from "../shared/Input";
import VoiceInput from "../shared/VoiceInput";
import MedicationSearchInput from "../shared/MedicationSearchInput";
import prescriptionService from "../../services/prescriptionService";

// Stable id per medication row so collapse state survives removals/reorders
let medIdCounter = 1;

const emptyMedication = () => ({
  _id: `med-${medIdCounter++}`,
  name: "", dosage: "", quantity: "30", frequency: "", customFrequency: "", duration: "", instructions: "",
});

const KNOWN_FREQUENCIES = [
  "Once daily", "Twice daily", "Three times daily",
  "Four times daily", "Every 8 hours", "Every 12 hours",
];

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary";

// Column template shared by the header row and every medication row (lg+, horizontal mode).
// Last column holds the remove button.
const HORIZONTAL_GRID = "lg:grid-cols-[2fr_1fr_1.3fr_1fr_1.5fr_2rem]";

// Per-field label. In horizontal mode the lg+ layout shows a single header row
// instead, so the label only renders on small screens.
const FieldLabel = ({ horizontal, required, children }) => (
  <label className={`block text-sm font-semibold text-gray-700 mb-1 ${horizontal ? "lg:hidden" : ""}`}>
    {children} {required && <span className="text-red-400">*</span>}
  </label>
);

const AddMedicationButton = ({ onClick, className = "" }) => (
  <Button type="button" onClick={onClick} className={className}>
    <Pill className="w-4 h-4" /> Add Another Medication
  </Button>
);

const RemoveMedicationButton = ({ onClick }) => (
  <button type="button" onClick={onClick} className="text-red-400 hover:text-red-600 transition">
    <X className="w-4 h-4" />
  </button>
);

const NewPrescriptionForm = ({
  selectedPatient,
  fromConsultation = false,
  onSuccess,
  onCancel,
  addPrescription,
  currentDoctor,
  embedded = false,
  // Wide table-style layout: one line per medication on lg+ screens,
  // actions side by side below. Falls back to stacked cards on small screens.
  horizontal = false,
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
  // Collapsed medication rows (by _id) — stacked layout only; horizontal rows
  // are already one line so they never collapse
  const [collapsedIds, setCollapsedIds] = useState(new Set());

  const toggleCollapsed = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Collapse every existing row (used when a new row is added below them)
  const collapseAll = (meds) => {
    if (horizontal) return;
    setCollapsedIds(new Set(meds.map((m) => m._id)));
  };

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
    const loaded = initialMedications.map((med) => {
      const freqIsKnown = KNOWN_FREQUENCIES.includes(med.frequency);
      return {
        _id:             `med-${medIdCounter++}`,
        name:            med.name         || "",
        dosage:          med.dosage        || "",
        quantity:        med.quantity      || "30",
        frequency:       freqIsKnown ? med.frequency : "Other",
        customFrequency: freqIsKnown ? "" : (med.frequency || ""),
        duration:        med.duration      || "",
        instructions:    med.instructions  || "",
      };
    });
    setMedications(loaded);
    // Loaded medications are complete — show them as compact summaries
    collapseAll(loaded);
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

  // Add a new row and fold all existing rows into summaries (stacked layout)
  const handleAddMedication = (prefill = {}) => {
    collapseAll(medications);
    setMedications([...medications, { ...emptyMedication(), ...prefill }]);
  };

  // Quick-select a drug: fill the last empty row or add a new pre-filled row
  const handleQuickDrug = (drugName) => {
    const last = medications[medications.length - 1];
    if (!last.name.trim()) {
      handleMedicationChange(medications.length - 1, "name", drugName);
    } else {
      handleAddMedication({ name: drugName });
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
      handleAddMedication();
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
      medications:     validMedications.map(({ customFrequency, ...med }) => {
        const payload = {
          ...med,
          frequency: med.frequency === "Other" ? customFrequency.trim() : med.frequency,
          quantity:  med.quantity || "30",
        };
        delete payload._id; // internal row id — not part of the API payload
        return payload;
      }),
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

  // All six input fields, defined once and reused by both layouts.
  // The surrounding grid decides how they flow (stacked pairs vs one line).
  const renderMedicationFields = (med, index) => (
    <>
      <div className={horizontal ? "" : "sm:col-span-2"}>
        <FieldLabel horizontal={horizontal} required>Medication Name</FieldLabel>
        <MedicationSearchInput
          value={med.name}
          onChange={(val) => handleMedicationChange(index, "name", val)}
          onSelect={(name, dosage) => handleMedicationSelect(index, name, dosage)}
        />
      </div>

      <div>
        <FieldLabel horizontal={horizontal} required>Dosage</FieldLabel>
        <input
          type="text"
          value={med.dosage}
          onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)}
          placeholder="e.g. 500 mg"
          className={inputCls}
        />
      </div>

      <div>
        <FieldLabel horizontal={horizontal} required>Frequency</FieldLabel>
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
        <FieldLabel horizontal={horizontal} required>Duration</FieldLabel>
        <input
          type="text"
          value={med.duration}
          onChange={(e) => handleMedicationChange(index, "duration", e.target.value)}
          onBlur={() => handleDurationBlur(index)}
          placeholder="e.g. 30 days"
          className={inputCls}
        />
      </div>

      <div>
        <FieldLabel horizontal={horizontal}>Special Instructions</FieldLabel>
        <input
          type="text"
          value={med.instructions}
          onChange={(e) => handleMedicationChange(index, "instructions", e.target.value)}
          placeholder="e.g. Take with food"
          className={inputCls}
        />
      </div>
    </>
  );

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

        {/* Column headers — horizontal layout, lg+ only */}
        {horizontal && (
          <div className={`hidden lg:grid ${HORIZONTAL_GRID} lg:gap-2 px-4 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide`}>
            <span>Medication *</span>
            <span>Dosage *</span>
            <span>Frequency *</span>
            <span>Duration *</span>
            <span>Instructions</span>
            <span />
          </div>
        )}

        <div className={horizontal ? "space-y-2" : "space-y-4"}>
          {medications.map((med, index) => {
            const isCollapsed = !horizontal && collapsedIds.has(med._id);
            const freqLabel = med.frequency === "Other" ? med.customFrequency : med.frequency;
            const summaryParts = [med.dosage, freqLabel, med.duration].filter((p) => p && p.trim());

            // Collapsed (stacked layout): one-line summary bar — click to expand and view/edit
            if (isCollapsed) {
              return (
                <div
                  key={med._id}
                  className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 hover:border-blue-300 cursor-pointer transition"
                  onClick={() => toggleCollapsed(med._id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-gray-800 truncate">
                      {med.name.trim() || <span className="italic text-gray-400 font-normal">Empty medication</span>}
                    </span>
                    {summaryParts.length > 0 && (
                      <span className="text-sm text-gray-500 truncate hidden sm:inline">
                        {summaryParts.join(" · ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {medications.length > 1 && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <RemoveMedicationButton onClick={() => handleRemoveMedication(index)} />
                      </span>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              );
            }

            return (
              <div key={med._id} className={`border border-gray-200 rounded-lg bg-gray-50 ${horizontal ? "p-4 lg:py-3" : "p-4"}`}>

                {/* Row header — stacked layout only; horizontal rows stay one line */}
                {!horizontal && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Medication {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {medications.length > 1 && (
                        <RemoveMedicationButton onClick={() => handleRemoveMedication(index)} />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(med._id)}
                        title="Collapse"
                        className="text-gray-400 hover:text-gray-600 transition"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${horizontal ? `lg:gap-2 ${HORIZONTAL_GRID} lg:items-start` : ""}`}>
                  {renderMedicationFields(med, index)}
                  {horizontal && (
                    <div className="sm:col-span-2 lg:col-span-1 flex justify-end lg:justify-center lg:pt-2.5">
                      {medications.length > 1 && (
                        <RemoveMedicationButton onClick={() => handleRemoveMedication(index)} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!horizontal && (
          <AddMedicationButton onClick={() => handleAddMedication()} className="mt-3 w-full" />
        )}
      </div>

      {/* Actions — horizontal layout puts Add + Create side by side */}
      <div className={`flex flex-col sm:flex-row gap-3 ${embedded ? "" : "pt-4 border-t"}`}>
        {horizontal && (
          <AddMedicationButton onClick={() => handleAddMedication()} className="flex-1" />
        )}
        <Button type="submit" className="flex-1">Create Prescription</Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        )}
      </div>

    </form>
  );
};

export default NewPrescriptionForm;
