// OrderLabTestModal.jsx - Modal for doctors to order lab tests

import { useState } from "react";
import Button from "../shared/Button";
import { useLabContext } from "../../contexts/LabContext";
import { useUserContext } from "../../contexts/UserContext";
import VoiceInput from "../shared/VoiceInput";

const OrderLabTestModal = ({ patient, onClose, onSuccess }) => {
  const { addPendingTest } = useLabContext();
  const { currentUser } = useUserContext();
  
  const [selectedTest, setSelectedTest] = useState("");
  const [priority, setPriority] = useState("Routine");
  const [notes, setNotes] = useState("");

  // Available test types
  const testTypes = [
    { value: "HbA1c", label: "HbA1c", sample: "Blood" },
    { value: "Fasting Glucose", label: "Fasting Glucose", sample: "Blood" },
    { value: "Random Glucose", label: "Random Glucose", sample: "Blood" },
    { value: "Lipid Profile", label: "Lipid Profile (Total, LDL, HDL, Triglycerides)", sample: "Blood" },
    { value: "Kidney Function", label: "Kidney Function (Creatinine, BUN, eGFR)", sample: "Blood" },
    { value: "Liver Function", label: "Liver Function (ALT, AST, ALP, Bilirubin)", sample: "Blood" },
    { value: "Thyroid Function", label: "Thyroid Function (TSH, T3, T4)", sample: "Blood" },
    { value: "Urine Analysis", label: "Urine Analysis", sample: "Urine" },
  ];

  // const searchTestType = testTypes.filter((type)=>{
  //   return 
  // })

  const handleSubmit = () => {
    if (!selectedTest) {
      alert("Please select a test type");
      return;
    }

    const selectedTestData = testTypes.find(t => t.value === selectedTest);

    // Create pending test order
    const testOrder = {
      uhid: patient.uhid,
      patientName: patient.name,
      age: patient.age,
      gender: patient.gender,
      testType: selectedTest,
      sampleType: selectedTestData.sample,
      orderedBy: currentUser?.name || "Dr. Ahmed Hassan",
      priority: priority,
      notes: notes || "",
    };

    // Add to pending tests
    addPendingTest(testOrder);

    // Show success notification
    const successDiv = document.createElement("div");
    successDiv.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce";
    successDiv.innerHTML = `
      <p class="font-bold">✅ Lab Test Ordered Successfully!</p>
      <p class="text-sm mt-1">Patient: ${patient.name}</p>
      <p class="text-sm">Test: ${selectedTest}</p>
      <p class="text-sm">Priority: ${priority}</p>
    `;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 4000);

    // Call success callback
    if (onSuccess) onSuccess();

    // Close modal
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Order Laboratory Test</h2>
              <p className="text-sm text-gray-600 mt-1">
                Request lab tests for {patient.name} ({patient.uhid})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Patient Info Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-800 mb-2">👤 Patient Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-bold text-gray-800">{patient.name}</p>
              </div>
              <div>
                <p className="text-gray-600">UHID</p>
                <p className="font-bold text-primary">{patient.uhid}</p>
              </div>
              <div>
                <p className="text-gray-600">Age</p>
                <p className="font-bold text-gray-800">{patient.age} years</p>
              </div>
              <div>
                <p className="text-gray-600">Gender</p>
                <p className="font-bold text-gray-800">{patient.gender}</p>
              </div>
            </div>
          </div>

          {/* Select Test Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Select Test Type <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-300 rounded-lg p-3">
              {testTypes.map((test) => (
                <label
                  key={test.value}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition border-2 ${
                    selectedTest === test.value
                      ? "bg-blue-50 border-primary"
                      : "bg-white border-gray-200 hover:border-primary"
                  }`}
                >
                  <input
                    type="radio"
                    name="testType"
                    value={test.value}
                    checked={selectedTest === test.value}
                    onChange={(e) => setSelectedTest(e.target.value)}
                    className="mt-1 w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{test.label}</p>
                    <p className="text-xs text-gray-600">Sample: {test.sample}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPriority("Routine")}
                className={`p-4 rounded-lg border-2 transition ${
                  priority === "Routine"
                    ? "bg-gray-100 border-gray-500"
                    : "bg-white border-gray-300 hover:border-gray-500"
                }`}
              >
                <p className="font-bold text-gray-800">⚪ Routine</p>
                <p className="text-xs text-gray-600 mt-1">Standard turnaround (24-48 hours)</p>
              </button>
              <button
                type="button"
                onClick={() => setPriority("Urgent")}
                className={`p-4 rounded-lg border-2 transition ${
                  priority === "Urgent"
                    ? "bg-red-50 border-red-500"
                    : "bg-white border-gray-300 hover:border-red-500"
                }`}
              >
                <p className="font-bold text-red-700">🔴 Urgent</p>
                <p className="text-xs text-gray-600 mt-1">Priority processing (same day)</p>
              </button>
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Clinical Notes (Optional)
            </label>
            {/* <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant clinical information, symptoms, or special instructions for the lab..."
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            /> */}
            <VoiceInput
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant clinical information, symptoms, or special instructions for the lab..."
              rows={4}
              // className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: Patient reports dizziness, check for hypoglycemia
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              ✓ Order Test
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderLabTestModal;