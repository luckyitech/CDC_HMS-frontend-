import { useState } from "react";
import { Pill, ChevronDown, ChevronUp } from "lucide-react";
import Button from "../shared/Button";

const PrescriptionHistory = ({ 
  prescriptions, 
  maxDisplay = 5, 
  showViewPrint = false,
  onView,
  onPrint,
  showAddButtons = false, // NEW: Show add buttons for continue functionality
  onAddMedication, // NEW: Callback when medication is added
  collapsible = false, // NEW: Make prescriptions collapsible
}) => {
  // State for collapsible prescriptions
  const [expandedPrescriptions, setExpandedPrescriptions] = useState(
    collapsible ? new Set() : new Set(prescriptions.map(p => p.id))
  );

  // Toggle prescription expansion
  const togglePrescription = (prescriptionId) => {
    if (!collapsible) return;
    const newExpanded = new Set(expandedPrescriptions);
    if (newExpanded.has(prescriptionId)) {
      newExpanded.delete(prescriptionId);
    } else {
      newExpanded.add(prescriptionId);
    }
    setExpandedPrescriptions(newExpanded);
  };

  const displayPrescriptions = maxDisplay ? prescriptions.slice(0, maxDisplay) : prescriptions;

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Pill className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No previous prescriptions found for this patient</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayPrescriptions.map((prescription) => {
        const isExpanded = expandedPrescriptions.has(prescription.id);
        
        return (
          <div
            key={prescription.id}
            className="border-2 border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Header - Clickable if collapsible */}
            <div
              onClick={() => collapsible && togglePrescription(prescription.id)}
              className={`p-4 ${collapsible ? 'cursor-pointer hover:bg-gray-50' : ''} transition`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">
                      {prescription.patientName}
                    </h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {prescription.uhid}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {prescription.status}
                    </span>
                    {collapsible && (
                      isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {prescription.date}
                  </p>
                  <p className="text-sm font-medium text-gray-700 mt-2">
                    <span className="font-semibold">Diagnosis:</span>{" "}
                    {prescription.diagnosis}
                  </p>
                </div>
                {showViewPrint && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="text-xs py-1 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView && onView(prescription);
                      }}
                    >
                      👁️ View
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs py-1 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrint && onPrint(prescription);
                      }}
                    >
                      🖨️ Print
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Medications - Show if expanded or not collapsible */}
            {(!collapsible || isExpanded) && (
              <div className="bg-gray-50 rounded-lg p-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">
                  Medications:
                </h4>
                <div className="space-y-2">
                  {prescription.medications.map((med, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          💊 {med.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {med.dosage} • {med.frequency}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                          {med.duration}
                        </span>
                        {showAddButtons && onAddMedication && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddMedication(med);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold transition"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PrescriptionHistory;