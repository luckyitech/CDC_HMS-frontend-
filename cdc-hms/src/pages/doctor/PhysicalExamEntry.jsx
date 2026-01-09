import { useState, useEffect } from "react";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { physicalExamSections } from "./physicalExamData";
import VoiceInput from "../../components/shared/VoiceInput";

const PhysicalExamEntry = ({
  patientData,
  onSave,
  onCancel,
  initialData = {},
}) => {
  const [examData, setExamData] = useState(initialData);
  const [expandedSections, setExpandedSections] = useState(["vitalSigns"]); // Vital signs open by default
  const [completedSections, setCompletedSections] = useState([]);

  // Auto-fill vitals from triage
  useEffect(() => {
    if (patientData.currentVitals && !initialData.vitalSigns) {
      setExamData((prevData) => ({
        ...prevData,
        vitalSigns: {
          bp: patientData.currentVitals.bp || "",
          hr: patientData.currentVitals.hr || "",
          rr: patientData.currentVitals.rr || "18",
          temp: patientData.currentVitals.temp || "",
          spo2: patientData.currentVitals.spo2 || "",
          bmi: patientData.currentVitals.bmi || "",
          rbs: patientData.currentVitals.rbs || "",
          hba1c: patientData.currentVitals.hba1c || "",
          ketones: patientData.currentVitals.ketones || "",
          _autoFilled: true,
          _recordedBy: patientData.currentVitals.recordedBy,
          _recordedAt: patientData.currentVitals.recordedAt,
        },
      }));
    }
  }, [patientData.currentVitals, initialData.vitalSigns]);

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter((id) => id !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (sectionId, itemId) => {
    setExamData({
      ...examData,
      [sectionId]: {
        ...examData[sectionId],
        [itemId]: !examData[sectionId]?.[itemId],
      },
    });
  };

  // Handle vital signs input
  const handleVitalsChange = (fieldId, value) => {
    setExamData({
      ...examData,
      vitalSigns: {
        ...examData.vitalSigns,
        [fieldId]: value,
      },
    });
  };

  // Handle notes change
  const handleNotesChange = (sectionId, value) => {
    setExamData({
      ...examData,
      [sectionId]: {
        ...examData[sectionId],
        notes: value,
      },
    });
  };

  // Mark all as normal in a section
  const markAllNormal = (sectionId) => {
    const section = physicalExamSections.find((s) => s.id === sectionId);
    if (!section || !section.subsections) return;

    const normalState = {};
    section.subsections.forEach((subsection) => {
      subsection.items.forEach((item) => {
        normalState[item.id] = item.normalState;
      });
    });

    setExamData({
      ...examData,
      [sectionId]: {
        ...examData[sectionId],
        ...normalState,
      },
    });
  };

  // Mark section as complete
  const markSectionComplete = (sectionId) => {
    if (!completedSections.includes(sectionId)) {
      setCompletedSections([...completedSections, sectionId]);
    }
  };

  // Calculate progress
  const progress =
    (completedSections.length / physicalExamSections.length) * 100;

  // Handle save
  // const handleSave = (generateFindings = false) => {
  //   const saveData = {
  //     uhid: patientData.uhid,
  //     patientName: patientData.name,
  //     doctorName: "Dr. Ahmed Hassan", // Replace with actual doctor from context
  //     data: examData,
  //     completedSections,
  //   };
  //   onSave(saveData, generateFindings);
  // };
  const handleSave = (generateFindings = false) => {
    // Clean vital signs - remove metadata fields
    let cleanedExamData = { ...examData };

    if (cleanedExamData.vitalSigns) {
      const cleanedVitals = {};
      Object.keys(cleanedExamData.vitalSigns).forEach((key) => {
        // Only keep fields that don't start with underscore
        if (!key.startsWith("_")) {
          cleanedVitals[key] = cleanedExamData.vitalSigns[key];
        }
      });
      cleanedExamData.vitalSigns = cleanedVitals;
    }

    const saveData = {
      uhid: patientData.uhid,
      patientName: patientData.name,
      doctorName: "Dr. Ahmed Hassan",
      data: cleanedExamData,
      completedSections,
    };
    onSave(saveData, generateFindings);
  };

  return (
    <div className="space-y-6">
      {/* Patient Info Banner */}
      <Card className="bg-blue-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {patientData.name}
            </h3>
            <p className="text-sm text-gray-600">
              {patientData.uhid} • {patientData.age} yrs • {patientData.gender}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(progress)}%
            </p>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-4 bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          className="text-sm"
          onClick={() =>
            setExpandedSections(physicalExamSections.map((s) => s.id))
          }
        >
          📂 Expand All
        </Button>
        <Button
          variant="outline"
          className="text-sm"
          onClick={() => setExpandedSections([])}
        >
          📁 Collapse All
        </Button>
      </div>

      {/* Examination Sections */}
      <div className="space-y-4">
        {physicalExamSections.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const isCompleted = completedSections.includes(section.id);

          return (
            <Card
              key={section.id}
              className={isCompleted ? "border-2 border-green-500" : ""}
            >
              {/* Section Header */}
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-4 -m-4 rounded-lg transition"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{section.icon}</span>
                  <h3 className="text-lg font-bold text-gray-800">
                    {section.title}
                  </h3>
                  {isCompleted && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      ✓ Completed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!isCompleted && section.subsections && (
                    <Button
                      variant="outline"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllNormal(section.id);
                      }}
                    >
                      ✓ Mark All Normal
                    </Button>
                  )}
                  <span className="text-2xl text-gray-400">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* Section Content */}
              {isExpanded && (
                <div className="mt-6 space-y-6">
                  {/* Vital Signs (Special handling) */}
                  {section.type === "vitals" && (
                    <>
                      {/* Auto-fill notification */}
                      {examData.vitalSigns?._autoFilled && (
                        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 font-semibold">
                                ✓ Auto-filled from Triage
                              </span>
                              <span className="text-sm text-gray-600">
                                Recorded by {examData.vitalSigns._recordedBy} at{" "}
                                {new Date(
                                  examData.vitalSigns._recordedAt
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExamData({
                                  ...examData,
                                  vitalSigns: {},
                                });
                              }}
                            >
                              🔄 Clear & Re-enter
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.fields.map((field) => (
                          <div key={field.id}>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {field.label}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type={field.type}
                                step={field.step}
                                placeholder={field.placeholder}
                                value={examData.vitalSigns?.[field.id] || ""}
                                onChange={(e) =>
                                  handleVitalsChange(field.id, e.target.value)
                                }
                                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                              />
                              <span className="text-sm text-gray-600 font-medium">
                                {field.unit}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Subsections with Checkboxes */}
                  {section.subsections &&
                    section.subsections.map((subsection) => (
                      <div
                        key={subsection.title}
                        className="border-l-4 border-blue-500 pl-4"
                      >
                        <h4 className="font-semibold text-gray-800 mb-3">
                          {subsection.title}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {subsection.items.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  examData[section.id]?.[item.id] || false
                                }
                                onChange={() =>
                                  handleCheckboxChange(section.id, item.id)
                                }
                                className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                  {/* Additional Notes */}
                  {section.hasNotes && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Additional Notes
                      </label>
                      {/* <textarea
                        value={examData[section.id]?.notes || ""}
                        onChange={(e) =>
                          handleNotesChange(section.id, e.target.value)
                        }
                        placeholder="Enter any additional findings..."
                        rows="3"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      /> */}
                      <VoiceInput
                      value={examData[section.id]?.notes || ""}
                      onChange={(e) =>
                          handleNotesChange(section.id, e.target.value)
                        }
                      placeholder="Enter any additional findings..."
                      rows={3}  
                      />
                    </div>
                  )}

                  {/* Section Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="text-sm"
                      onClick={() => {
                        markSectionComplete(section.id);
                        const nextIndex =
                          physicalExamSections.findIndex(
                            (s) => s.id === section.id
                          ) + 1;
                        if (nextIndex < physicalExamSections.length) {
                          setExpandedSections([
                            physicalExamSections[nextIndex].id,
                          ]);
                        }
                      }}
                    >
                      ✓ Complete & Next
                    </Button>
                    <Button
                      variant="outline"
                      className="text-sm"
                      onClick={() => {
                        setExamData({
                          ...examData,
                          [section.id]: {},
                        });
                      }}
                    >
                      🔄 Clear Section
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <Card>
        <div className="flex gap-4">
          <Button onClick={() => handleSave(false)} className="flex-1">
            💾 Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} className="flex-1">
            📋 Save & Generate Findings
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PhysicalExamEntry;
