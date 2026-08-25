import { useState, useEffect, useRef } from "react";
import usePrint from "../../hooks/usePrint";
import { useUserContext } from "../../contexts/UserContext";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { physicalExamSections } from "./physicalExamData";
import PrintLetterhead from "../../components/shared/PrintLetterhead";
import VoiceInput from "../../components/shared/VoiceInput";
import ImageViewerModal from "../../components/doctor/ImageViewerModal";
import toast from "react-hot-toast";
import {
  Camera,
  Tag,
  Eye,
  Trash2,
  FileText,
  Clock,
  UserCircle,
  RotateCcw,
  Save,
  Lock,
  CheckCircle,
  Activity,
  ClipboardList,
  Heart,
  Wind,
  Circle,
  Brain,
  Bone,
  Footprints,
  Printer,
} from "lucide-react";

// Draft key for an in-progress NEW exam (cleared on successful save)
export const examDraftKey = (uhid) => `physical_exam_draft_${uhid}`;

// Icon mapping helper - converts emoji strings to Lucide components
const getIconComponent = (emojiIcon) => {
  const iconMap = {
    "📊": Activity,
    "📋": ClipboardList,
    "❤️": Heart,
    "🫁": Wind,
    "🔴": Circle,
    "🧠": Brain,
    "🦴": Bone,
    "🦶": Footprints,
    "📸": Camera,
  };
  return iconMap[emojiIcon] || ClipboardList;
};

