const TreatmentPlanPrint = ({ plan, patient, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header - Hide on print */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 flex justify-between items-center print:hidden">
          <h3 className="text-2xl font-bold text-gray-800">Treatment Plan</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Print Content */}
        <div className="p-8">
          {/* Hospital Header */}
          <div className="text-center mb-8 border-b-2 border-primary pb-4">
            <h1 className="text-3xl font-bold text-primary">
              CDC DIABETES CLINIC
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Comprehensive Diabetes Centre • Excellence in Diabetes Care
            </p>
            <p className="text-sm text-gray-600">
              Tel: +254 700 000 000 • Email: info@cdc-diabetes.com
            </p>
          </div>

          {/* Document Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">TREATMENT PLAN</h2>
            <p className="text-sm text-gray-600 mt-1">
              Date:{" "}
              {new Date(plan.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              • {plan.time}
            </p>
          </div>

          {/* Patient Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              PATIENT INFORMATION
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name:</p>
                <p className="font-semibold">{patient.name}</p>
              </div>
              <div>
                <p className="text-gray-600">UHID:</p>
                <p className="font-semibold">{patient.uhid}</p>
              </div>
              <div>
                <p className="text-gray-600">Age / Gender:</p>
                <p className="font-semibold">
                  {patient.age} years • {patient.gender}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Diabetes Type:</p>
                <p className="font-semibold">{patient.diabetesType}</p>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2">DIAGNOSIS</h3>
            <p className="text-gray-800 p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
              {plan.diagnosis}
            </p>
          </div>

          {/* Treatment Plan */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              TREATMENT PLAN
            </h3>
            <div className="p-4 bg-gray-50 rounded border-l-4 border-primary">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {plan.plan}
              </pre>
            </div>
          </div>

          {/* 
            NOTE: Consultation notes are NOT printed on patient copies.
            Doctor's notes remain in the medical record for healthcare 
            provider reference only. This protects patient privacy and 
            maintains appropriate boundaries in patient-provider communication.
          */}

          {/* Doctor Information */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              TREATING PHYSICIAN
            </h3>
            <p className="text-gray-800 font-semibold">{plan.doctorName}</p>
            <p className="text-sm text-gray-600 mt-1">Diabetes Specialist</p>
          </div>

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t-2 border-gray-300">
            <div>
              <div className="border-t-2 border-gray-400 pt-2">
                <p className="text-sm font-semibold">Doctor's Signature</p>
                <p className="text-xs text-gray-600 mt-1">{plan.doctorName}</p>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-gray-400 pt-2">
                <p className="text-sm font-semibold">Date</p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(plan.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-4 border-t border-gray-300">
            <p className="text-xs text-gray-500">
              This treatment plan is confidential and intended for the patient
              named above.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              CDC Diabetes Clinic • Nairobi, Kenya
            </p>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            div[class*="fixed inset-0"] {
              position: static !important;
              background: white !important;
            }
            div[class*="fixed inset-0"] > div {
              max-height: none !important;
              box-shadow: none !important;
            }
            div[class*="fixed inset-0"] * {
              visibility: visible;
            }
            @page {
              margin: 1cm;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default TreatmentPlanPrint;