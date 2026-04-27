import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/shared/ErrorFallback";
import NotFound from "./pages/shared/NotFound";

// Contexts
import { UserProvider } from "./contexts/UserContext";
import { PatientProvider } from "./contexts/PatientContext";
import { PrescriptionProvider } from "./contexts/PrescriptionContext";
import { QueueProvider } from "./contexts/QueueContext";
import { PhysicalExamProvider } from "./contexts/PhysicalExamContext";
import { InitialAssessmentProvider } from "./contexts/InitialAssessmentContext";
import { LabProvider } from "./contexts/LabContext";
import { TreatmentPlanProvider } from "./contexts/TreatmentPlanContext";
import { AppointmentProvider } from './contexts/AppointmentContext';
import { ConsultationNotesProvider } from './contexts/ConsultationNotesContext';

// Layouts & shared (always needed — keep eager)
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import Spinner from "./components/shared/Spinner";

// Auth pages (small, visited immediately — keep eager)
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

// Shared pages (lazy)
const MedicalDocuments = lazy(() => import("./pages/shared/MedicalDocuments"));
const ChangePasswordPage = lazy(() => import("./pages/shared/ChangePasswordPage"));

// Staff pages (lazy)
const StaffDashboard = lazy(() => import("./pages/staff/StaffDashboard"));
const PatientSearch = lazy(() => import("./pages/staff/PatientSearch"));
const QueueManagement = lazy(() => import("./pages/staff/QueueManagement"));
const Triage = lazy(() => import("./pages/staff/Triage"));
const StaffCreatePatient = lazy(() => import("./pages/staff/CreatePatient"));
const StaffPatientProfile = lazy(() => import("./pages/staff/StaffPatientProfile"));
const StaffAppointmentsList = lazy(() => import("./pages/staff/AppointmentsList"));

// Doctor pages (lazy)
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const MyPatients = lazy(() => import("./pages/doctor/MyPatients"));
const PatientProfile = lazy(() => import("./pages/doctor/PatientProfile"));
const Consultation = lazy(() => import("./pages/doctor/Consultation"));
const InitialAssessment = lazy(() => import("./pages/doctor/InitialAssessment"));
const DoctorPrescriptions = lazy(() => import("./pages/doctor/DoctorPrescriptions"));
const Reports = lazy(() => import("./pages/doctor/Reports"));
const PhysicalExamination = lazy(() => import("./pages/doctor/PhysicalExamination"));
const GlycemicCharts = lazy(() => import("./pages/doctor/GlycemicCharts"));
const DoctorAppointmentsList = lazy(() => import("./pages/doctor/AppointmentsList"));

// Patient pages (lazy)
const PatientDashboard = lazy(() => import("./pages/patient/PatientDashboard"));
const LogBloodSugar = lazy(() => import("./pages/patient/LogBloodSugar"));
const ViewTrends = lazy(() => import("./pages/patient/ViewTrends"));
const MyProfile = lazy(() => import("./pages/patient/MyProfile"));
const PatientPrescriptions = lazy(() => import("./pages/patient/PatientPrescriptions"));
const BookAppointment = lazy(() => import("./pages/patient/BookAppointment"));
const UploadResults = lazy(() => import("./pages/patient/UploadResults"));

// Lab pages (lazy)
const LabDashboard = lazy(() => import("./pages/lab/LabDashboard"));
const PendingTests = lazy(() => import("./pages/lab/PendingTests"));
const EnterResults = lazy(() => import("./pages/lab/EnterResults"));
const TestHistory = lazy(() => import("./pages/lab/TestHistory"));
const GenerateReports = lazy(() => import("./pages/lab/GenerateReports"));
const CriticalAlerts = lazy(() => import("./pages/lab/CriticalAlerts"));

