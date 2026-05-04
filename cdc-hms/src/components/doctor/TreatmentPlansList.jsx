import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, FileEdit, AlertCircle, Printer, ClipboardList, Calendar, Stethoscope, FileText, Save } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../shared/Card";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import VoiceInput from "../shared/VoiceInput";
import DiagnosisInput, { parseDiagnoses, formatDiagnosisDisplay } from "../shared/DiagnosisInput";
import TreatmentPlanPrint from "./TreatmentPlanPrint";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";

const TreatmentPlansList = ({
  patient,
  showStatistics = true,
  showCreateForm = false,
  currentUser = null,
  onSuccess = null,
}) => {
  const { getPlansByPatient, addTreatmentPlan, updateTreatmentPlan } = useTreatmentPlanContext();

  // State for treatment plans (loaded async)
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Only one plan expanded at a time — stores the open plan's id (or null)
  const [expandedPlanId, setExpandedPlanId] = useState(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // State for creating new plan
  const [diagnoses,     setDiagnoses]     = useState([]);
  const [treatmentPlan, setTreatmentPlan] = useState("");

  // State for editing an existing plan
  const [editingPlan,   setEditingPlan]   = useState(null);
  const [editDiagnoses, setEditDiagnoses] = useState([]);
  const [editPlan,      setEditPlan]      = useState("");

  // Load treatment plans on mount and when patient changes
  useEffect(() => {
    let isMounted = true;
    const loadPlans = async () => {
      setIsLoading(true);
      try {
        const plans = await getPlansByPatient(patient.uhid);
        if (!isMounted) return;
        const plansArray = Array.isArray(plans) ? plans : [];
        setTreatmentPlans(plansArray);
        // Expand first plan by default
        if (plansArray.length > 0) {
          setExpandedPlanId(id => id ?? plansArray[0].id);
        }
      } catch (err) {
        console.error("Error loading treatment plans:", err);
        if (isMounted) setTreatmentPlans([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadPlans();
    return () => { isMounted = false; };
  }, [patient.uhid, getPlansByPatient]);

  // Toggle plan — opens clicked one, closes if already open
  const togglePlan = (planId) => {
    setExpandedPlanId(prev => prev === planId ? null : planId);
  };

  const handlePrint = (plan) => {
    setSelectedPlan(plan);
    setShowPrintModal(true);
  };

  // Save diagnosis & treatment plan
  const handleSaveDiagnosis = async () => {
    if (diagnoses.length === 0) {
      toast.error("Please add at least one diagnosis", { duration: 3000, position: "top-right" });
      return;
    }
    if (!treatmentPlan.trim()) {
      toast.error("Please enter a treatment plan", { duration: 3000, position: "top-right" });
      return;
    }

    const result = await addTreatmentPlan({
      uhid: patient.uhid,
      patientName: patient.name,
      doctorName: currentUser?.name || "Doctor",
      diagnosis: JSON.stringify(diagnoses),
      plan: treatmentPlan,
    });

    if (result) {
      // Show success toast
      toast.success("✅ Diagnosis & Plan Saved Successfully!", {
        duration: 2000,
        position: "top-right",
      });

      // Refresh the treatment plans list
      const plans = await getPlansByPatient(patient.uhid);
      const plansArray = Array.isArray(plans) ? plans : [];
      setTreatmentPlans(plansArray);
      // Expand the newest plan
      if (plansArray.length > 0) {
        setExpandedPlanId(plansArray[0].id);
      }

      // Clear form
      setDiagnoses([]);
      setTreatmentPlan("");

      // Close modal
      setShowCreateModal(false);

      // Call success callback (for Consultation tab completion)
      if (onSuccess) {
        onSuccess();
      }
    } else {
      toast.error("❌ Failed to save treatment plan. Please try again.", {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  // Cancel and close modal
  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setDiagnoses([]);
    setTreatmentPlan("");
  };

  // Open edit modal pre-filled with existing plan data
  const handleEditClick = (plan, e) => {
    e.stopPropagation();
    setEditingPlan(plan);
    setEditDiagnoses(parseDiagnoses(plan.diagnosis));
    setEditPlan(plan.plan);
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    setEditDiagnoses([]);
    setEditPlan("");
  };

  const handleSaveEdit = async () => {
    if (editDiagnoses.length === 0) {
      toast.error("Please add at least one diagnosis", { duration: 3000, position: "top-right" });
      return;
    }
    if (!editPlan.trim()) {
      toast.error("Please enter a treatment plan", { duration: 3000, position: "top-right" });
      return;
    }

    const result = await updateTreatmentPlan(editingPlan.id, {
      diagnosis: JSON.stringify(editDiagnoses),
      plan: editPlan,
    });

    if (result?.success) {
      toast.success("Treatment plan updated successfully!", { duration: 2000, position: "top-right" });
      // Refresh list
      const plans = await getPlansByPatient(patient.uhid);
      setTreatmentPlans(Array.isArray(plans) ? plans : []);
      handleCancelEdit();
    } else {
      toast.error("Failed to update treatment plan. Please try again.", { duration: 3000, position: "top-right" });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading treatment plans...</p>
        </div>
      </Card>
    );
  }

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

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

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
        <Card title={<span className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-teal-600" /> Treatment Plan History</span>}>
          <div className="space-y-4">
            {treatmentPlans.map((plan, index) => {
              const isExpanded = expandedPlanId === plan.id;
              
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
                    className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition"
                  >
                    {/* Row 1: badges + chevron (left) · Edit/Print buttons (right) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2.5 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                            LATEST
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          plan.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {plan.status}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {plan.date === today && (
                          <Button
                            variant="outline"
                            className="text-xs sm:text-sm flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2"
                            onClick={(e) => handleEditClick(plan, e)}
                          >
                            <FileEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                            <span>Edit</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="text-xs sm:text-sm flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2"
                          onClick={(e) => { e.stopPropagation(); handlePrint(plan); }}
                        >
                          <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600" />
                          <span>Print</span>
                        </Button>
                      </div>
                    </div>

                    {/* Row 2: Diagnosis label + list */}
                    <div className="mb-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Diagnosis</p>
                      <div className="space-y-1.5">
                        {parseDiagnoses(plan.diagnosis).map((d) => (
                          <div key={d.code || d.description} className="flex items-start gap-2">
                            {d.code && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 font-mono text-xs font-bold rounded mt-0.5">
                                {d.code}
                              </span>
                            )}
                            <span className="text-sm text-gray-800 leading-snug">{d.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Row 3: Date + Doctor — wraps on small screens */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        {new Date(plan.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}{plan.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        {plan.doctorName}
                      </span>
                    </div>
                  </div>

                  {/* Plan Content - Collapsible */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white p-4 sm:p-6">
                      <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-teal-600" /> Treatment Plan:
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
              <DiagnosisInput diagnoses={diagnoses} onChange={setDiagnoses} />
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
              <Button onClick={handleSaveDiagnosis} className="flex-1 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Diagnosis & Plan
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

      {/* Edit Treatment Plan Modal */}
      {editingPlan && (
        <Modal
          isOpen={!!editingPlan}
          onClose={handleCancelEdit}
          title={
            <div>
              <h3 className="text-xl font-bold text-gray-800">Edit Diagnosis & Treatment Plan</h3>
              <p className="text-xs text-gray-600 mt-1">
                Patient: {patient.name} ({patient.uhid})
              </p>
            </div>
          }
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Diagnosis *
              </label>
              <DiagnosisInput diagnoses={editDiagnoses} onChange={setEditDiagnoses} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Treatment Plan *
              </label>
              <VoiceInput
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                placeholder="Document updated treatment plan..."
                rows={10}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSaveEdit} className="flex-1 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
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