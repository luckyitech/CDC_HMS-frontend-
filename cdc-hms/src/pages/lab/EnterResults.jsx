import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useNavigate } from 'react-router-dom';
import { useLabContext } from '../../contexts/LabContext';
import { useUserContext } from '../../contexts/UserContext';

const EnterResults = () => {
  const navigate = useNavigate();
  const { getPendingTests, addLabTest, removePendingTest } = useLabContext();
  const { currentUser } = useUserContext();
  
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedTest, setSelectedTest] = useState('');

  // Get pending tests from context
  const pendingPatients = getPendingTests();

  // Test templates with fields and normal ranges
  const testTemplates = {
    'HbA1c': {
      fields: [
        { name: 'hba1c', label: 'HbA1c', unit: '%', normalRange: '<7.0%', type: 'number' },
      ],
    },
    'Fasting Glucose': {
      fields: [
        { name: 'fastingGlucose', label: 'Fasting Glucose', unit: 'mg/dL', normalRange: '70-100 mg/dL', type: 'number' },
      ],
    },
    'Random Glucose': {
      fields: [
        { name: 'randomGlucose', label: 'Random Glucose', unit: 'mg/dL', normalRange: '<140 mg/dL', type: 'number' },
      ],
    },
    'Lipid Profile': {
      fields: [
        { name: 'totalCholesterol', label: 'Total Cholesterol', unit: 'mg/dL', normalRange: '<200 mg/dL', type: 'number' },
        { name: 'ldl', label: 'LDL Cholesterol', unit: 'mg/dL', normalRange: '<100 mg/dL', type: 'number' },
        { name: 'hdl', label: 'HDL Cholesterol', unit: 'mg/dL', normalRange: '>40 mg/dL (M), >50 mg/dL (F)', type: 'number' },
        { name: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', normalRange: '<150 mg/dL', type: 'number' },
      ],
    },
    'Kidney Function': {
      fields: [
        { name: 'creatinine', label: 'Creatinine', unit: 'mg/dL', normalRange: '0.6-1.2 mg/dL', type: 'number' },
        { name: 'bun', label: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', normalRange: '7-20 mg/dL', type: 'number' },
        { name: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', normalRange: '>60', type: 'number' },
        { name: 'uricAcid', label: 'Uric Acid', unit: 'mg/dL', normalRange: '3.5-7.2 mg/dL', type: 'number' },
      ],
    },
    'Liver Function': {
      fields: [
        { name: 'alt', label: 'ALT (SGPT)', unit: 'U/L', normalRange: '7-56 U/L', type: 'number' },
        { name: 'ast', label: 'AST (SGOT)', unit: 'U/L', normalRange: '10-40 U/L', type: 'number' },
        { name: 'alp', label: 'Alkaline Phosphatase', unit: 'U/L', normalRange: '44-147 U/L', type: 'number' },
        { name: 'bilirubin', label: 'Total Bilirubin', unit: 'mg/dL', normalRange: '0.1-1.2 mg/dL', type: 'number' },
        { name: 'albumin', label: 'Albumin', unit: 'g/dL', normalRange: '3.5-5.5 g/dL', type: 'number' },
      ],
    },
    'Thyroid Function': {
      fields: [
        { name: 'tsh', label: 'TSH', unit: 'mIU/L', normalRange: '0.4-4.0 mIU/L', type: 'number' },
        { name: 't3', label: 'T3', unit: 'ng/dL', normalRange: '80-200 ng/dL', type: 'number' },
        { name: 't4', label: 'T4', unit: 'µg/dL', normalRange: '5-12 µg/dL', type: 'number' },
      ],
    },
    'Urine Analysis': {
      fields: [
        { name: 'color', label: 'Color', unit: '', normalRange: 'Pale yellow to amber', type: 'text' },
        { name: 'appearance', label: 'Appearance', unit: '', normalRange: 'Clear', type: 'text' },
        { name: 'ph', label: 'pH', unit: '', normalRange: '4.5-8.0', type: 'number' },
        { name: 'specificGravity', label: 'Specific Gravity', unit: '', normalRange: '1.005-1.030', type: 'number' },
        { name: 'protein', label: 'Protein', unit: '', normalRange: 'Negative', type: 'text' },
        { name: 'glucose', label: 'Glucose', unit: '', normalRange: 'Negative', type: 'text' },
        { name: 'ketones', label: 'Ketones', unit: '', normalRange: 'Negative', type: 'text' },
      ],
    },
  };

  const [testResults, setTestResults] = useState({});
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [flagAsCritical, setFlagAsCritical] = useState(false);

  const handleResultChange = (fieldName, value) => {
    setTestResults({ ...testResults, [fieldName]: value });
  };

  // Determine interpretation based on test type and results
  const determineInterpretation = (testType, results) => {
    if (flagAsCritical) return 'Critical';
    
    // Add logic to determine Normal/Abnormal based on ranges
    // For now, simple logic
    if (testType === 'HbA1c') {
      const value = parseFloat(results.hba1c);
      if (value < 7.0) return 'Normal';
      if (value >= 7.0 && value < 9.0) return 'Abnormal';
      return 'Critical';
    }
    
    if (testType === 'Fasting Glucose') {
      const value = parseFloat(results.fastingGlucose);
      if (value >= 70 && value <= 100) return 'Normal';
      if (value > 100 && value < 200) return 'Abnormal';
      return 'Critical';
    }
    
    // Default to Normal if not flagged
    return 'Normal';
  };

  const handleSubmit = () => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }

    const template = testTemplates[selectedTest];
    const allFieldsFilled = template.fields.every(field => testResults[field.name]);

    if (!allFieldsFilled) {
      alert('Please fill in all test fields');
      return;
    }

    const interpretation = determineInterpretation(selectedTest, testResults);

    // Save to LabContext
    const savedTest = addLabTest({
      uhid: selectedPatient.uhid,
      patientName: selectedPatient.patientName,
      testType: selectedTest,
      sampleType: selectedPatient.sampleType,
      orderedBy: selectedPatient.orderedBy,
      orderedDate: selectedPatient.orderedDate,
      orderedTime: selectedPatient.orderedTime,
      completedBy: currentUser?.name || 'Tech. Sarah Mwangi',
      priority: selectedPatient.priority,
      results: testResults,
      normalRange: template.fields.map(f => `${f.label}: ${f.normalRange}`).join(', '),
      interpretation: interpretation,
      isCritical: flagAsCritical || interpretation === 'Critical',
      technicianNotes: technicianNotes,
    });

    // Remove from pending
    removePendingTest(selectedPatient.id);

    // Show success message
    const successDiv = document.createElement('div');
    successDiv.className =
      'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce';
    successDiv.innerHTML = `✅ Test results saved successfully for ${selectedPatient.patientName}!`;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
    
    // Reset form
    setSelectedPatient(null);
    setSelectedTest('');
    setTestResults({});
    setTechnicianNotes('');
    setFlagAsCritical(false);
  };

  const selectedTemplate = selectedTest ? testTemplates[selectedTest] : null;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Enter Test Results</h2>
        <Button variant="outline" onClick={() => navigate('/lab/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection */}
        <div className="lg:col-span-1">
          <Card title="👥 Select Patient">
            <div className="space-y-3">
              {pendingPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatient(patient);
                    setSelectedTest(patient.testType);
                    setTestResults({});
                  }}
                  className={`w-full text-left p-4 border-2 rounded-lg transition hover:shadow-md ${
                    selectedPatient?.id === patient.id
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-primary'
                  }`}
                >
                  <p className="font-bold text-gray-800">{patient.patientName}</p>
                  <p className="text-sm text-primary font-semibold">{patient.uhid}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {patient.age}y • {patient.gender}
                  </p>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Test Ordered:</p>
                    <p className="text-sm font-semibold text-gray-800">{patient.testType}</p>
                  </div>
                </button>
              ))}

              {pendingPatients.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">🔭</p>
                  <p className="text-sm text-gray-500">No pending tests</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Test Results Form */}
        <div className="lg:col-span-2">
          {!selectedPatient ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-6xl mb-4">👈</p>
                <p className="text-xl font-bold text-gray-800 mb-2">Select a Patient</p>
                <p className="text-gray-600">Choose a patient from the list to enter test results</p>
              </div>
            </Card>
          ) : (
            <Card title={`🔬 ${selectedTest} - ${selectedPatient.patientName}`}>
              {/* Patient Info Summary */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">UHID</p>
                    <p className="font-bold text-gray-800">{selectedPatient.uhid}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Age</p>
                    <p className="font-bold text-gray-800">{selectedPatient.age} years</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Gender</p>
                    <p className="font-bold text-gray-800">{selectedPatient.gender}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Test</p>
                    <p className="font-bold text-gray-800">{selectedTest}</p>
                  </div>
                </div>
              </div>

              {/* Test Fields */}
              {selectedTemplate && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTemplate.fields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {field.label}
                          {field.unit && <span className="text-gray-500 ml-1">({field.unit})</span>}
                        </label>
                        <input
                          type={field.type}
                          value={testResults[field.name] || ''}
                          onChange={(e) => handleResultChange(field.name, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary text-lg font-semibold"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Normal Range: <span className="font-semibold text-green-600">{field.normalRange}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Technician Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Technician Notes (Optional)
                    </label>
                    <textarea
                      value={technicianNotes}
                      onChange={(e) => setTechnicianNotes(e.target.value)}
                      placeholder="Add any observations, quality control notes, or remarks..."
                      rows="4"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Flag as Critical */}
                  <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flagAsCritical}
                        onChange={(e) => setFlagAsCritical(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-red-700">🚨 Flag as Critical Result</p>
                        <p className="text-sm text-gray-700 mt-1">
                          Check this box if the results are abnormal and require immediate doctor attention. 
                          The doctor will be notified immediately.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSelectedTest('');
                        setTestResults({});
                        setTechnicianNotes('');
                        setFlagAsCritical(false);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      ✓ Save Results & Submit
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Reference Guide */}
          {selectedPatient && (
            <Card title="📚 Quick Reference Guide" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="font-bold text-gray-800 mb-1">✅ Normal Results</p>
                  <p className="text-gray-600">Values within the reference range. Routine reporting.</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <p className="font-bold text-gray-800 mb-1">⚠️ Borderline Results</p>
                  <p className="text-gray-600">Values slightly outside normal range. Doctor review recommended.</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <p className="font-bold text-gray-800 mb-1">🚨 Critical Results</p>
                  <p className="text-gray-600">Significantly abnormal values requiring immediate attention.</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="font-bold text-gray-800 mb-1">🔍 Quality Control</p>
                  <p className="text-gray-600">Always verify calibration before entering results.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnterResults;