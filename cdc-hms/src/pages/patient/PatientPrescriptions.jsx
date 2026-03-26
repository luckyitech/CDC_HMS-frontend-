import { useState, useEffect, useCallback } from 'react';
import { Pill } from 'lucide-react';
import Card from '../../components/shared/Card';
import cdcLogo from '../../assets/cdc_web_logo1.svg';
import { usePrescriptionContext } from '../../contexts/PrescriptionContext';
import { useUserContext } from '../../contexts/UserContext';

const PrescriptionWithWatermark = ({ children }) => (
  <div className="relative border-4 sm:border-8 border-double" style={{ borderColor: 'rgba(59, 130, 246, 0.15)' }}>
    <div className="absolute top-0 left-0 right-0 h-12 sm:h-16 flex items-center justify-center gap-3 sm:gap-8 pointer-events-none bg-gradient-to-b from-blue-50 to-transparent" style={{ opacity: 0.6 }}>
      <img src={cdcLogo} alt="CDC" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
      <span className="text-xs sm:text-sm font-bold text-blue-600">CDC DIABETES CLINIC</span>
      <img src={cdcLogo} alt="CDC" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 flex items-center justify-center gap-3 sm:gap-8 pointer-events-none bg-gradient-to-t from-blue-50 to-transparent" style={{ opacity: 0.6 }}>
      <span className="text-[10px] sm:text-xs font-semibold text-blue-600">OFFICIAL PRESCRIPTION</span>
      <img src={cdcLogo} alt="CDC" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
      <span className="text-[10px] sm:text-xs font-semibold text-blue-600">CONFIDENTIAL</span>
    </div>
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <div className="transform -rotate-45" style={{ opacity: 0.04 }}>
        <img src={cdcLogo} alt="CDC" className="w-96 h-96 object-contain" />
      </div>
    </div>
    <div className="relative z-10 pt-12 sm:pt-16 pb-12 sm:pb-16">{children}</div>
  </div>
);

const PatientPrescriptions = () => {
  const { currentUser } = useUserContext();
  const { getPrescriptionsByPatient } = usePrescriptionContext();

  const [filter, setFilter] = useState('active');
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPrescriptions = useCallback(async () => {
    if (!currentUser?.uhid) return;
    setLoading(true);
    try {
      const data = await getPrescriptionsByPatient(currentUser.uhid);
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uhid]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (filter === 'active') return rx.status === 'Active';
    if (filter === 'past') return rx.status === 'Completed' || rx.status === 'Cancelled' || rx.status === 'Expired';
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':    return 'bg-green-100 text-green-700 border-green-300';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'Expired':   return 'bg-gray-100 text-gray-700 border-gray-300';
      default:          return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div>
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">My Prescriptions</h2>
        <div className="flex gap-2">
          {['active', 'past', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition text-sm capitalize ${
                filter === f ? 'bg-primary text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> Prescriptions issued by your doctors will appear here.
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your prescriptions...</p>
          </div>
        </Card>
      ) : filteredPrescriptions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Pill className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold text-gray-800 mb-2">
              No {filter === 'all' ? '' : filter} prescriptions
            </p>
            <p className="text-gray-600">
              {filter === 'active'
                ? 'You have no active prescriptions at the moment.'
                : filter === 'past'
                ? 'No past prescriptions found.'
                : 'No prescriptions found.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredPrescriptions.map((rx) => (
            <Card key={rx.id}>
              <PrescriptionWithWatermark>
                {/* Header */}
                <div className="mb-5 pb-5 border-b-2 border-gray-200 px-3 sm:px-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <h3 className="text-base sm:text-xl font-bold text-gray-800">
                      Prescription #{rx.prescriptionNumber}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(rx.status)}`}>
                      {rx.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide">Prescribed by</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">{rx.doctorName || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide">Date</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">{formatDate(rx.date)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide">Diagnosis</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">{rx.diagnosis}</p>
                    </div>
                  </div>
                </div>

                {/* Medications */}
                <div className="space-y-3 px-3 sm:px-0">
                  <h4 className="text-base sm:text-lg font-bold text-gray-800">Medications</h4>
                  {(rx.medications || []).map((med, index) => (
                    <div
                      key={index}
                      className="p-3 sm:p-5 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary transition"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Pill className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <p className="text-sm sm:text-lg font-bold text-gray-800">{med.name}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <p className="text-[10px] text-gray-500 font-semibold uppercase">Dosage</p>
                          <p className="font-semibold text-gray-800 text-xs sm:text-sm">{med.dosage}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <p className="text-[10px] text-gray-500 font-semibold uppercase">Frequency</p>
                          <p className="font-semibold text-gray-800 text-xs sm:text-sm">{med.frequency}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <p className="text-[10px] text-gray-500 font-semibold uppercase">Duration</p>
                          <p className="font-semibold text-gray-800 text-xs sm:text-sm">{med.duration}</p>
                        </div>
                        {med.quantity && (
                          <div className="bg-white rounded-lg p-2 border border-gray-200">
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Quantity</p>
                            <p className="font-semibold text-gray-800 text-xs sm:text-sm">{med.quantity}</p>
                          </div>
                        )}
                      </div>

                      {med.instructions && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Instructions:</p>
                          <p className="text-xs sm:text-sm text-gray-700">{med.instructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Doctor's Notes */}
                {rx.notes && (
                  <div className="mt-4 mx-3 sm:mx-0 p-3 sm:p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Doctor's Notes:</p>
                    <p className="text-xs sm:text-sm text-gray-700">{rx.notes}</p>
                  </div>
                )}
              </PrescriptionWithWatermark>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card title="Need Help?" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-bold text-gray-800 mb-2">Pharmacy Questions</p>
            <p className="text-gray-600">
              Contact your pharmacy directly for questions about medication availability, pricing, or insurance coverage.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-bold text-gray-800 mb-2">Medical Questions</p>
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
