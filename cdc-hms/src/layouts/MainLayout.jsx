import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Add useLocation
import { useState } from "react";
// import { useEffect } from "react"; // TODO: restore when notifications are implemented
// import appointmentService from "../services/appointmentService"; // TODO: restore for notification badge
import { useUserContext } from "../contexts/UserContext";
// import toast from "react-hot-toast"; // TODO: restore when notifications are implemented
import {
  LayoutDashboard,
  Search,
  ClipboardList,
  Stethoscope,
  UserPlus,
  Users,
  HeartPulse,
  FileText,
  Activity,
  Pill,
  Home,
  Edit,
  TrendingUp,
  User,
  Calendar,
  Upload,
  TestTube,
  FileCheck,
  AlertTriangle,
  UserCog,
  Settings,
  // Bell, // TODO: notifications
  Menu,
  X,
  // CheckCircle, // TODO: notifications
  // Info,        // TODO: notifications
  // AlertCircle, // TODO: notifications
  ChartNoAxesCombined,
  LogOut,
  ShieldCheck,
  ChevronDown,
  // FileStack,
  // KeyRound,
} from "lucide-react";
import logo from "../assets/cdc_web_logo1.svg";

const MainLayout = ({ userRole = "Staff" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useUserContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [portalSwitcherOpen, setPortalSwitcherOpen] = useState(false);

  const isAdminViewing = currentUser?.role === 'admin' && userRole.toLowerCase() !== 'admin';

  const portalOptions = [
    { label: 'Doctor Portal', path: '/doctor/dashboard' },
    { label: 'Staff Portal', path: '/staff/dashboard' },
    { label: 'Lab Portal', path: '/lab/dashboard' },
  ];
  // const [notificationsOpen, setNotificationsOpen] = useState(false); // TODO: notifications
  // const [doctorApptCount, setDoctorApptCount] = useState(0); // TODO: notifications

  // TODO: restore when notifications are implemented
  // useEffect(() => {
  //   if (userRole.toLowerCase() !== 'doctor' || !currentUser?.id) return;
  //   appointmentService.getByDoctor(currentUser.id, { date: 'today' })
  //     .then(res => {
  //       if (res.success) {
  //         const scheduled = (res.data.appointments || res.data)
  //           .filter(a => a.status === 'scheduled').length;
  //         setDoctorApptCount(scheduled);
  //       }
  //     })
  //     .catch(() => {});
  // }, [userRole, currentUser?.id]);

  const handleLogout = () => {
    navigate("/");
  };

  // TODO: implement real notifications — mock data preserved below for reference
  // const getNotifications = () => { ... };

  // TODO: restore when notifications are implemented
  // const notifications = getNotifications();
  // const mockUnread = notifications.filter((n) => !n.read).length;
  // const unreadCount = userRole.toLowerCase() === 'doctor' ? doctorApptCount : mockUnread;
  // const getNotificationIcon = (type) => { ... };
  // const getNotificationColor = (type, read) => { ... };
  // const handleMarkAsRead = () => { toast.success(...) };
  // const handleMarkAllAsRead = () => { toast.success(...); setNotificationsOpen(false); };

  const menuItems = {
    staff: [
      { name: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
      { name: "Patient Search", path: "/staff/patients", icon: Search },
      { name: "Queue Management", path: "/staff/queue", icon: ClipboardList },
      { name: "Triage", path: "/staff/triage", icon: Stethoscope },
      { name: "Appointments", path: "/staff/appointments", icon: Calendar },
      { name: "Register Patient", path: "/staff/create-patient", icon: UserPlus },
      // { name: "Medical Documents", path: "/staff/medical-documents", icon: FileStack },
    ],
    doctor: [
      { name: "Dashboard", path: "/doctor/dashboard", icon: LayoutDashboard },
      { name: "Patients", path: "/doctor/patients", icon: Users },
      // {
      //   name: "Consultations",
      //   path: "/doctor/consultations",
      //   icon: HeartPulse,
      // },
      // {
      //   name: "Initial Assessment",
      //   path: "/doctor/initial-assessment",
      //   icon: ClipboardList,
      // },
      // {
      //   name: "Physical Exam",
      //   path: "/doctor/physical-exam",
      //   icon: Stethoscope,
      // },
      {
        name: "Glycemic Charts",
        path: "/doctor/glycemic-charts",
        icon: ChartNoAxesCombined,
      },
      { name: "Appointments", path: "/doctor/appointments", icon: Calendar },
      // { name: "Prescriptions", path: "/doctor/prescriptions", icon: Pill },
      // { name: "Reports", path: "/doctor/reports", icon: FileText },
      // { name: "Medical Documents", path: "/doctor/medical-documents", icon: FileStack },
    ],
    patient: [
      { name: "Home", path: "/patient/dashboard", icon: Home },
      { name: "Log Blood Sugar", path: "/patient/log-blood-sugar", icon: Edit },
      { name: "View Trends", path: "/patient/trends", icon: TrendingUp },
      { name: "My Profile", path: "/patient/profile", icon: User },
      { name: "Prescriptions", path: "/patient/prescriptions", icon: Pill },
      {
        name: "Book Appointment",
        path: "/patient/book-appointment",
        icon: Calendar,
      },
      { name: "My Documents", path: "/patient/upload-results", icon: FileText },
    ],
    lab: [
      { name: "Dashboard", path: "/lab/dashboard", icon: LayoutDashboard },
      {
        name: "Pending Tests",
        path: "/lab/pending-tests",
        icon: ClipboardList,
      },
      { name: "Enter Results", path: "/lab/enter-results", icon: Edit },
      { name: "Test History", path: "/lab/test-history", icon: Search },
      {
        name: "Generate Reports",
        path: "/lab/generate-reports",
        icon: FileCheck,
      },
      {
        name: "Critical Alerts",
        path: "/lab/critical-alerts",
        icon: AlertTriangle,
      },
    ],
    admin: [
      { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Create Doctor", path: "/admin/create-doctor", icon: HeartPulse },
      { name: "Create Staff", path: "/admin/create-staff", icon: Users },
      { name: "Create Lab Tech", path: "/admin/create-lab", icon: TestTube },
      { name: "Create Patient", path: "/admin/create-patient", icon: UserPlus },
      { name: "Manage Users", path: "/admin/manage-users", icon: UserCog },
      { name: "System Settings", path: "/admin/settings", icon: Settings },
    ],
  };

  const currentMenu = menuItems[userRole.toLowerCase()] || menuItems.staff;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        fixed lg:static inset-y-0 left-0 z-30
        w-72 bg-gradient-to-b from-blue-600 to-blue-800 text-white 
        transition-transform duration-300 shadow-2xl
      `}
      >
        <div className="p-6 flex items-center justify-between border-b border-blue-500">
          {/* LEFT SIDE - Logo and Text */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(`/${userRole.toLowerCase()}/dashboard`)}
          >
            {/* Logo */}
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
              <img
                src={logo}
                alt="CDC Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {/* Text */}
            <div>
              <h2 className="text-xl font-bold">CDC HMS</h2>
              <p className="text-xs text-blue-200 mt-0.5">{userRole} Portal</p>
            </div>
          </div>

          {/* RIGHT SIDE - Close Button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-blue-700 p-2 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-6">
          {currentMenu.filter(item => !item.path.includes('change-password')).map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center px-6 py-4 
                  transition-all duration-200 
                  border-l-4 group
                  ${
                    isActive
                      ? "bg-blue-700 border-cyan-400 text-white" // ← ACTIVE STATE
                      : "border-transparent hover:bg-blue-700 hover:border-cyan-400" // ← INACTIVE STATE
                  }
                `}
                // className="w-full flex items-center px-6 py-4 hover:bg-blue-700 transition-all duration-200 border-l-4 border-transparent hover:border-cyan-400 group"
              >
                <IconComponent
                  size={24}
                  strokeWidth={2}
                  className={`
                    transition-colors
                    ${
                      isActive
                        ? "text-white" // ← ACTIVE ICON COLOR
                        : "text-blue-200 group-hover:text-white" // ← INACTIVE ICON COLOR
                    }
                  `}
                />
                <span
                  className={`
                  ml-4 font-medium text-lg
                  ${isActive ? "font-bold" : ""} 
                `}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Logout — mobile sidebar only */}
        <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 border-t border-blue-500">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="fixed top-0 left-0 right-0 z-30 lg:static bg-white shadow-lg px-4 lg:px-8 py-4 flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-700 hover:text-primary hover:bg-gray-100 p-2 rounded-lg transition"
          >
            <Menu size={30} />
          </button>

          <h1 className="text-xl lg:text-3xl font-bold text-gray-800">
            Welcome, <span className="text-primary">{userRole}</span>
          </h1>

          <div className="flex items-center gap-3 lg:gap-6">
            {/* Admin Portal Switcher */}
            {userRole.toLowerCase() === 'admin' && (
              <div className="relative">
                <button
                  onClick={() => setPortalSwitcherOpen(!portalSwitcherOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg hover:border-primary transition text-sm font-semibold text-gray-700"
                >
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">Switch Portal</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {portalSwitcherOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPortalSwitcherOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      {portalOptions.map(({ label, path }) => (
                        <button
                          key={path}
                          onClick={() => { navigate(path); setPortalSwitcherOpen(false); }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-primary transition border-b border-gray-100 last:border-0"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Notifications — TODO: implement real notifications later */}
            {/* <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative hover:scale-110 transition-transform p-2 hover:bg-gray-100 rounded-lg"
              >
                <Bell size={24} className="text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center font-bold shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
                    ...
                  </div>
                </>
              )}
            </div> */}

            <div className="hidden md:flex items-center gap-3 bg-gray-100 px-3 lg:px-4 py-2 rounded-lg">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg lg:text-xl shadow-lg">
                {userRole[0]}
              </div>
              <span className="font-semibold text-gray-700 text-sm lg:text-base">
                {userRole} User
              </span>
            </div>

            {userRole.toLowerCase() === 'patient' ? (
              <button
                onClick={() => navigate('/patient/dashboard')}
                className="flex items-center justify-center w-11 h-11 bg-white rounded-full shadow-md p-1 hover:shadow-lg transition"
              >
                <img src={logo} alt="CDC" className="w-full h-full object-contain" />
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-sm lg:text-base" 
              >
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50 mt-[72px] lg:mt-0">
          {isAdminViewing && (
            <div className="mb-6 flex items-center justify-between bg-orange-50 border-2 border-orange-300 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <span className="text-sm font-bold text-orange-800">
                  Admin Mode · Viewing {userRole} Portal
                </span>
              </div>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="text-sm font-semibold text-orange-700 hover:text-orange-900 underline whitespace-nowrap ml-4"
              >
                ← Back to Admin
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
