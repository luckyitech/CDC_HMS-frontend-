import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, CalendarDays, Clock, UserSquare2, X,
  User, Stethoscope, Calendar, BarChart2, FlaskConical, Pill, Bell,
  Phone, Mail,
} from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useAppointmentContext } from '../../contexts/AppointmentContext';
import { useUserContext } from '../../contexts/UserContext';
import { usePatientContext } from '../../contexts/PatientContext';
import { usePrescriptionContext } from '../../contexts/PrescriptionContext';
import { useLabContext } from '../../contexts/LabContext';

const MyProfile = () => {
  const { currentUser } = useUserContext();
  const { fetchPatientByUHID } = usePatientContext();
  const { getPatientAppointments, cancelAppointment } = useAppointmentContext();
  const { getActivePrescriptions, getPrescriptionsByPatient } = usePrescriptionContext();
  const { getTestsByPatient } = useLabContext();

  const uhid = currentUser?.uhid;

  const [activeTab, setActiveTab] = useState('profile');

  // Patient profile data
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);

  // Appointments
  const [appointments, setAppointments] = useState([]);
  const [aptsLoading, setAptsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Medical tab — active prescriptions (medications list)
  const [activeMeds, setActiveMeds] = useState([]);
  const [medsLoading, setMedsLoading] = useState(false);

  // Lab tab
  const [labTests, setLabTests] = useState([]);
  const [labLoading, setLabLoading] = useState(false);

  // Prescriptions tab
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescLoading, setPrescLoading] = useState(false);

  // Load patient profile on mount
  useEffect(() => {
    if (!uhid) return;
    setPatientLoading(true);
    fetchPatientByUHID(uhid).then(data => {
      setPatient(data);
      setPatientLoading(false);
    });
  }, [uhid, fetchPatientByUHID]);

  // Lazy-load per tab
  const loadAppointments = useCallback(async () => {
    if (!uhid) return;
    setAptsLoading(true);
    try {
      const data = await getPatientAppointments(uhid);
      setAppointments(Array.isArray(data) ? data : []);
    } finally {
      setAptsLoading(false);
    }
  }, [uhid, getPatientAppointments]);

  const loadActiveMeds = useCallback(async () => {
    if (!uhid) return;
    setMedsLoading(true);
    try {
      const data = await getActivePrescriptions(uhid);
      setActiveMeds(Array.isArray(data) ? data : []);
    } finally {
      setMedsLoading(false);
    }
  }, [uhid, getActivePrescriptions]);

  const loadLabTests = useCallback(async () => {
    if (!uhid) return;
    setLabLoading(true);
    try {
      const data = await getTestsByPatient(uhid);
      setLabTests(Array.isArray(data) ? data : []);
    } finally {
      setLabLoading(false);
    }
  }, [uhid, getTestsByPatient]);

  const loadPrescriptions = useCallback(async () => {
    if (!uhid) return;
    setPrescLoading(true);
    try {
      const data = await getPrescriptionsByPatient(uhid);
      setPrescriptions(Array.isArray(data) ? data : []);
    } finally {
      setPrescLoading(false);
    }
  }, [uhid, getPrescriptionsByPatient]);

  useEffect(() => {
    if (activeTab === 'appointments') loadAppointments();
    if (activeTab === 'medical' && activeMeds.length === 0) loadActiveMeds();
    if (activeTab === 'lab' && labTests.length === 0) loadLabTests();
    if (activeTab === 'prescriptions' && prescriptions.length === 0) loadPrescriptions();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (appointmentId) => {
    setCancellingId(appointmentId);
    await cancelAppointment(appointmentId);
    await loadAppointments();
    setCancellingId(null);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingAppointments = appointments
    .filter(a => (a.status === 'scheduled' || a.status === 'checked-in') && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastAppointments = appointments
    .filter(a => a.status === 'completed' || a.status === 'cancelled' || a.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Format date string "YYYY-MM-DD" or ISO → "Jan 1, 2025"
  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('T')[0].split('-');
    return new Date(Number(y), Number(m) - 1, Number(d))
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Flatten all medication items from a list of prescriptions
  const getMedItems = (prescList) => {
    const items = [];
    prescList.forEach(presc => {
      (presc.medications || []).forEach(med => {
        items.push({ ...med, doctorName: presc.doctorName, prescribedDate: presc.prescribedDate || presc.createdAt });
      });
    });
    return items;
  };

  const tabs = [
    { key: 'profile',       label: 'My Profile',    Icon: User },
    { key: 'medical',       label: 'Medical Info',  Icon: Stethoscope },
    { key: 'appointments',  label: 'Appointments',  Icon: Calendar },
    { key: 'monitoring',    label: 'Monitoring',    Icon: BarChart2 },
    { key: 'lab',           label: 'Lab Reports',   Icon: FlaskConical },
    { key: 'prescriptions', label: 'Prescriptions', Icon: Pill },
    { key: 'notifications', label: 'Notifications', Icon: Bell },
  ];

  const displayName = patient?.name || currentUser?.name || '—';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">My Profile</h2>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-lg font-semibold transition whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <tab.Icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {patientLoading ? (
            <Card>
              <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading profile...</span>
              </div>
            </Card>
          ) : (
            <>
              <Card title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-800">{displayName}</p>
                      <p className="text-sm text-gray-600">UHID: {uhid || '—'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input type="text" value={displayName} disabled readOnly className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                    <input type="text" value={fmtDate(patient?.dateOfBirth || patient?.dob)} disabled readOnly className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                    <input type="text" value={patient?.gender || '—'} disabled readOnly className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                    <input type="text" value={patient?.age ? `${patient.age} years` : '—'} disabled readOnly className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input type="tel" defaultValue={patient?.phone || ''} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input type="email" defaultValue={patient?.email || currentUser?.email || ''} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Address</label>
                    <textarea defaultValue={patient?.address || ''} rows="2" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </Card>

              <Card title="Emergency Contact">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                    <input type="text" defaultValue={patient?.emergencyContact?.name || ''} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
                    <input type="text" defaultValue={patient?.emergencyContact?.relationship || ''} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input type="tel" defaultValue={patient?.emergencyContact?.phone || ''} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </Card>

              <Card title="Insurance & Payment">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance Provider</label>
                    <input type="text" defaultValue={patient?.insurance?.provider || ''} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Policy Number</label>
                    <input type="text" defaultValue={patient?.insurance?.policyNumber || ''} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type</label>
                    <input type="text" value={patient?.insurance?.type || '—'} disabled readOnly className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── MEDICAL TAB ── */}
      {activeTab === 'medical' && (
        <div className="space-y-6">
          {patientLoading ? (
            <Card>
              <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading medical info...</span>
              </div>
            </Card>
          ) : (
            <>
              <Card title="Diabetes Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Diabetes Type</label>
                    <input type="text" value={patient?.diabetesType || '—'} disabled readOnly className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis Date</label>
                    <input type="text" value={fmtDate(patient?.diagnosisDate)} disabled readOnly className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Known Allergies</label>
                    <textarea value={patient?.allergies || 'None reported'} disabled readOnly rows="2" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
                  </div>
                </div>
              </Card>

              <Card title="Current Medications">
                {medsLoading ? (
                  <div className="flex items-center gap-3 py-8 justify-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading medications...</span>
                  </div>
                ) : getMedItems(activeMeds).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No active medications on record.</p>
                ) : (
                  <div className="space-y-4">
                    {getMedItems(activeMeds).map((med, index) => (
                      <div key={index} className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-lg font-bold text-gray-800">{med.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-semibold">Dosage:</span> {med.dosage} &middot;{' '}
                              <span className="font-semibold">Frequency:</span> {med.frequency}
                            </p>
                            {med.duration && (
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="font-semibold">Duration:</span> {med.duration}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Prescribed by: {med.doctorName || '—'} · Started: {fmtDate(med.prescribedDate)}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold self-start">Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Your Healthcare Team">
                {patient?.primaryDoctor ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-lg font-bold text-gray-800">{patient.primaryDoctor}</p>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Primary</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Diabetes Specialist</p>
                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3" />
                          <span>Contact clinic for details</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          <span>Contact clinic for details</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-8">No primary doctor assigned yet.</p>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── APPOINTMENTS TAB ── */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {aptsLoading ? (
            <Card>
              <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading appointments...</span>
              </div>
            </Card>
          ) : (
            <>
              <Card title="Upcoming Appointments">
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-10">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No upcoming appointments</p>
                    <p className="text-sm text-gray-400 mt-1">Use "Book Appointment" to schedule one</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.map((apt) => (
                      <div key={apt.id} className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CalendarDays className="w-4 h-4 text-blue-500" />
                              <p className="font-bold text-gray-800">
                                {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-US', {
                                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1 ml-6">
                              <Clock className="w-3 h-3" />
                              <span>{apt.timeSlot}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 ml-6">
                              <UserSquare2 className="w-3 h-3" />
                              <span>{apt.doctorName} · <span className="capitalize">{apt.appointmentType?.replace('-', ' ')}</span></span>
                            </div>
                            {apt.reason && (
                              <p className="text-xs text-gray-500 mt-1 ml-6">
                                <strong>Reason:</strong> {apt.reason}
                              </p>
                            )}
                            <div className="mt-2 ml-6">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                apt.status === 'checked-in' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {apt.status === 'checked-in' ? 'Checked In' : 'Scheduled'}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="text-sm text-red-600 border-red-300 hover:bg-red-50 flex items-center gap-1"
                            onClick={() => handleCancel(apt.id)}
                            disabled={cancellingId === apt.id || apt.status === 'checked-in'}
                          >
                            {cancellingId === apt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Past Appointments">
                {pastAppointments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No past appointments</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Doctor</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {pastAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-3 text-sm">{apt.timeSlot}</td>
                            <td className="px-4 py-3 text-sm font-medium">{apt.doctorName}</td>
                            <td className="px-4 py-3 text-sm capitalize">{apt.appointmentType?.replace('-', ' ')}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                                apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{apt.reason || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── MONITORING TAB ── */}
      {activeTab === 'monitoring' && (
        <Card title="Blood Sugar Monitoring History">
          <div className="text-center py-12">
            <BarChart2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-bold text-gray-800 mb-2">Your monitoring data is in the "View Trends" page</p>
            <p className="text-gray-600 mb-6">View your complete blood sugar history, trends, and statistics</p>
            <Button onClick={() => window.location.href = '/patient/trends'}>
              Go to View Trends
            </Button>
          </div>
        </Card>
      )}

      {/* ── LAB TAB ── */}
      {activeTab === 'lab' && (
        <Card title="Laboratory Reports">
          {labLoading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading lab reports...</span>
            </div>
          ) : labTests.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No lab tests on record.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Test Type</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Interpretation</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Ordered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {labTests.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                        {fmtDate(test.completedDate || test.orderedDate)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium">{test.testType}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        {test.interpretation ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            test.interpretation === 'Normal'   ? 'bg-green-100 text-green-700' :
                            test.interpretation === 'Critical' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {test.interpretation}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Pending</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          test.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          test.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {test.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">{test.doctorName || test.orderedBy || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── PRESCRIPTIONS TAB ── */}
      {activeTab === 'prescriptions' && (
        <Card title="My Prescriptions">
          {prescLoading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading prescriptions...</span>
            </div>
          ) : prescriptions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No prescriptions on record.</p>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((presc) => (
                <div key={presc.id} className="p-4 sm:p-6 border-2 border-gray-200 rounded-lg hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{presc.diagnosis}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Prescribed by {presc.doctorName || '—'} · {fmtDate(presc.prescribedDate || presc.createdAt)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      presc.status === 'Active'     ? 'bg-green-100 text-green-700' :
                      presc.status === 'Completed'  ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {presc.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(presc.medications || []).map((med, mIdx) => (
                      <div key={mIdx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Pill className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-sm">{med.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {med.dosage} · {med.frequency}
                            {med.duration ? ` · ${med.duration}` : ''}
                          </p>
                          {med.instructions && (
                            <p className="text-xs text-gray-500 mt-0.5 italic">{med.instructions}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {activeTab === 'notifications' && (
        <Card title="Notifications & Reminders">
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <p className="text-lg font-semibold text-gray-700 mb-2">Notifications Coming Soon</p>
            <p className="text-sm text-gray-400">
              You will receive appointment reminders, lab result alerts,<br />
              and medication reminders here in a future update.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MyProfile;
