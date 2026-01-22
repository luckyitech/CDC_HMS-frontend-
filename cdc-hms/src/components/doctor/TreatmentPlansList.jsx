import { useState } from "react";
import Card from "../shared/Card";
import Button from "../shared/Button";
import TreatmentPlanPrint from "./TreatmentPlanPrint";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";

const TreatmentPlansList = ({ patient, showStatistics = true }) => {
  const { getPlansByPatient } = useTreatmentPlanContext();
  const treatmentPlans = getPlansByPatient(patient.uhid);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handlePrint = (plan) => {
    setSelectedPlan(plan);
    setShowPrintModal(true);
  };

  if (treatmentPlans.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg mb-2">
            No Treatment Plans Available
          </p>
          <p className="text-gray-400 text-sm">
            Treatment plans will appear here after consultations
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {showStatistics && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <p className="text-xs opacity-90">Total Plans</p>
            <p className="text-3xl font-bold mt-1">{treatmentPlans.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
            <p className="text-xs opacity-90">Active</p>
            <p className="text-3xl font-bold mt-1">
              {treatmentPlans.filter((p) => p.status === "Active").length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-4 text-white">
            <p className="text-xs opacity-90">Completed</p>
            <p className="text-3xl font-bold mt-1">
              {treatmentPlans.filter((p) => p.status === "Completed").length}
            </p>
          </div>
        </div>
      )}

      {/* Treatment Plans List */}
      <Card title="📋 Treatment Plan History">
        <div className="space-y-4">
          {treatmentPlans.map((plan, index) => (
            <div
              key={plan.id}
              className={`p-4 sm:p-6 border-2 rounded-lg transition ${
                index === 0
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-primary"
              }`}
            >
              {/* Plan Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {index === 0 && (
                      <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                        LATEST
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        plan.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {plan.diagnosis}
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p>
                      📅{" "}
                      {new Date(plan.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      • {plan.time}
                    </p>
                    <p className="mt-1">👨‍⚕️ {plan.doctorName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-sm"
                    onClick={() => handlePrint(plan)}
                  >
                    🖨️ Print
                  </Button>
                </div>
              </div>

              {/* Plan Content */}
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Treatment Plan:
                </p>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {plan.plan}
                </pre>
              </div>

              {/* Consultation Notes (if exists) */}
              {plan.notes && (
                <div className="bg-blue-50 rounded-lg p-4 mt-4">
                  <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span>💬</span> Consultation Notes:
                  </p>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {plan.notes}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Print Modal */}
      {showPrintModal && selectedPlan && (
        <TreatmentPlanPrint
          plan={selectedPlan}
          patient={patient}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
};

export default TreatmentPlansList;