const PhysicalExamEntry = ({
  patientData,
  onSave,
  onCancel,
  initialData = {},
  readOnly = false,
  // Consultation context: patient identity + progress are already on screen
  hidePatientHeader = false,
}) => {
  const { currentUser } = useUserContext();
  const { printRef, handlePrint } = usePrint();

  // Vital Signs removed from the exam ENTRY form — triage owns vitals and they
  // live in the summary panel. Historical exams that recorded vitals still show
  // them in PhysicalExamFindings, and editing such an exam preserves the data
  // (it just isn't shown/edited here).
  const entrySections = physicalExamSections.filter((s) => s.id !== "vitalSigns");

  // ── Draft persistence ──────────────────────────────────────────────────────
  // A NEW exam in progress survives page refreshes and tab switches: findings
  // are mirrored to localStorage (same-day only) and cleared on successful save
  // (see examDraftKey removal in PhysicalExamList.handleSave).
  const isNewExam = !readOnly && Object.keys(initialData || {}).length === 0;
  const draftRef = useRef(undefined);
  if (draftRef.current === undefined) {
    draftRef.current = null;
    if (isNewExam) {
      try {
        const saved = JSON.parse(localStorage.getItem(examDraftKey(patientData.uhid)));
        if (saved?.date === new Date().toISOString().slice(0, 10)) draftRef.current = saved;
      } catch { /* corrupt draft — start fresh */ }
    }
  }

  const [examData, setExamData] = useState(() => draftRef.current?.examData || initialData);
  // Single-open accordion: all sections start collapsed; at most one open.
  const [expandedSections, setExpandedSections] = useState([]);
  const [completedSections, setCompletedSections] = useState(() => draftRef.current?.completedSections || []);

  // Clinical Images state
  const [clinicalImages, setClinicalImages] = useState(
    () => draftRef.current?.clinicalImages || initialData.clinicalImages || []
  );

  // Mirror the in-progress exam to localStorage
  useEffect(() => {
    if (!isNewExam) return;
    try {
      localStorage.setItem(
        examDraftKey(patientData.uhid),
        JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          examData,
          completedSections,
          clinicalImages,
        })
      );
    } catch { /* storage full (e.g. large images) — draft skipped */ }
  }, [isNewExam, patientData.uhid, examData, completedSections, clinicalImages]);
  const [selectedBodyArea, setSelectedBodyArea] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  // Toggle section expansion — single-open: opening one collapses the others
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? [] : [sectionId]
    );
  };

  // Handle checkbox change
  const handleCheckboxChange = (sectionId, itemId) => {
    if (readOnly) return; // Don't allow changes in read-only mode

    setExamData({
      ...examData,
      [sectionId]: {
        ...examData[sectionId],
        [itemId]: !examData[sectionId]?.[itemId],
      },
    });
  };

  // Handle notes change
  const handleNotesChange = (sectionId, value) => {
    if (readOnly) return; // Don't allow changes in read-only mode

    setExamData({
      ...examData,
      [sectionId]: {
        ...examData[sectionId],
        notes: value,
      },
    });
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    if (readOnly) return;

    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      // Show error toast
      toast.error("❌ Please select an image file", {
        duration: 3000,
        position: "top-right",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("❌ Image size must be less than 5MB", {
        duration: 3000,
        position: "top-right",
      });
      return;
    }

    // Validate body area selected
    if (!selectedBodyArea) {
      toast("⚠️ Please select a body area first", {
        duration: 3000,
        position: "top-right",
        icon: "⚠️",
        style: {
          background: "#EAB308",
          color: "#fff",
        },
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImage = {
        id: `img_${Date.now()}`,
        file: reader.result,
        bodyArea: selectedBodyArea,
        caption: imageCaption,
        timestamp: new Date().toISOString(),
        doctorName: currentUser?.name || currentUser?.email || 'Doctor',
      };

      setClinicalImages([...clinicalImages, newImage]);

      // Clear form
      setSelectedBodyArea("");
      setImageCaption("");
      e.target.value = null;

      // Show success toast
      toast.success("✅ Image uploaded successfully", {
        duration: 2000,
        position: "top-right",
      });
    };

    reader.readAsDataURL(file);
  };

  // Handle image delete
  const handleImageDelete = (imageId) => {
    if (readOnly) return;

    if (window.confirm("Are you sure you want to delete this image?")) {
      setClinicalImages(clinicalImages.filter((img) => img.id !== imageId));

      // Show success toast
      toast.success("✅ Image deleted", {
        duration: 2000,
        position: "top-right",
      });
    }
  };

  // Handle image view
  const handleImageView = (image) => {
    setSelectedImage(image);
    setShowImageViewer(true);
  };

  // Mark all as normal in a section
  const markAllNormal = (sectionId) => {
    if (readOnly) return; // Don't allow changes in read-only mode

    const section = entrySections.find((s) => s.id === sectionId);
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

    // Expand the section (single-open) so the doctor can review and add notes
    setExpandedSections([sectionId]);

    toast.success(`All ${section.title} marked as normal`, {
      duration: 2000,
      position: "top-right",
    });
  };

  // Mark section as complete
  const markSectionComplete = (sectionId) => {
    if (readOnly) return; // Don't allow in read-only mode

    const section = entrySections.find((s) => s.id === sectionId);

    if (!completedSections.includes(sectionId)) {
      setCompletedSections([...completedSections, sectionId]);
    }

    toast.success(`${section?.title || "Section"} completed`, {
      duration: 2500,
      position: "top-right",
      icon: "✓",
      style: { background: "#10B981", color: "#fff", fontWeight: "bold" },
    });
  };

  // Calculate progress
  const progress =
    (completedSections.length / entrySections.length) * 100;

  const handleSave = () => {
    if (readOnly) return; // Don't allow save in read-only mode

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

    // Include clinical images in the data so they persist in the database
    if (clinicalImages.length > 0) {
      cleanedExamData.clinicalImages = clinicalImages;
    }

    const saveData = {
      uhid: patientData.uhid,
      data: cleanedExamData,
    };
    onSave(saveData);
  };

  return (
    <div ref={printRef} className="space-y-6">
      {/* Clinic letterhead — print only (DRY §4e) */}
      <PrintLetterhead />
      {/* Read-Only Banner */}
      {readOnly && (
        <Card>
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-3xl">👁️</div>
              <div>
                <p className="text-sm font-bold text-blue-900">
                  VIEW MODE - Historical Examination (Read Only)
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  This is a historical record and cannot be edited.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Patient Info Banner — hidden in the consultation (redundant there) */}
      {!hidePatientHeader && (
      <Card className={readOnly ? "bg-gray-50" : "bg-blue-50"}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {patientData.name}
            </h3>
            <p className="text-sm text-gray-600">
              {patientData.uhid} &middot; {patientData.age} yrs &middot; {patientData.gender}
            </p>
          </div>
          {!readOnly && (
            <div className="sm:text-right">
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
        {/* Progress Bar (only show in edit mode) */}
        {!readOnly && (
          <div className="mt-4 bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </Card>
      )}

      {/* Expand All / Collapse All removed — sections are a single-open
          accordion: all collapsed by default, opening one closes the rest. */}

      {/* Examination Sections */}
      <div className="space-y-4">
        {entrySections.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const isCompleted = completedSections.includes(section.id);

          return (
            <Card
              key={section.id}
              className={`${
                isCompleted && !readOnly ? "border-2 border-green-500" : ""
              } ${readOnly ? "bg-gray-50" : ""}`}
            >
              {/* Section Header */}
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-blue-50 p-4 -m-4 rounded-lg transition"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const IconComponent = getIconComponent(section.icon);
                    return <IconComponent className="w-6 h-6 text-primary" />;
                  })()}
                  <h3 className="text-lg font-bold text-gray-800">
                    {section.title}
                  </h3>
                  {isCompleted && !readOnly && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Completed
                    </span>
                  )}
                  {readOnly && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Read-Only
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!isCompleted && !readOnly && section.subsections && (
                    <Button
                      variant="outline"
                      className="text-xs flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllNormal(section.id);
                      }}
                    >
                      <CheckCircle className="w-3 h-3" /> Mark All Normal
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
                  {/* Clinical Images (Special handling) */}
                  {section.type === "images" && (
                    <div className="space-y-6">
                      {/* Description */}
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-sm text-blue-900">
                          📸 {section.description}
                        </p>
                      </div>

                      {/* Upload Form */}
                      {!readOnly && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Body Area Selector */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <div className="flex items-center gap-1">
                                  <Tag className="w-4 h-4" />
                                  Body Area *
                                </div>
                              </label>
                              <select
                                value={selectedBodyArea}
                                onChange={(e) =>
                                  setSelectedBodyArea(e.target.value)
                                }
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select body area...</option>
                                {section.bodyAreaOptions.map((area) => (
                                  <option key={area} value={area}>
                                    {area}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Caption */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <div className="flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  Caption (Optional)
                                </div>
                              </label>
                              <input
                                type="text"
                                value={imageCaption}
                                onChange={(e) =>
                                  setImageCaption(e.target.value)
                                }
                                placeholder="e.g., Diabetic ulcer, 2cm diameter"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          {/* Upload Button */}
                          <div>
                            <label className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 cursor-pointer transition font-semibold">
                              <Camera className="w-5 h-5" />
                              <span>Upload Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Max file size: 5MB &middot; Supported: JPG, PNG, GIF
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Uploaded Images */}
                      {clinicalImages.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">
                            Uploaded Images ({clinicalImages.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clinicalImages.map((image) => (
                              <div
                                key={image.id}
                                className="border-2 border-gray-200 rounded-lg p-3 hover:border-primary transition"
                              >
                                {/* Image Preview */}
                                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                                  <img
                                    src={image.file}
                                    alt={image.caption || "Clinical image"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                {/* Image Info */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                      {image.bodyArea}
                                    </span>
                                  </div>

                                  {image.caption && (
                                    <p className="text-sm text-gray-700 line-clamp-2">
                                      {image.caption}
                                    </p>
                                  )}

                                  <p className="text-xs text-gray-500">
                                    {new Date(image.timestamp).toLocaleString()}
                                  </p>

                                  {/* Action Buttons */}
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={() => handleImageView(image)}
                                      className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition"
                                    >
                                      <Eye className="w-4 h-4 inline mr-1" />
                                      View
                                    </button>
                                    {!readOnly && (
                                      <button
                                        onClick={() =>
                                          handleImageDelete(image.id)
                                        }
                                        className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium transition"
                                      >
                                        <Trash2 className="w-4 h-4 inline mr-1" />
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {clinicalImages.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">📸</div>
                          <p className="text-sm">No images uploaded yet</p>
                        </div>
                      )}
                    </div>
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
                              className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg transition ${
                                readOnly
                                  ? "cursor-not-allowed opacity-75"
                                  : "hover:bg-blue-50 cursor-pointer"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  examData[section.id]?.[item.id] || false
                                }
                                onChange={() =>
                                  handleCheckboxChange(section.id, item.id)
                                }
                                disabled={readOnly}
                                className={`w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary ${
                                  readOnly ? "cursor-not-allowed" : ""
                                }`}
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
                      <VoiceInput
                        value={examData[section.id]?.notes || ""}
                        onChange={(e) =>
                          handleNotesChange(section.id, e.target.value)
                        }
                        placeholder="Enter any additional findings..."
                        rows={3}
                        disabled={readOnly}
                      />
                    </div>
                  )}

                  {/* Section Actions (only show in edit mode) */}
                  {!readOnly && section.type !== "images" && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        className="text-sm flex-1 sm:flex-none flex items-center justify-center gap-1"
                        onClick={() => {
                          markSectionComplete(section.id);
                          const nextIndex =
                            entrySections.findIndex(
                              (s) => s.id === section.id
                            ) + 1;
                          if (nextIndex < entrySections.length) {
                            setExpandedSections([
                              entrySections[nextIndex].id,
                            ]);
                          }
                        }}
                      >
                        <CheckCircle className="w-4 h-4" /> Complete & Next
                      </Button>
                      <Button
                        variant="outline"
                        className="text-sm flex-1 sm:flex-none flex items-center justify-center gap-1"
                        onClick={() => {
                          setExamData({
                            ...examData,
                            [section.id]: {},
                          });
                        }}
                      >
                        <RotateCcw className="w-4 h-4" /> Clear Section
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          {!readOnly ? (
            <Button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1">
              <Save className="w-4 h-4" />
              Save Physical Examination
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-1"
              >
                <Printer className="w-4 h-4" /> Print Examination
              </Button>
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Close
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Image Viewer Modal */}
      {showImageViewer && selectedImage && (
        <ImageViewerModal
          image={selectedImage}
          onClose={() => {
            setShowImageViewer(false);
            setSelectedImage(null);
          }}
        />
      )}
    </div>
  );
};

export default PhysicalExamEntry;
