import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
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
import { Glp1Provider } from './contexts/Glp1Context';
import { NotificationProvider } from './contexts/NotificationContext';
import { StockProvider } from './contexts/StockContext';
import { ThyroidUltrasoundProvider } from './contexts/ThyroidUltrasoundContext';

// Layouts & shared (always needed — keep eager)
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import Spinner from "./components/shared/Spinner";

// Auth pages (small, visited immediately — keep eager)
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

// Shared pages (lazy)
const MedicalDocuments = lazy(() => import("./pages/shared/MedicalDocuments"));
const PatientVisitsReport = lazy(() => import("./pages/shared/PatientVisitsReport"));
const ChangePasswordPage = lazy(() => import("./pages/shared/ChangePasswordPage"));
const Stocks = lazy(() => import("./pages/shared/Stocks"));

// Staff pages (lazy)
const StaffDashboard = lazy(() => import("./pages/staff/StaffDashboard"));
const PatientSearch = lazy(() => import("./pages/staff/PatientSearch"));
const QueueManagement = lazy(() => import("./pages/staff/QueueManagement"));
const Triage = lazy(() => import("./pages/staff/Triage"));
const StaffCreatePatient = lazy(() => import("./pages/staff/CreatePatient"));
const StaffPatientProfile = lazy(() => import("./pages/staff/StaffPatientProfile"));
const StaffAppointmentsList = lazy(() => import("./pages/staff/AppointmentsList"));
const StaffBookAppointment  = lazy(() => import("./pages/staff/BookAppointment"));

