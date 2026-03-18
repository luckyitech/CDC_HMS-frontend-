import { useState } from "react";
import { Pill, ChevronDown, ChevronUp, CheckCircle2, Eye, Printer } from "lucide-react";
import Button from "../shared/Button";

const PrescriptionHistory = ({
  prescriptions,
  maxDisplay = 5,
  showViewPrint = false,
  onView,
  onPrint,
  showAddButtons = false,
  onAddMedication,
  addedMedications = [], // names of medications already added to the new prescription
  collapsible = false,
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
              <div className="flex flex-col gap-2 mb-1">
                {/* Top row: name + badges + chevron */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-800 truncate">
                      {prescription.patientName}
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold whitespace-nowrap">
                      {prescription.uhid}
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap">
                      {prescription.status}
                    </span>
                  </div>
                  {collapsible && (
                    isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    )
                  )}
                </div>

                <p className="text-sm text-gray-600">Date: {prescription.date}</p>
                <p className="text-sm font-medium text-gray-700">
                  <span className="font-semibold">Diagnosis:</span>{" "}
                  {prescription.diagnosis}
                </p>

                {/* View/Print buttons — full width on mobile */}
                {showViewPrint && (
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant="outline"
                      className="text-xs py-1 px-3 flex-1 sm:flex-none flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView && onView(prescription);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-600" /> View
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs py-1 px-3 flex-1 sm:flex-none flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrint && onPrint(prescription);
                      }}
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-600" /> Print
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
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-white rounded border border-gray-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <Pill className="w-4 h-4 text-teal-600 flex-shrink-0" /> {med.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {med.dosage} &middot; {med.frequency}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold whitespace-nowrap">
                          {med.duration}
                        </span>
                        {showAddButtons && onAddMedication && (
                          addedMedications.includes(med.name) ? (
                            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Added
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddMedication(med);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold transition whitespace-nowrap"
                            >
                              + Add
                            </button>
                          )
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