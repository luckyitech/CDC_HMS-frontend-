import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import Providers(use contexts)
import { UserProvider } from "./contexts/UserContext";
import { PatientProvider } from "./contexts/PatientContext";
import { PrescriptionProvider } from "./contexts/PrescriptionContext";
import { QueueProvider } from "./contexts/QueueContext";
import LoginPage from "./pages/auth/LoginPage";
import { PhysicalExamProvider } from "./contexts/PhysicalExamContext";
import { InitialAssessmentProvider } from "./contexts/InitialAssessmentContext";
import { LabProvider } from "./contexts/LabContext";
import { TreatmentPlanProvider } from "./contexts/TreatmentPlanContext";
import { AppointmentProvider } from './contexts/AppointmentContext';
import { ConsultationNotesProvider } from './contexts/ConsultationNotesContext';

import StaffLoginPage from "./pages/auth/StaffLoginPage";
import DoctorLoginPage from "./pages/auth/DoctorLoginPage";
import LabLoginPage from "./pages/auth/LabLoginPage";
import PatientLoginPage from "./pages/auth/PatientLoginPage";
import MainLayout from "./layouts/MainLayout";

// Staff Pages
import StaffDashboard from "./pages/staff/StaffDashboard";
import PatientSearch from "./pages/staff/PatientSearch";
import QueueManagement from "./pages/staff/QueueManagement";
import Triage from "./pages/staff/Triage";
import StaffCreatePatient from "./pages/staff/CreatePatient";
import StaffPatientProfile from './pages/staff/StaffPatientProfile';

// Doctor Pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import MyPatients from "./pages/doctor/MyPatients";
import Consultation from "./pages/doctor/Consultation";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions";
import Reports from "./pages/doctor/Reports";
import InitialAssessment from "./pages/doctor/InitialAssessment";
import PhysicalExamination from "./pages/doctor/PhysicalExamination";
import GlycemicCharts from "./pages/doctor/GlycemicCharts";
import PatientProfile from "./pages/doctor/PatientProfile";
import MedicalDocuments from "./pages/shared/MedicalDocuments";

// Patient pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import LogBloodSugar from "./pages/patient/LogBloodSugar";
import ViewTrends from "./pages/patient/ViewTrends";
import MyProfile from "./pages/patient/MyProfile";
import BookAppointment from "./pages/patient/BookAppointment";
import UploadResults from "./pages/patient/UploadResults";
import PatientPrescriptions from "./pages/patient/PatientPrescriptions";

// lab pages
import LabDashboard from "./pages/lab/LabDashboard";
import PendingTests from "./pages/lab/PendingTests";
import EnterResults from "./pages/lab/EnterResults";
import TestHistory from "./pages/lab/TestHistory";
import GenerateReports from "./pages/lab/GenerateReports";
import CriticalAlerts from "./pages/lab/CriticalAlerts";

// Admin pages
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateDoctor from "./pages/admin/CreateDoctor";
import CreateStaff from "./pages/admin/CreateStaff";
import CreateLabTech from "./pages/admin/CreateLabTech";
import AdminCreatePatient from "./pages/admin/CreatePatient";
import ManageUsers from "./pages/admin/ManageUsers";

