import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';

const MyProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');

  // Mock patient data
  const [patientData] = useState({
    // Personal Info
    photo: null,
    name: 'John Doe',
    dob: '1979-05-15',
    gender: 'Male',
    age: 45,
    idNumber: 'ID123456789',
    phone: '+254 712 345 678',
    email: 'john.doe@email.com',
    address: '123 Nairobi Street, Westlands, Nairobi',
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '+254 723 456 789'
    },
    insurance: {
      provider: 'NHIF',
      policyNumber: 'NHIF-2024-12345',
      type: 'Insurance'
    },
    
    // Medical Info
    diabetesType: 'Type 2',
    diagnosisDate: '2020-03-15',
    currentHbA1c: '7.2%',
    lastHbA1cDate: '2024-11-15',
    allergies: 'Penicillin, Sulfa drugs',
    comorbidities: 'Hypertension, High Cholesterol',
    
    // Current Medications
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', prescribedBy: 'Dr. Ahmed Hassan', startDate: '2020-03-20' },
      { name: 'Glimepiride', dosage: '2mg', frequency: 'Once daily (morning)', prescribedBy: 'Dr. Ahmed Hassan', startDate: '2022-06-10' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily (evening)', prescribedBy: 'Dr. Sarah Kamau', startDate: '2021-01-15' },
    ],
    
    // Doctors
    doctors: [
      { name: 'Dr. Ahmed Hassan', specialty: 'Endocrinologist', role: 'Primary', phone: '+254 720 111 222', email: 'ahmed.hassan@cdc.com' },
      { name: 'Dr. Sarah Kamau', specialty: 'Cardiologist', role: 'Specialist', phone: '+254 720 333 444', email: 'sarah.kamau@cdc.com' },
    ],
    
    // Appointments
    upcomingAppointments: [
      { date: '2024-12-15', time: '10:00 AM', doctor: 'Dr. Ahmed Hassan', type: 'Follow-up', status: 'Confirmed' },
      { date: '2024-12-20', time: '2:00 PM', doctor: 'Dr. Sarah Kamau', type: 'Consultation', status: 'Pending' },
    ],
    
    pastAppointments: [
      { date: '2024-11-15', time: '10:00 AM', doctor: 'Dr. Ahmed Hassan', type: 'Follow-up', notes: 'HbA1c test done. Adjusted medication dosage.' },
      { date: '2024-10-10', time: '3:00 PM', doctor: 'Dr. Ahmed Hassan', type: 'Regular Checkup', notes: 'Blood pressure stable. Continue current medications.' },
    ],
    
    // Lab Reports
    labReports: [
      { date: '2024-11-15', type: 'HbA1c Test', result: '7.2%', status: 'High', doctor: 'Dr. Ahmed Hassan' },
      { date: '2024-11-15', type: 'Fasting Glucose', result: '145 mg/dL', status: 'Elevated', doctor: 'Dr. Ahmed Hassan' },
      { date: '2024-10-01', type: 'Lipid Profile', result: 'Normal', status: 'Normal', doctor: 'Dr. Sarah Kamau' },
    ],
    
    // Notifications
    notifications: [
      { date: '2024-12-08', type: 'Appointment Reminder', message: 'Upcoming appointment with Dr. Ahmed Hassan on Dec 15 at 10:00 AM', read: false },
      { date: '2024-12-05', type: 'Lab Results', message: 'Your HbA1c test results are available', read: true },
      { date: '2024-12-01', type: 'Medication Reminder', message: 'Time to refill your Metformin prescription', read: true },
    ],
  });

  const tabs = [
    { key: 'profile', label: 'My Profile', icon: '👤' },
    { key: 'medical', label: 'Medical Info', icon: '🏥' },
    { key: 'appointments', label: 'Appointments', icon: '📅' },
    { key: 'monitoring', label: 'Monitoring', icon: '📊' },
    { key: 'lab', label: 'Lab Reports', icon: '🔬' },
    { key: 'prescriptions', label: 'Prescriptions', icon: '💊' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

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
              className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo */}
              <div className="md:col-span-2 flex items-center gap-4">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                  {patientData.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{patientData.name}</p>
                  <p className="text-sm text-gray-600">UHID: CDC001</p>
                  <Button variant="outline" className="mt-2 text-sm">Change Photo</Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input type="text" value={patientData.name} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                <input type="date" value={patientData.dob} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                <input type="text" value={patientData.gender} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                <input type="text" value={`${patientData.age} years`} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ID/Passport Number</label>
                <input type="text" value={patientData.idNumber} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input type="tel" value={patientData.phone} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input type="email" value={patientData.email} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Address</label>
                <textarea value={patientData.address} rows="2" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"></textarea>
              </div>
            </div>
          </Card>

          <Card title="Emergency Contact">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input type="text" value={patientData.emergencyContact.name} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
                <input type="text" value={patientData.emergencyContact.relationship} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input type="tel" value={patientData.emergencyContact.phone} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
              </div>
            </div>
          </Card>

          <Card title="Insurance & Payment">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance Provider</label>
                <input type="text" value={patientData.insurance.provider} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Policy Number</label>
                <input type="text" value={patientData.insurance.policyNumber} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type</label>
                <select value={patientData.insurance.type} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary">
                  <option value="Insurance">Insurance</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      )}

      {activeTab === 'medical' && (
        <div className="space-y-6">
          <Card title="Diabetes Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Diabetes Type</label>
                <input type="text" value={patientData.diabetesType} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis Date</label>
                <input type="date" value={patientData.diagnosisDate} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current HbA1c</label>
                <input type="text" value={patientData.currentHbA1c} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last HbA1c Test</label>
                <input type="date" value={patientData.lastHbA1cDate} disabled className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Known Allergies</label>
                <textarea value={patientData.allergies} disabled rows="2" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50"></textarea>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Other Conditions (Comorbidities)</label>
                <textarea value={patientData.comorbidities} disabled rows="2" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50"></textarea>
              </div>
            </div>
          </Card>

          <Card title="Current Medications">
            <div className="space-y-4">
              {patientData.medications.map((med, index) => (
                <div key={index} className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-800">{med.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-semibold">Dosage:</span> {med.dosage} • <span className="font-semibold">Frequency:</span> {med.frequency}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Prescribed by: {med.prescribedBy} • Started: {new Date(med.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold self-start">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Your Healthcare Team">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patientData.doctors.map((doctor, index) => (
                <div key={index} className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-lg font-bold text-gray-800">{doctor.name}</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      doctor.role === 'Primary' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {doctor.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{doctor.specialty}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>📞 {doctor.phone}</p>
                    <p>📧 {doctor.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <Card title="Upcoming Appointments">
            {patientData.upcomingAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {patientData.upcomingAppointments.map((apt, index) => (
                  <div key={index} className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-lg font-bold text-gray-800">
                          {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {apt.time}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">Doctor:</span> {apt.doctor} • <span className="font-semibold">Type:</span> {apt.type}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="text-sm">Reschedule</Button>
                        <Button variant="outline" className="text-sm text-red-600 border-red-300 hover:bg-red-50">Cancel</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Past Appointments">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Doctor</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patientData.pastAppointments.map((apt, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                        {new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">{apt.time}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium">{apt.doctor}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">{apt.type}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-600">{apt.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <Card title="Blood Sugar Monitoring History">
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📊</p>
            <p className="text-xl font-bold text-gray-800 mb-2">Your monitoring data is in the "View Trends" page</p>
            <p className="text-gray-600 mb-6">View your complete blood sugar history, trends, and statistics</p>
            <Button onClick={() => window.location.href = '/patient/trends'}>
              Go to View Trends
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'lab' && (
        <Card title="Laboratory Reports">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Test Type</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Result</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Doctor</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {patientData.labReports.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                      {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium">{report.type}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-bold">{report.result}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        report.status === 'Normal' ? 'bg-green-100 text-green-700' :
                        report.status === 'Elevated' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">{report.doctor}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex gap-2">
                        <Button variant="outline" className="text-xs py-1 px-3">View</Button>
                        <Button variant="outline" className="text-xs py-1 px-3">Download</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'prescriptions' && (
        <Card title="My Prescriptions">
          <div className="space-y-4">
            {patientData.medications.map((med, index) => (
              <div key={index} className="p-4 sm:p-6 border-2 border-gray-200 rounded-lg hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl sm:text-4xl">💊</span>
                      <div className="flex-1">
                        <p className="text-lg sm:text-xl font-bold text-gray-800">{med.name}</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p><span className="font-semibold">Dosage:</span> {med.dosage}</p>
                          <p><span className="font-semibold">Frequency:</span> {med.frequency}</p>
                          <p><span className="font-semibold">Prescribed by:</span> {med.prescribedBy}</p>
                          <p><span className="font-semibold">Start Date:</span> {new Date(med.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap">Active</span>
                    <Button variant="outline" className="text-xs py-1 px-3">Download Rx</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card title="Notifications & Reminders">
          <div className="space-y-3">
            {patientData.notifications.map((notif, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                notif.read 
                  ? 'bg-gray-50 border-gray-400' 
                  : 'bg-blue-50 border-blue-500'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        notif.type === 'Appointment Reminder' ? 'bg-blue-100 text-blue-700' :
                        notif.type === 'Lab Results' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {notif.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(notif.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{notif.message}</p>
                  </div>
                  {!notif.read && (
                    <button className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MyProfile;