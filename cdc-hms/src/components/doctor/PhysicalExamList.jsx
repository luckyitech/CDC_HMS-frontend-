import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../shared/Card";
import Button from "../shared/Button";
import { usePhysicalExamContext } from "../../contexts/PhysicalExamContext";
import { usePatientContext } from "../../contexts/PatientContext";
import PhysicalExamEntry from "../../pages/doctor/PhysicalExamEntry";
import PhysicalExamFindings from "../../pages/doctor/PhysicalExamFindings";
import { FileText, Stethoscope, ClipboardList, Eye, PenLine, PlusCircle } from "lucide-react";

const PhysicalExamList = ({ patient }) => {
  const {
    getExaminationsByPatient,
    getLatestExamination,
    getExaminationById,
    updateExamination,
    saveExamination,
  } = usePhysicalExamContext();
  const { fetchPatientByUHID } = usePatientContext();

  const [selectedExamId, setSelectedExamId] = useState(null);
  const [viewMode, setViewMode] = useState("findings"); // "entry" or "findings"
  const [showNewExamForm, setShowNewExamForm] = useState(false);
  const [currentExamination, setCurrentExamination] = useState(null);
  const [freshPatient, setFreshPatient] = useState(null);

  // State for exams loaded async
  const [allExams, setAllExams] = useState([]);
  const [latestExam, setLatestExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load exams on mount and when patient/search changes
  useEffect(() => {
    let isMounted = true;
    const loadExams = async () => {
      setIsLoading(true);
      try {
        const [exams, latest] = await Promise.all([
          getExaminationsByPatient(patient.uhid),
          getLatestExamination(patient.uhid),
        ]);
        if (!isMounted) return;

        const examsArray = Array.isArray(exams) ? exams : [];
        setAllExams(examsArray);
        setLatestExam(latest || null);

        // Auto-select latest exam on load — fetch full data (list excludes heavy 'data' column)
        if (latest && !selectedExamId && !showNewExamForm) {
          setSelectedExamId(latest.id);
          const full = await getExaminationById(latest.id);
          if (!isMounted) return;
          setCurrentExamination(full || latest);
          setViewMode("findings");
        }
      } catch (err) {
        console.error("Error loading exams:", err);
        if (isMounted) {
          setAllExams([]);
          setLatestExam(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadExams();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.uhid, getExaminationsByPatient, getLatestExamination]);


  // Handle exam selection from dropdown — fetch full data (list excludes heavy 'data' column)
  const handleExamSelect = async (examId) => {
    const exam = allExams.find((e) => e.id === parseInt(examId));
    if (exam) {
      setSelectedExamId(exam.id);
      setShowNewExamForm(false);
      setViewMode("findings");
      const full = await getExaminationById(exam.id);
      setCurrentExamination(full || exam);
    }
  };

  // Handle save (update existing exam or create new)
  const handleSave = async (examData, generateFindings) => {
    if (showNewExamForm) {
      // Save new exam (async)
      const newExam = await saveExamination(examData);
      if (newExam) {
        setShowNewExamForm(false);
        setSelectedExamId(newExam.id);
        setCurrentExamination(newExam);
        setLatestExam(newExam);
        setAllExams((prev) => [newExam, ...prev]);

        setViewMode("findings");

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
        toast.error("Failed to save physical examination. Please try again.", {
          duration: 3000,
          position: "top-right",
          icon: "❌",
          style: {
            background: "#EF4444",
            color: "#FFFFFF",
            fontWeight: "bold",
            padding: "16px",
          },
        });
      }
    } else {
      // Update existing exam (async)
      const updatedExam = await updateExamination(selectedExamId, examData);

      if (updatedExam) {
        setCurrentExamination(updatedExam);
        // Update in allExams list
        setAllExams((prev) =>
          prev.map((e) => (e.id === selectedExamId ? updatedExam : e))
        );

        setViewMode("findings");

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
      } else {
        toast.error("Failed to update physical examination. Please try again.", {
          duration: 3000,
          position: "top-right",
          icon: "❌",
          style: {
            background: "#EF4444",
            color: "#FFFFFF",
            fontWeight: "bold",
            padding: "16px",
          },
        });
      }
    }
  };

  // Handle new exam — fetch fresh patient data so triage vitals are up-to-date
  const handleNewExam = async () => {
    setSelectedExamId(null);
    setCurrentExamination(null);
    setFreshPatient(null);        // clear so loading spinner shows
    setShowNewExamForm(true);
    setViewMode("entry");
    // Fetch fresh patient data BEFORE the form mounts (vitals included)
    const fresh = await fetchPatientByUHID(patient.uhid);
    if (fresh) setFreshPatient(fresh);
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

  // Handle close from findings
  const handleCloseFindings = () => {
    // Just stay on findings view
  };

  const isLatestExam =
    currentExamination && latestExam && currentExamination.id === latestExam.id;
  const isReadOnly = !isLatestExam && !showNewExamForm;

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading physical examinations...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* New Exam Button — always visible at top when not already in new exam flow */}
      {!showNewExamForm && (
        <div className="flex justify-end print:hidden">
          <Button
            onClick={handleNewExam}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Stethoscope className="w-4 h-4" />
            + New Examination
          </Button>
        </div>
      )}

      {/* Search & Dropdown Controls */}
      {!showNewExamForm && allExams.length > 0 && (
        <Card className="print:hidden">
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
            {allExams.map((exam, index) => (
              <option key={exam.id} value={exam.id}>
                {new Date(exam.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                &middot; {exam.time} &middot; {exam.doctorName}
                {index === 0 && latestExam?.id === exam.id ? " (Latest)" : ""}
              </option>
            ))}
          </select>
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
              <div>{isLatestExam ? <ClipboardList className="w-7 h-7 text-teal-600" /> : <Eye className="w-7 h-7 text-teal-600" />}</div>
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
                  &middot; {currentExamination.time} &middot; Dr.{" "}
                  {currentExamination.doctorName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isLatestExam
                    ? "Click \"Edit\" below to modify this exam · Click \"+ New Examination\" above to record a new one"
                    : "This is a historical record · Click \"+ New Examination\" above to record a new exam"}
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
              <div><PenLine className="w-7 h-7 text-teal-600" /></div>
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
              <div><PlusCircle className="w-7 h-7 text-teal-600" /></div>
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
        showNewExamForm && !freshPatient ? (
          <Card>
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading patient vitals...</p>
            </div>
          </Card>
        ) : (
          <PhysicalExamEntry
            patientData={showNewExamForm && freshPatient ? freshPatient : patient}
            initialData={showNewExamForm ? {} : currentExamination?.data || {}}
            onSave={handleSave}
            onCancel={handleCancel}
            readOnly={isReadOnly}
          />
        )
      )}

      {/* Physical Exam Findings (summary view) */}
      {viewMode === "findings" && currentExamination && (
        <PhysicalExamFindings
          examinationData={currentExamination}
          onEdit={isLatestExam ? handleEdit : null}
          onClose={handleCloseFindings}
        />
      )}

      {/* Empty State */}
      {allExams.length === 0 && !showNewExamForm && (
        <Card>
          <div className="text-center py-12">
            <Stethoscope className="w-16 h-16 mx-auto mb-4 text-teal-500" />
            <p className="text-gray-500 text-lg mb-2">
              No Physical Examinations Yet
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Start by performing a comprehensive physical examination
            </p>
            <Button onClick={handleNewExam} className="flex items-center gap-2 mx-auto">
              <Stethoscope className="w-4 h-4" /> Perform First Examination
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PhysicalExamList;