// Admin pages (lazy)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const CreateDoctor = lazy(() => import("./pages/admin/CreateDoctor"));
const CreateStaff = lazy(() => import("./pages/admin/CreateStaff"));
const CreateLabTech = lazy(() => import("./pages/admin/CreateLabTech"));
const AdminCreatePatient = lazy(() => import("./pages/admin/CreatePatient"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const ActivityLog = lazy(() => import("./pages/admin/ActivityLog"));

// Loading fallback shown while a lazy chunk is downloading
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner />
  </div>
);

// All data providers that require authentication are wrapped here.
// This component only mounts when navigating to an authenticated portal route,
// so no API calls or SSE connections are made on the public login/portal pages.
const AuthenticatedLayout = () => (
  <ConsultationNotesProvider>
    <LabProvider>
      <InitialAssessmentProvider>
        <PhysicalExamProvider>
          <QueueProvider>
            <AppointmentProvider>
              <PatientProvider>
                <PrescriptionProvider>
                  <TreatmentPlanProvider>
                    <Outlet />
                  </TreatmentPlanProvider>
                </PrescriptionProvider>
              </PatientProvider>
            </AppointmentProvider>
          </QueueProvider>
        </PhysicalExamProvider>
      </InitialAssessmentProvider>
    </LabProvider>
  </ConsultationNotesProvider>
);

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      {/* UserProvider stays at the top level — needed by ProtectedRoute and login pages */}
      <UserProvider>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public (auth) routes — no data providers active here */}
              <Route path="/" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Authenticated portal routes — data providers mount only here */}
              <Route element={<AuthenticatedLayout />}>

                {/* Staff Portal */}
                <Route
                  path="/staff"
                  element={<ProtectedRoute requiredRole="staff"><MainLayout userRole="Staff" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<StaffDashboard />} />
                  <Route path="patients" element={<PatientSearch />} />
                  <Route path="queue" element={<QueueManagement />} />
                  <Route path="triage" element={<Triage />} />
                  <Route path="create-patient" element={<StaffCreatePatient />} />
                  <Route path="patient-profile/:uhid" element={<StaffPatientProfile />} />
                  <Route path="appointments" element={<StaffAppointmentsList />} />
                  <Route path="medical-documents" element={<MedicalDocuments />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

                {/* Doctor Portal */}
                <Route
                  path="/doctor"
                  element={<ProtectedRoute requiredRole="doctor"><MainLayout userRole="Doctor" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<DoctorDashboard />} />
                  <Route path="patients" element={<MyPatients />} />
                  <Route path="patient-profile/:uhid" element={<PatientProfile />} />
                  <Route path="consultation/:uhid" element={<Consultation />} />
                  <Route path="initial-assessment" element={<InitialAssessment />} />
                  <Route path="prescriptions" element={<DoctorPrescriptions />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="medical-documents" element={<MedicalDocuments />} />
                  <Route path="physical-exam" element={<PhysicalExamination />} />
                  <Route path="glycemic-charts" element={<GlycemicCharts />} />
                  <Route path="appointments" element={<DoctorAppointmentsList />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

                {/* Patient Portal */}
                <Route
                  path="/patient"
                  element={<ProtectedRoute requiredRole="patient"><MainLayout userRole="Patient" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<PatientDashboard />} />
                  <Route path="log-blood-sugar" element={<LogBloodSugar />} />
                  <Route path="trends" element={<ViewTrends />} />
                  <Route path="profile" element={<MyProfile />} />
                  <Route path="prescriptions" element={<PatientPrescriptions />} />
                  <Route path="book-appointment" element={<BookAppointment />} />
                  <Route path="upload-results" element={<UploadResults />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

                {/* Lab Portal */}
                <Route
                  path="/lab"
                  element={<ProtectedRoute requiredRole="lab"><MainLayout userRole="Lab" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<LabDashboard />} />
                  <Route path="pending-tests" element={<PendingTests />} />
                  <Route path="enter-results" element={<EnterResults />} />
                  <Route path="test-history" element={<TestHistory />} />
                  <Route path="generate-reports" element={<GenerateReports />} />
                  <Route path="critical-alerts" element={<CriticalAlerts />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

                {/* Admin Portal */}
                <Route
                  path="/admin"
                  element={<ProtectedRoute requiredRole="admin"><MainLayout userRole="Admin" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="create-doctor" element={<CreateDoctor />} />
                  <Route path="create-staff" element={<CreateStaff />} />
                  <Route path="create-lab" element={<CreateLabTech />} />
                  <Route path="create-patient" element={<AdminCreatePatient />} />
                  <Route path="manage-users" element={<ManageUsers />} />
                  <Route path="activity-log" element={<ActivityLog />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

              </Route>{/* end AuthenticatedLayout */}

              {/* 404 — catch all unmatched routes */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