function App() {
  return (
    <BrowserRouter>
    <ConsultationNotesProvider>
      <LabProvider>
        <InitialAssessmentProvider>
          <PhysicalExamProvider>
            <QueueProvider>
              <AppointmentProvider>
              <UserProvider>
                <PatientProvider>
                  <PrescriptionProvider>
                    <TreatmentPlanProvider>
                    <Routes>
                      {/* All your routes stay exactly the same */}
                      <Route path="/" element={<LoginPage />} />
                      <Route path="/login/staff" element={<StaffLoginPage />} />
                      <Route
                        path="/login/doctor"
                        element={<DoctorLoginPage />}
                      />
                      <Route path="/login/lab" element={<LabLoginPage />} />
                      <Route
                        path="/login/patient"
                        element={<PatientLoginPage />}
                      />
                      <Route path="/login/admin" element={<AdminLoginPage />} />

                      {/* Staff Portal */}
                      <Route
                        path="/staff"
                        element={<MainLayout userRole="Staff" />}
                      >
                        <Route path="dashboard" element={<StaffDashboard />} />
                        <Route path="patients" element={<PatientSearch />} />
                        <Route path="queue" element={<QueueManagement />} />
                        <Route path="triage" element={<Triage />} />
                        <Route
                          path="create-patient"
                          element={<StaffCreatePatient />}
                        />
                        <Route path="/staff/patient-profile/:uhid" element={<StaffPatientProfile />} />
                        <Route path="medical-documents" element={<MedicalDocuments />} />
                      </Route>

                      {/* Doctor Portal */}
                      <Route
                        path="/doctor"
                        element={<MainLayout userRole="Doctor" />}
                      >
                        <Route path="dashboard" element={<DoctorDashboard />} />
                        <Route path="patients" element={<MyPatients />} />
                        <Route
                          path="patient-profile/:uhid"
                          element={<PatientProfile />}
                        />
                        <Route
                          path="consultation/:uhid"
                          element={<Consultation />}
                        />
                        <Route
                          path="initial-assessment"
                          element={<InitialAssessment />}
                        />
                        <Route
                          path="prescriptions"
                          element={<DoctorPrescriptions />}
                        />
                        <Route path="reports" element={<Reports />} />
                        <Route path="medical-documents" element={<MedicalDocuments />} />
                        <Route
                          path="physical-exam"
                          element={<PhysicalExamination />}
                        />
                        <Route
                          path="glycemic-charts"
                          element={<GlycemicCharts />}
                        />
                      </Route>

                      {/* Patient Portal */}
                      <Route
                        path="/patient"
                        element={<MainLayout userRole="Patient" />}
                      >
                        <Route
                          path="dashboard"
                          element={<PatientDashboard />}
                        />
                        <Route
                          path="log-blood-sugar"
                          element={<LogBloodSugar />}
                        />
                        <Route path="trends" element={<ViewTrends />} />
                        <Route path="profile" element={<MyProfile />} />
                        <Route
                          path="prescriptions"
                          element={<PatientPrescriptions />}
                        />
                        <Route
                          path="book-appointment"
                          element={<BookAppointment />}
                        />
                        <Route
                          path="upload-results"
                          element={<UploadResults />}
                        />
                      </Route>

                      {/* Lab portal */}
                      <Route
                        path="/lab"
                        element={<MainLayout userRole="Lab" />}
                      >
                        <Route path="dashboard" element={<LabDashboard />} />
                        <Route
                          path="pending-tests"
                          element={<PendingTests />}
                        />
                        <Route
                          path="enter-results"
                          element={<EnterResults />}
                        />
                        <Route path="test-history" element={<TestHistory />} />
                        <Route
                          path="generate-reports"
                          element={<GenerateReports />}
                        />
                        <Route
                          path="critical-alerts"
                          element={<CriticalAlerts />}
                        />
                      </Route>

                      {/* Admin portal */}
                      <Route
                        path="/admin"
                        element={<MainLayout userRole="Admin" />}
                      >
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route
                          path="create-doctor"
                          element={<CreateDoctor />}
                        />
                        <Route path="create-staff" element={<CreateStaff />} />
                        <Route path="create-lab" element={<CreateLabTech />} />
                        <Route
                          path="create-patient"
                          element={<AdminCreatePatient />}
                        />
                        <Route path="manage-users" element={<ManageUsers />} />
                        <Route path="reports" element={<Reports />} />
                      </Route>
                    </Routes>
                    </TreatmentPlanProvider>
                  </PrescriptionProvider>
                </PatientProvider>
              </UserProvider>
              </AppointmentProvider>
            </QueueProvider>
          </PhysicalExamProvider>
        </InitialAssessmentProvider>
      </LabProvider>
      </ConsultationNotesProvider>
    </BrowserRouter>
  );
}

export default App;