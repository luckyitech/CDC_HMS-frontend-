import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import {
  physicalExamSections,
  generateFindingsProse,
} from "./physicalExamData";

const PhysicalExamFindings = ({
  examinationData,
  onEdit,
  onPrint,
  onClose,
}) => {
  const { uhid, patientName, doctorName, date, time, data } = examinationData;

  // Generate findings for each section
  const generateAllFindings = () => {
    const findings = [];

    physicalExamSections.forEach((section) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-blue-50">
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
            <Button variant="outline" onClick={onEdit} className="text-sm">
              ✏️ Edit
            </Button>
            <Button variant="outline" onClick={onPrint} className="text-sm">
              🖨️ Print
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="text-sm">
                ← Back
              </Button>
            )}
          </div>
        </div>
      </Card>

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
                <th className="text-center px-6 py-4 font-bold text-gray-700 w-24">
                  Image
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
                      <span className="text-2xl">{finding.icon}</span>
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
                  <td className="px-6 py-4 align-top text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mx-auto">
                      <span className="text-3xl">{finding.icon}</span>
                    </div>
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

      {/* Signature Section */}
      <Card>
        <div className="flex justify-between items-end pt-8 border-t-2 border-gray-300">
          <div>
            <p className="text-sm text-gray-600 mb-1">Examined by:</p>
            <div className="border-b-2 border-gray-400 w-64 h-12 mb-2"></div>
            <p className="text-sm font-semibold text-gray-800">{doctorName}</p>
            <p className="text-xs text-gray-600">Endocrinologist</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              This is a computer-generated report
            </p>
            <p className="text-xs text-gray-500">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PhysicalExamFindings;
