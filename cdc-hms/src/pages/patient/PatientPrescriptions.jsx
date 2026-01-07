import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';

const PatientPrescriptions = () => {
  const [filter, setFilter] = useState('active');

  // MOCK DATA - This will come from backend API in Phase 3
  // When doctor creates prescription, it will be stored in database
  // and fetched here via: GET /api/prescriptions?patient_id=CDC001
  const [prescriptions] = useState([
    {
      id: 1,
      prescriptionNumber: 'RX-2024-001',
      prescribedDate: '2024-11-15',
      prescribedBy: 'Dr. Ahmed Hassan',
      specialty: 'Endocrinologist',
      status: 'Active',
      diagnosis: 'Type 2 Diabetes Mellitus',
      medications: [
        {
          name: 'Metformin',
          genericName: 'Metformin Hydrochloride',
          dosage: '500mg',
          frequency: 'Twice daily (Morning & Evening)',
          duration: 'Ongoing',
          instructions: 'Take with meals to reduce stomach upset. Do not crush or chew.',
          quantity: '60 tablets',
          refillsRemaining: 3,
          startDate: '2024-11-15',
        },
        {
          name: 'Glimepiride',
          genericName: 'Glimepiride',
          dosage: '2mg',
          frequency: 'Once daily (Morning)',
          duration: 'Ongoing',
          instructions: 'Take 30 minutes before breakfast with a full glass of water.',
          quantity: '30 tablets',
          refillsRemaining: 2,
          startDate: '2024-11-15',
        },
      ],
      notes: 'Continue monitoring blood sugar levels. Return for follow-up in 4 weeks.',
    },
    {
      id: 2,
      prescriptionNumber: 'RX-2024-002',
      prescribedDate: '2024-10-10',
      prescribedBy: 'Dr. Sarah Kamau',
      specialty: 'Cardiologist',
      status: 'Active',
      diagnosis: 'Hyperlipidemia',
      medications: [
        {
          name: 'Atorvastatin',
          genericName: 'Atorvastatin Calcium',
          dosage: '20mg',
          frequency: 'Once daily (Evening)',
          duration: 'Ongoing',
          instructions: 'Take in the evening with or without food. Avoid grapefruit juice.',
          quantity: '30 tablets',
          refillsRemaining: 5,
          startDate: '2024-10-10',
        },
      ],
      notes: 'Lipid panel to be done after 3 months.',
    },
    {
      id: 3,
      prescriptionNumber: 'RX-2024-003',
      prescribedDate: '2024-08-20',
      prescribedBy: 'Dr. Ahmed Hassan',
      specialty: 'Endocrinologist',
      status: 'Completed',
      diagnosis: 'Upper Respiratory Tract Infection',
      medications: [
        {
          name: 'Amoxicillin',
          genericName: 'Amoxicillin Trihydrate',
          dosage: '500mg',
          frequency: 'Three times daily',
          duration: '7 days',
          instructions: 'Complete full course even if feeling better. Take with food.',
          quantity: '21 capsules',
          refillsRemaining: 0,
          startDate: '2024-08-20',
          endDate: '2024-08-27',
        },
      ],
      notes: 'Course completed. No further action needed.',
    },
  ]);

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (filter === 'active') return rx.status === 'Active';
    if (filter === 'past') return rx.status === 'Completed' || rx.status === 'Expired';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Completed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Expired':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">My Prescriptions</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base ${
              filter === 'active'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base ${
              filter === 'past'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base ${
              filter === 'all'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
        <p className="text-sm text-gray-700">
          <strong>ℹ️ Note:</strong> All prescriptions issued by your doctors will appear here. 
          You can download, print, or share them with your pharmacy.
        </p>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-6">
        {filteredPrescriptions.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-6xl mb-4">💊</p>
              <p className="text-xl font-semibold text-gray-800 mb-2">No {filter} prescriptions</p>
              <p className="text-gray-600">
                {filter === 'active' 
                  ? 'You have no active prescriptions at the moment.'
                  : 'No past prescriptions found.'}
              </p>
            </div>
          </Card>
        ) : (
          filteredPrescriptions.map((prescription) => (
            <Card key={prescription.id}>
              {/* Prescription Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-6 border-b-2 border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      Prescription #{prescription.prescriptionNumber}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(prescription.status)}`}>
                      {prescription.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <strong>Prescribed by:</strong> {prescription.prescribedBy} ({prescription.specialty})
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(prescription.prescribedDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p>
                      <strong>Diagnosis:</strong> {prescription.diagnosis}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="text-sm py-2 px-4">
                    📄 View Full
                  </Button>
                  <Button variant="outline" className="text-sm py-2 px-4">
                    📥 Download
                  </Button>
                  <Button variant="outline" className="text-sm py-2 px-4">
                    🖨️ Print
                  </Button>
                </div>
              </div>

              {/* Medications */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-800 mb-4">💊 Medications</h4>

                {prescription.medications.map((med, index) => (
                  <div
                    key={index}
                    className="p-4 sm:p-6 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-3xl">💊</span>
                          <div>
                            <p className="text-lg font-bold text-gray-800">{med.name}</p>
                            <p className="text-sm text-gray-600 italic">{med.genericName}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <strong>Dosage:</strong> {med.dosage}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <strong>Frequency:</strong> {med.frequency}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <strong>Duration:</strong> {med.duration}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <strong>Quantity:</strong> {med.quantity}
                            </p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-gray-600">
                              <strong>Refills:</strong>{' '}
                              <span className={med.refillsRemaining > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {med.refillsRemaining > 0 ? `${med.refillsRemaining} remaining` : 'No refills'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <p className="text-xs font-semibold text-gray-700 mb-1">📋 Instructions:</p>
                          <p className="text-sm text-gray-700">{med.instructions}</p>
                        </div>
                      </div>

                      {med.refillsRemaining > 0 && prescription.status === 'Active' && (
                        <Button variant="outline" className="text-xs py-2 px-3 whitespace-nowrap">
                          Request Refill
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Doctor's Notes */}
              {prescription.notes && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-xs font-semibold text-gray-700 mb-1">📝 Doctor's Notes:</p>
                  <p className="text-sm text-gray-700">{prescription.notes}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Help Section */}
      <Card title="❓ Need Help?" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-bold text-gray-800 mb-2">📞 Pharmacy Questions</p>
            <p className="text-gray-600">
              Contact your pharmacy directly for questions about medication availability, pricing, or insurance coverage.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-bold text-gray-800 mb-2">💬 Medical Questions</p>
            <p className="text-gray-600">
              Contact your doctor's office if you have questions about your medications, dosage, or side effects.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PatientPrescriptions;