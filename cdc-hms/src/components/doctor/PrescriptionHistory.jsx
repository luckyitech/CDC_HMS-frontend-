import { useState } from "react";
import { Pill, ChevronDown, ChevronUp, CheckCircle2, Eye, Printer, RefreshCw } from "lucide-react";
import Button from "../shared/Button";

const PrescriptionHistory = ({
  prescriptions,
  maxDisplay = 5,
  showViewPrint = false,
  onView,
  onPrint,
  showAddButtons = false,
  onAddMedication,
  addedMedications = [],
  collapsible = false,
  hidePatientName = false,
  onRenewAll,
}) => {
  const [expandedPrescriptions, setExpandedPrescriptions] = useState(
    // Always expand the first one; collapse the rest if collapsible
    collapsible
      ? new Set(prescriptions.length > 0 ? [prescriptions[0].id] : [])
      : new Set(prescriptions.map(p => p.id))
  );

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
    <div className="space-y-3">
      {displayPrescriptions.map((prescription) => {
        const isExpanded = expandedPrescriptions.has(prescription.id);

        return (
          <div key={prescription.id} className="border border-gray-200 rounded-lg overflow-hidden">

            {/* Header */}
            <div
              onClick={() => collapsible && togglePrescription(prescription.id)}
              className={`p-3 ${collapsible ? "cursor-pointer hover:bg-gray-50" : ""} transition`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {!hidePatientName && (
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-800 truncate">
                        {prescription.patientName}
                      </h3>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {prescription.uhid}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">{prescription.date}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {prescription.status}
                    </span>
                    <span className="text-xs text-gray-600">
                      {prescription.medications?.length} med{prescription.medications?.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {prescription.diagnosis && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      <span className="font-semibold">Dx:</span> {prescription.diagnosis}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {collapsible && (
                    isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                {onRenewAll && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRenewAll(prescription); }}
                    className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Renew All
                  </button>
                )}
                {showViewPrint && (
                  <>
                    <Button
                      variant="outline"
                      className="text-xs py-1 px-3 flex items-center gap-1"
                      onClick={(e) => { e.stopPropagation(); onView?.(prescription); }}
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-600" /> View
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs py-1 px-3 flex items-center gap-1"
                      onClick={(e) => { e.stopPropagation(); onPrint?.(prescription); }}
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-600" /> Print
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Medications list */}
            {(!collapsible || isExpanded) && (
              <div className="bg-gray-50 border-t border-gray-200 p-3">
                <div className="space-y-2">
                  {prescription.medications.map((med, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 bg-white rounded border border-gray-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> {med.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {med.dosage} · {med.frequency} · Qty: {med.quantity || "30"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold whitespace-nowrap">
                          {med.duration}
                        </span>
                        {showAddButtons && onAddMedication && (
                          addedMedications.includes(med.name) ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3" /> Added
                            </span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); onAddMedication(med); }}
                              className="px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold transition"
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
