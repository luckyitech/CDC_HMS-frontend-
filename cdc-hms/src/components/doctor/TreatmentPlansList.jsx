import { useState } from "react";
import { ChevronDown, ChevronUp, FileEdit, AlertCircle, Printer } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../shared/Card";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import VoiceInput from "../shared/VoiceInput";
import TreatmentPlanPrint from "./TreatmentPlanPrint";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";

const TreatmentPlansList = ({ 
  patient, 
  showStatistics = true,
  showCreateForm = false,
  currentUser = null,
  onSuccess = null,
}) => {
  const { getPlansByPatient, addTreatmentPlan } = useTreatmentPlanContext();
  const treatmentPlans = getPlansByPatient(patient.uhid);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // State for collapsible plans (first plan expanded by default)
  const [expandedPlans, setExpandedPlans] = useState(
    new Set(treatmentPlans.length > 0 ? [treatmentPlans[0].id] : [])
  );

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // State for creating new plan
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");

  // Toggle plan expansion
  const togglePlan = (planId) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const handlePrint = (plan) => {
    setSelectedPlan(plan);
    setShowPrintModal(true);
  };

  // Save diagnosis & treatment plan
  const handleSaveDiagnosis = () => {
    if (!diagnosis.trim()) {
      toast.error("❌ Please enter a diagnosis", {
        duration: 3000,
        position: "top-right",
      });
      return;
    }
    if (!treatmentPlan.trim()) {
      toast.error("❌ Please enter a treatment plan", {
        duration: 3000,
        position: "top-right",
      });
      return;
    }

    addTreatmentPlan({
      uhid: patient.uhid,
      patientName: patient.name,
      doctorName: currentUser?.name || "Doctor",
      diagnosis: diagnosis,
      plan: treatmentPlan,
    });

    // Show success toast
    toast.success("✅ Diagnosis & Plan Saved Successfully!", {
      duration: 2000,
      position: "top-right",
    });

    // Clear form
    setDiagnosis("");
    setTreatmentPlan("");

    // Close modal
    setShowCreateModal(false);

    // Call success callback (for Consultation tab completion)
    if (onSuccess) {
      onSuccess();
    }
  };

  // Cancel and close modal
  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setDiagnosis("");
    setTreatmentPlan("");
  };

  if (treatmentPlans.length === 0 && !showCreateForm) {
    return (
      <Card>
        <div className="text-center py-12">
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
      {showStatistics && treatmentPlans.length > 0 && (
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

      {/* Create New Plan Button */}
      {showCreateForm && treatmentPlans.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateModal(true)}>
            <FileEdit className="w-4 h-4 mr-2" />
            Write New Treatment Plan
          </Button>
        </div>
      )}

      {/* Treatment Plans History */}
      {treatmentPlans.length > 0 && (
        <Card title="📋 Treatment Plan History">
          <div className="space-y-4">
            {treatmentPlans.map((plan, index) => {
              const isExpanded = expandedPlans.has(plan.id);
              
              return (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg overflow-hidden transition ${
                    index === 0
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-primary"
                  }`}
                >
                  {/* Plan Header - Clickable */}
                  <div
                    onClick={() => togglePlan(plan.id)}
                    className="p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          )}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(plan);
                          }}
                        >
                          <Printer className="w-4 h-4 mr-1" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Plan Content - Collapsible */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white p-4 sm:p-6">
                      <p className="text-sm font-bold text-gray-700 mb-3">
                        📝 Treatment Plan:
                      </p>
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 p-4 rounded-lg">
                        {plan.plan}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state when no plans and showing create form */}
      {treatmentPlans.length === 0 && showCreateForm && (
        <Card>
          <div className="text-center py-12">
            <FileEdit className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg mb-2">
              No Treatment Plans Available
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Create your first treatment plan to get started
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <FileEdit className="w-4 h-4 mr-2" />
              Write New Treatment Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Create Treatment Plan Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={handleCancelCreate}
          title={
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                Write New Diagnosis & Treatment Plan
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Patient: {patient.name} ({patient.uhid})
              </p>
            </div>
          }
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Required for Completion
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Both diagnosis and treatment plan must be completed before
                you can complete the consultation.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Diagnosis *
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g., Type 2 Diabetes Mellitus - Poorly Controlled, Diabetic Neuropathy"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Treatment Plan *
              </label>
              <VoiceInput
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                placeholder="Document treatment plan:
- Medication changes (e.g., Increase Metformin to 1000mg twice daily, Add Glimepiride 2mg)
- Monitoring instructions (e.g., Check SMBG daily, HbA1c repeat in 3 months)
- Lifestyle modifications (e.g., Reduce carbs to 45-60g/meal, Walk 30min daily)
- Follow-up schedule (e.g., Return in 4 weeks, phone check-in at 2 weeks)
- Referrals (e.g., Ophthalmology for retinopathy screening)"
                rows={10}
              />
              <p className="text-xs text-gray-500 mt-2">
                Include: medication adjustments, monitoring plan, lifestyle
                changes, follow-up timeline, referrals needed
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSaveDiagnosis} className="flex-1">
                💾 Save Diagnosis & Plan
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelCreate}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

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