// Doctor pages (lazy)
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const MyPatients = lazy(() => import("./pages/doctor/MyPatients"));
const PatientProfile = lazy(() => import("./pages/doctor/PatientProfile"));
const InitialAssessment = lazy(() => import("./pages/doctor/InitialAssessment"));
const DoctorPrescriptions = lazy(() => import("./pages/doctor/DoctorPrescriptions"));
const Reports = lazy(() => import("./pages/doctor/Reports"));
const PhysicalExamination = lazy(() => import("./pages/doctor/PhysicalExamination"));
const GlycemicCharts = lazy(() => import("./pages/doctor/GlycemicCharts"));
const DoctorAppointmentsList = lazy(() => import("./pages/doctor/AppointmentsList"));
const MySchedule             = lazy(() => import("./pages/doctor/MySchedule"));

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
const CreateUsers = lazy(() => import("./pages/admin/CreateUsers"));
const ClinicalCatalog = lazy(() => import("./pages/admin/ClinicalCatalog"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
// The staff file — one page for every cadre. Its shell (collapsible name bar,
// ProfileTabBar) is shared with PatientFile so the two record "files" behave
// identically; its data comes from /api/staff/:employeeId.
const StaffFile = lazy(() => import("./pages/admin/StaffFile"));
// Unified, role-aware patient file — used by the doctor, staff and admin portals
// (replaces doctor/PatientProfile + staff/StaffPatientProfile, which remain in
// the tree for rollback).
const PatientFile = lazy(() => import("./pages/shared/PatientFile"));
const DuplicatePatients = lazy(() => import("./pages/admin/DuplicatePatients"));
const ActivityLog = lazy(() => import("./pages/admin/ActivityLog"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));
const AnalyticsOverview      = lazy(() => import("./pages/admin/analytics/AnalyticsOverview"));
const DoctorAnalytics        = lazy(() => import("./pages/admin/analytics/DoctorAnalytics"));
const StaffAnalytics         = lazy(() => import("./pages/admin/analytics/StaffAnalytics"));
const ConsultationAnalytics  = lazy(() => import("./pages/admin/analytics/ConsultationAnalytics"));
const WardConfig             = lazy(() => import("./pages/admin/WardConfig"));

// HMIS V4 — ultrasound (lazy)
const UnassignedUltrasound   = lazy(() => import("./pages/admin/UnassignedUltrasound"));
const UltrasoundStudio       = lazy(() => import("./pages/doctor/UltrasoundStudio"));
const RadiologySuite         = lazy(() => import("./pages/radiology/RadiologySuite"));
const RadiologyUnassigned     = lazy(() => import("./pages/radiology/RadiologyUnassigned"));

// HMIS V3 — inpatient (lazy)
const WardBoard          = lazy(() => import("./pages/inpatient/WardBoard"));
const AdmissionDetail    = lazy(() => import("./pages/inpatient/AdmissionDetail"));
const InpatientAdmissions = lazy(() => import("./pages/staff/InpatientAdmissions"));

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
  <NotificationProvider>
    <ConsultationNotesProvider>
      <LabProvider>
        <InitialAssessmentProvider>
          <PhysicalExamProvider>
            <QueueProvider>
              <AppointmentProvider>
                <PatientProvider>
                  <PrescriptionProvider>
                    <TreatmentPlanProvider>
                      <Glp1Provider>
                        <StockProvider>
                          <ThyroidUltrasoundProvider>
                            <Outlet />
                          </ThyroidUltrasoundProvider>
                        </StockProvider>
                      </Glp1Provider>
                    </TreatmentPlanProvider>
                  </PrescriptionProvider>
                </PatientProvider>
              </AppointmentProvider>
            </QueueProvider>
          </PhysicalExamProvider>
        </InitialAssessmentProvider>
      </LabProvider>
    </ConsultationNotesProvider>
  </NotificationProvider>
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
                  element={<ProtectedRoute requiredRole="staff" requiredPortal="portal.staff"><MainLayout userRole="Staff" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<StaffDashboard />} />
                  <Route path="inpatient-board" element={<WardBoard />} />
                  <Route path="patients" element={<PatientSearch />} />
                  <Route path="queue" element={<QueueManagement />} />
                  <Route path="triage" element={<Triage />} />
                  <Route path="create-patient" element={<StaffCreatePatient />} />
                  <Route path="patient-profile/:uhid" element={<PatientFile />} />
                  <Route path="appointments" element={<StaffAppointmentsList />} />
                  <Route path="book-appointment" element={<StaffBookAppointment />} />
                  <Route path="medical-documents" element={<MedicalDocuments />} />
                  <Route path="patient-visits" element={<PatientVisitsReport />} />
                  <Route path="stock" element={<Stocks />} />
                  <Route path="inpatient-admissions" element={<InpatientAdmissions />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

                {/* Doctor Portal */}
                <Route
                  path="/doctor"
                  element={<ProtectedRoute requiredRole="doctor" requiredPortal="portal.doctor"><MainLayout userRole="Doctor" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<DoctorDashboard />} />
                  <Route path="inpatient-board" element={<WardBoard />} />
                  <Route path="patients" element={<MyPatients />} />
                  <Route path="patient-profile/:uhid" element={<PatientFile />} />
                  {/* The consultation opens the shared patient file; Today's
                      Consultation is its first (queue-gated) tab. */}
                  <Route path="consultation/:uhid" element={<PatientFile />} />
                  <Route path="initial-assessment" element={<InitialAssessment />} />
                  <Route path="prescriptions" element={<DoctorPrescriptions />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="medical-documents" element={<MedicalDocuments />} />
                  <Route path="patient-visits" element={<PatientVisitsReport />} />
                  <Route path="physical-exam" element={<PhysicalExamination />} />
                  <Route path="glycemic-charts" element={<GlycemicCharts />} />
                  <Route path="ultrasound-studio" element={<UltrasoundStudio />} />
                  <Route path="appointments" element={<DoctorAppointmentsList />} />
                  <Route path="my-schedule" element={<MySchedule />} />
                  <Route path="stock" element={<Stocks />} />
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
                  element={<ProtectedRoute requiredRole="lab" requiredPortal="portal.lab"><MainLayout userRole="Lab" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<LabDashboard />} />
                  <Route path="inpatient-board" element={<WardBoard />} />
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
                  element={<ProtectedRoute requiredRole="admin" requiredPortal="portal.admin"><MainLayout userRole="Admin" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="create-users" element={<CreateUsers />} />
                  {/* Old per-role URLs redirect into the combined page */}
                  <Route path="create-doctor" element={<Navigate to="/admin/create-users?role=doctor" replace />} />
                  <Route path="create-staff" element={<Navigate to="/admin/create-users?role=staff" replace />} />
                  <Route path="create-lab" element={<Navigate to="/admin/create-users?role=lab" replace />} />
                  <Route path="create-patient" element={<Navigate to="/admin/create-users?role=patient" replace />} />
                  <Route path="manage-users" element={<ManageUsers />} />
                  {/* Resolves on employeeId (EMP014), mirroring the patient
                      routes which resolve on uhid — the database PK stays out
                      of the URL. */}
                  <Route path="staff/:employeeId" element={<StaffFile />} />
                  {/* Old path kept so existing links and bookmarks still land */}
                  <Route path="staff-profile/:employeeId" element={<StaffFile />} />
                  <Route path="patient-profile/:uhid" element={<PatientFile />} />
                  <Route path="medical-documents" element={<MedicalDocuments />} />
                  <Route path="patient-visits" element={<PatientVisitsReport />} />
                  <Route path="catalog" element={<ClinicalCatalog />} />
                  <Route path="stock" element={<Stocks />} />
                  <Route path="duplicate-patients" element={<DuplicatePatients />} />
                  <Route path="unassigned-ultrasound" element={<UnassignedUltrasound />} />
                  <Route path="activity-log" element={<ActivityLog />} />
                  <Route path="analytics" element={<AnalyticsOverview />} />
                  <Route path="analytics/doctors" element={<DoctorAnalytics />} />
                  <Route path="analytics/staff" element={<StaffAnalytics />} />
                  <Route path="analytics/consultations" element={<ConsultationAnalytics />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<SystemSettings />} />
                  <Route path="ward-config" element={<WardConfig />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

                {/* Radiology Suite — top-level section (doctors + staff; admin
                    implicit via canAccessAdmin). No new role or permissions. */}
                <Route
                  path="/radiology"
                  element={<ProtectedRoute requiredPortal="portal.radiology"><MainLayout userRole="Radiology" /></ProtectedRoute>}
                >
                  <Route index element={<Navigate to="/radiology/suite" replace />} />
                  <Route path="dashboard" element={<Navigate to="/radiology/suite" replace />} />
                  <Route path="suite" element={<RadiologySuite />} />
                  <Route path="patients" element={<MyPatients basePath="/radiology" />} />
                  <Route path="patient-profile/:uhid" element={<PatientFile />} />
                  <Route path="unassigned" element={<RadiologyUnassigned />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

                {/* Nurse Portal (HMIS V3) — inpatient home + OPD nursing work */}
                <Route
                  path="/nurse"
                  element={<ProtectedRoute requiredRole="nurse" requiredPortal="portal.inpatient"><MainLayout userRole="Nurse" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<WardBoard />} />
                  <Route path="queue" element={<QueueManagement />} />
                  <Route path="triage" element={<Triage />} />
                  <Route path="patient-profile/:uhid" element={<PatientFile />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>

                {/* Inpatient workspace (HMIS V3) — doctors + nurses switch in */}
                <Route
                  path="/inpatient"
                  element={<ProtectedRoute requiredPortal="portal.inpatient"><MainLayout userRole="Inpatient" /></ProtectedRoute>}
                >
                  <Route path="dashboard" element={<WardBoard />} />
                  <Route path="board" element={<WardBoard />} />
                  <Route path="admission/:id" element={<AdmissionDetail />} />
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
