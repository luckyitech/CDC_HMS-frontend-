import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import cdcLogo from "../../assets/cdc_web_logo1.svg";
import { useState } from "react";
import ImageViewerModal from "../../components/doctor/ImageViewerModal";
import {
  physicalExamSections,
  generateFindingsProse,
} from "./physicalExamData";
import {
  Eye,
  Printer,
  ArrowLeft,
  Camera,
  Edit,
  Activity,
  ClipboardList,
  Heart,
  Wind,
  Circle,
  Brain,
  Bone,
  Footprints,
} from "lucide-react";

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

const PhysicalExamFindings = ({
  examinationData,
  onEdit,
  onPrint,
  onClose,
}) => {
  const { uhid, patientName, doctorName, date, time, data, clinicalImages } =
    examinationData;

  // State for image viewer
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Generate findings for each section
  const generateAllFindings = () => {
    const findings = [];

    physicalExamSections.forEach((section) => {
      // Skip clinical images section (handled separately)
      if (section.id === "clinicalImages") return;

      if (data[section.id]) {
        const prose = generateFindingsProse(section.id, data[section.id]);
        if (prose) {
          findings.push({
            icon: section.icon,
            title: section.title,
            findings: prose,
          });
        }
      }
    });

    return findings;
  };

  const allFindings = generateAllFindings();

  // Handle image view
  const handleImageView = (image) => {
    setSelectedImage(image);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-6 px-2">
      {/* Header - Screen View */}
      <Card className="bg-blue-50 print:hidden">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Physical Examination Summary
            </h2>
            <p className="text-gray-600 mt-2">
              <span className="font-semibold">{patientName}</span> ({uhid})
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Date: {date} • Time: {time} • {doctorName}
            </p>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" onClick={onEdit} className="text-sm">
                <Edit className="w-4 h-4 inline mr-1" />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={onPrint} className="text-sm">
              <Printer className="w-4 h-4 inline mr-1" />
              Print
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="text-sm">
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block">
        {/* Hospital Header - Logo on RIGHT only */}
        <div className="mb-6 pb-4 border-b-2 border-primary">
          <div className="flex items-center justify-between">
            {/* Left side - Clinic Name */}
            <div className="flex-1 px-4">
              <h1 className="text-3xl font-bold text-primary">
                CDC DIABETES CLINIC
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive Diabetes Centre • Excellence in Diabetes Care
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Tel: +254 700 000 000 • Email: info@cdc-diabetes.com
              </p>
            </div>

            {/* Right side - Logo ONLY */}
            <div>
              <img
                src={cdcLogo}
                alt="CDC Logo"
                className="w-40 h-40 object-contain py-4"
              />
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 uppercase">
            Physical Examination Summary
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Date: {date} • Time: {time}
          </p>
        </div>

        {/* Patient Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase">
            Patient Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Patient Name:</span>
              <span className="font-semibold text-gray-800 ml-2">
                {patientName}
              </span>
            </div>
            <div>
              <span className="text-gray-600">UHID:</span>
              <span className="font-semibold text-gray-800 ml-2">{uhid}</span>
            </div>
            <div>
              <span className="text-gray-600">Examined by:</span>
              <span className="font-semibold text-gray-800 ml-2">
                {doctorName}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <span className="font-semibold text-gray-800 ml-2">{date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Findings Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left px-6 py-4 font-bold text-gray-700 w-1/4">
                  Examination Category
                </th>
                <th className="text-left px-6 py-4 font-bold text-gray-700">
                  Findings
                </th>
              </tr>
            </thead>
            <tbody>
              {allFindings.map((finding, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getIconComponent(finding.icon);
                        return (
                          <IconComponent className="w-5 h-5 text-primary" />
                        );
                      })()}
                      <span className="font-semibold text-gray-800">
                        {finding.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700 leading-relaxed">
                      {finding.findings}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allFindings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No examination findings recorded.
            </p>
          </div>
        )}
      </Card>

      {/* Clinical Images Section */}
      {clinicalImages && clinicalImages.length > 0 && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b-2 border-gray-200">
              <Camera className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-gray-800">
                Clinical Images
              </h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                {clinicalImages.length}{" "}
                {clinicalImages.length === 1 ? "Image" : "Images"}
              </span>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinicalImages.map((image, index) => (
                <div
                  key={image.id || index}
                  className="border-2 border-gray-200 rounded-lg p-3 hover:border-primary transition print:break-inside-avoid"
                >
                  {/* Image Preview */}
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                    <img
                      src={image.file}
                      alt={image.caption || `Clinical image ${index + 1}`}
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
                      {new Date(image.timestamp).toLocaleDateString()} •{" "}
                      {new Date(image.timestamp).toLocaleTimeString()}
                    </p>

                    {/* Action Button (Hide in print) */}
                    <div className="print:hidden">
                      <button
                        onClick={() => handleImageView(image)}
                        className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        View Full Size
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Signature Section */}
      <Card>
        <div className="flex justify-between items-end pt-8 border-t-2 border-gray-300 border-spacing-2">
          <div>
            <p className="text-sm text-gray-600 mb-1">Examined by:</p>
            <div className="border-b-2 border-gray-400 w-64 h-12 mb-2"></div>
            <p className="text-sm font-semibold text-gray-800">{doctorName}</p>
            <p className="text-xs text-gray-600">Diabetes Specialist</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              This is a computer-generated report
            </p>
            <p className="text-xs text-gray-500 ">
              CDC Diabetes Clinic • Nairobi, Kenya
            </p>
          </div>
        </div>
      </Card>

      {/* Print Styles - UPDATED TO REMOVE BROWSER HEADERS */}
      <style>{`
        @media print {
          /* CRITICAL: Remove browser default headers/footers */
          @page {
            margin: 0;
            size: auto;
          }
          
          body {
            margin: 1.6cm;
          }
          
          /* Hide everything except print content */
          body * {
            visibility: hidden;
          }
          
          /* Show only the print content */
          .space-y-6, .space-y-6 * {
            visibility: visible;
          }
          
          /* Hide buttons */
          button {
            display: none !important;
          }
          
          /* Ensure proper layout */
          .space-y-6 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Remove background colors for printing */
          .bg-blue-50, .bg-gray-50, .bg-blue-100 {
            background-color: white !important;
          }
          
          /* Ensure borders print */
          .border-2, .border-b-2 {
            border-color: #333 !important;
          }
          
          /* Images print properly */
          img {
            page-break-inside: avoid;
            max-width: 100%;
          }
          
          /* Prevent page breaks inside image cards */
          .print\\:break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>

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

export default PhysicalExamFindings;
