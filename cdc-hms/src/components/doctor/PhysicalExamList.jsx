import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../shared/Card";
import Button from "../shared/Button";
import { usePhysicalExamContext } from "../../contexts/PhysicalExamContext";
import { useUserContext } from "../../contexts/UserContext";
import PhysicalExamEntry from "../../pages/doctor/PhysicalExamEntry";
import PhysicalExamFindings from "../../pages/doctor/PhysicalExamFindings";
import { Search, FileText, Stethoscope } from "lucide-react";

const PhysicalExamList = ({ patient, embedded = false }) => {
  const { currentUser } = useUserContext();
  const {
    getExaminationsByPatient,
    getLatestExamination,
    searchExaminations,
    updateExamination,
    saveExamination,
  } = usePhysicalExamContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [viewMode, setViewMode] = useState("entry"); // "entry" or "findings" or "new"
  const [showNewExamForm, setShowNewExamForm] = useState(false);
  const [currentExamination, setCurrentExamination] = useState(null);

  // Get all exams for this patient
  const allExams = getExaminationsByPatient(patient.uhid);
  const latestExam = getLatestExamination(patient.uhid);

  // Get filtered exams
  const filteredExams = searchTerm.trim()
    ? searchExaminations(patient.uhid, searchTerm)
    : allExams;

  // Auto-select latest exam on load
  useEffect(() => {
    if (latestExam && !selectedExamId && !showNewExamForm) {
      setSelectedExamId(latestExam.id);
      setCurrentExamination(latestExam);
      // Show findings if latest exam exists (user probably wants to see it)
      setViewMode("findings");
    }
  }, [latestExam, selectedExamId, showNewExamForm]);

  // Handle exam selection from dropdown
  const handleExamSelect = (examId) => {
    const exam = allExams.find((e) => e.id === parseInt(examId));
    if (exam) {
      setSelectedExamId(exam.id);
      setCurrentExamination(exam);
      setShowNewExamForm(false);
      // Always show findings when selecting from dropdown
      setViewMode("findings");
    }
  };

  // Handle save (update existing exam or create new)
  const handleSave = (examData, generateFindings) => {
    if (showNewExamForm) {
      // Save new exam
      const newExam = saveExamination(examData);
      setShowNewExamForm(false);
      setSelectedExamId(newExam.id);
      setCurrentExamination(newExam);

      if (generateFindings) {
        setViewMode("findings");
      } else {
        setViewMode("entry");
      }

      // Show success toast
      toast.success("Physical Examination Saved Successfully", {
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
    } else {
      // Update existing exam
      updateExamination(selectedExamId, examData);

      // Reload the updated exam
      const updatedExam = allExams.find((e) => e.id === selectedExamId);
      if (updatedExam) {
        setCurrentExamination({
          ...updatedExam,
          data: examData.data,
        });
      }

      if (generateFindings) {
        setViewMode("findings");
      } else {
        setViewMode("entry");
      }

      // Show success toast
      toast.success("Physical Examination Updated Successfully", {
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
    }
  };

  // Handle new exam
  const handleNewExam = () => {
    setShowNewExamForm(true);
    setSelectedExamId(null);
    setCurrentExamination(null);
    setViewMode("entry");
  };

  // Handle cancel
  const handleCancel = () => {
    if (showNewExamForm) {
      setShowNewExamForm(false);
      if (latestExam) {
        setSelectedExamId(latestExam.id);
        setCurrentExamination(latestExam);
        setViewMode("findings");
      }
    }
  };

  // Handle edit from findings view
  const handleEdit = () => {
    setViewMode("entry");
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle close from findings
  const handleCloseFindings = () => {
    // Just stay on findings view
  };

  const isLatestExam =
    currentExamination && latestExam && currentExamination.id === latestExam.id;
  const isReadOnly = !isLatestExam && !showNewExamForm;

  return (
    <div className="space-y-6">
      {/* Search & Dropdown Controls */}
      {!showNewExamForm && allExams.length > 0 && (
        <Card className="print:hidden">
          <div className="space-y-4">
            {/* Search Bar */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-1">
                  <Search className="w-4 h-4" />
                  Search Examinations
                </div>
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by date, doctor, or findings..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Dropdown Selector */}
            {filteredExams.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Select Examination to View
                  </div>
                </label>
                <select
                  value={selectedExamId || ""}
                  onChange={(e) => handleExamSelect(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium"
                >
                  {filteredExams.map((exam, index) => (
                    <option key={exam.id} value={exam.id}>
                      {new Date(exam.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      • {exam.time} • {exam.doctorName}
                      {index === 0 && latestExam?.id === exam.id
                        ? " (Latest)"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* New Exam Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleNewExam}
                className="flex items-center gap-2"
              >
                <Stethoscope className="w-4 h-4 inline mr-1" />
                Perform New Examination
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Mode Banner */}
      {currentExamination && !showNewExamForm && viewMode === "findings" && (
        <Card className="print:hidden">
          <div
            className={`p-4 rounded-lg border-l-4 ${
              isLatestExam
                ? "bg-green-50 border-green-500"
                : "bg-blue-50 border-blue-500"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">{isLatestExam ? "📋" : "👁️"}</div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {isLatestExam
                    ? "Latest Examination Summary"
                    : "Historical Examination Summary"}
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  {new Date(currentExamination.date).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}{" "}
                  • {currentExamination.time} • Dr.{" "}
                  {currentExamination.doctorName}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Edit Mode Banner */}
      {currentExamination && !showNewExamForm && viewMode === "entry" && (
        <Card className="print:hidden">
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-3xl">✏️</div>
              <div>
                <p className="text-sm font-bold text-green-900">
                  EDITING Latest Examination
                </p>
                <p className="text-xs text-green-700 mt-1">
                  You can modify this examination
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* New Exam Banner */}
      {showNewExamForm && (
        <Card className="print:hidden">
          <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🆕</div>
              <div>
                <p className="text-sm font-bold text-purple-900">
                  Creating New Physical Examination
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Complete the examination form below
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Physical Exam Entry Form (for editing or new) */}
      {(viewMode === "entry" || showNewExamForm) && (
        <PhysicalExamEntry
          patientData={patient}
          initialData={showNewExamForm ? {} : currentExamination?.data || {}}
          onSave={handleSave}
          onCancel={handleCancel}
          readOnly={isReadOnly}
        />
      )}

      {/* Physical Exam Findings (summary view) */}
      {viewMode === "findings" && currentExamination && (
        <PhysicalExamFindings
          examinationData={currentExamination}
          onEdit={isLatestExam ? handleEdit : null}
          onPrint={handlePrint}
          onClose={handleCloseFindings}
        />
      )}

      {/* Empty State */}
      {allExams.length === 0 && !showNewExamForm && (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🩺</div>
            <p className="text-gray-500 text-lg mb-2">
              No Physical Examinations Yet
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Start by performing a comprehensive physical examination
            </p>
            <Button onClick={handleNewExam}>
              🩺 Perform First Examination
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PhysicalExamList;
