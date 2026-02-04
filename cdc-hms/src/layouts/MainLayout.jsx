import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Add useLocation
import { useState } from "react";
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
  Bell,
  Menu,
  X,
  CheckCircle,
  Info,
  AlertCircle,
  ChartNoAxesCombined,
  FileStack
} from "lucide-react";
import logo from "../assets/cdc_web_logo1.svg";

const MainLayout = ({ userRole = "Staff" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    navigate("/");
  };

  // Mock notifications data - different for each role
  const getNotifications = () => {
    switch (userRole.toLowerCase()) {
      case "staff":
        return [
          {
            id: 1,
            type: "alert",
            title: "New Patient Registration",
            message: "John Doe (CDC001) registered successfully",
            time: "5 min ago",
            read: false,
          },
          {
            id: 2,
            type: "info",
            title: "Queue Update",
            message: "8 patients waiting in triage",
            time: "15 min ago",
            read: false,
          },
          {
            id: 3,
            type: "success",
            title: "Triage Complete",
            message: "Mary Johnson vitals recorded",
            time: "1 hour ago",
            read: true,
          },
        ];

      case "doctor":
        return [
          {
            id: 1,
            type: "alert",
            title: "Critical Lab Result",
            message: "HbA1c 10.2% for John Doe (CDC001)",
            time: "2 min ago",
            read: false,
          },
          {
            id: 2,
            type: "info",
            title: "Appointment Reminder",
            message: "Mary Johnson at 2:00 PM today",
            time: "30 min ago",
            read: false,
          },
          {
            id: 3,
            type: "success",
            title: "Prescription Filled",
            message: "Metformin prescription for Ali Hassan",
            time: "2 hours ago",
            read: true,
          },
          {
            id: 4,
            type: "info",
            title: "Lab Results Available",
            message: "Lipid profile for Grace Wanjiru",
            time: "3 hours ago",
            read: true,
          },
        ];

      case "patient":
        return [
          {
            id: 1,
            type: "info",
            title: "Appointment Confirmed",
            message: "Dr. Ahmed Hassan on Dec 15 at 10:00 AM",
            time: "1 hour ago",
            read: false,
          },
          {
            id: 2,
            type: "success",
            title: "Lab Results Ready",
            message: "Your HbA1c test results are available",
            time: "1 day ago",
            read: false,
          },
          {
            id: 3,
            type: "alert",
            title: "Medication Reminder",
            message: "Time to refill your Metformin prescription",
            time: "2 days ago",
            read: true,
          },
        ];

      case "lab":
        return [
          {
            id: 1,
            type: "alert",
            title: "Urgent Test",
            message: "Fasting Glucose for Mary Johnson (CDC005)",
            time: "5 min ago",
            read: false,
          },
          {
            id: 2,
            type: "alert",
            title: "Critical Result",
            message: "Creatinine 3.5 for Grace Wanjiru - Notify doctor",
            time: "30 min ago",
            read: false,
          },
          {
            id: 3,
            type: "info",
            title: "Sample Collected",
            message: "HbA1c sample for John Doe ready for processing",
            time: "1 hour ago",
            read: false,
          },
          {
            id: 4,
            type: "success",
            title: "Report Generated",
            message: "Quest Labs report for Ali Hassan",
            time: "2 hours ago",
            read: true,
          },
        ];

      case "admin":
        return [
          {
            id: 1,
            type: "alert",
            title: "New Doctor Application",
            message: "Dr. James Omondi pending approval",
            time: "10 min ago",
            read: false,
          },
          {
            id: 2,
            type: "info",
            title: "System Update",
            message: "New security patch available",
            time: "1 hour ago",
            read: false,
          },
          {
            id: 3,
            type: "success",
            title: "Backup Complete",
            message: "Daily backup completed successfully",
            time: "2 hours ago",
            read: true,
          },
        ];

      default:
        return [];
    }
  };

  const notifications = getNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case "success":
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case "info":
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return <Bell className="w-6 h-6 text-gray-500" />;
    }
  };

  const getNotificationColor = (type, read) => {
    if (read) return "bg-gray-50 border-gray-200";

    switch (type) {
      case "alert":
        return "bg-red-50 border-red-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const handleMarkAsRead = (notificationId) => {
    alert(`Notification ${notificationId} marked as read`);
  };

  const handleMarkAllAsRead = () => {
    alert("All notifications marked as read");
    setNotificationsOpen(false);
  };

  const menuItems = {
    staff: [
      { name: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
      { name: "Patient Search", path: "/staff/patients", icon: Search },
      { name: "Queue Management", path: "/staff/queue", icon: ClipboardList },
      { name: "Triage", path: "/staff/triage", icon: Stethoscope },
      {
        name: "Register Patient",
        path: "/staff/create-patient",
        icon: UserPlus,
      },
      { name: "Medical Documents", path: "/staff/medical-documents", icon: FileStack },
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
        icon: ChartNoAxesCombined ,
      },
      // { name: "Prescriptions", path: "/doctor/prescriptions", icon: Pill },
      { name: "Reports", path: "/doctor/reports", icon: FileText },
      { name: "Medical Documents", path: "/doctor/medical-documents", icon: FileStack },
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
      { name: "Upload Results", path: "/patient/upload-results", icon: Upload },
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
          <div className="flex items-center gap-3">
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
          {currentMenu.map((item) => {
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white shadow-lg px-4 lg:px-8 py-4 flex items-center justify-between">
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
            {/* Notifications */}
            <div className="relative">
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

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  ></div>

                  {/* Dropdown Panel */}
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b-2 border-gray-200 bg-gradient-to-r from-primary to-blue-600 text-white">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg">Notifications</h3>
                        <span className="px-2 py-1 bg-white text-primary rounded-full text-xs font-bold">
                          {unreadCount} new
                        </span>
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell
                            size={48}
                            className="mx-auto text-gray-300 mb-2"
                          />
                          <p className="text-gray-500">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-4 hover:bg-gray-50 transition cursor-pointer border-l-4 ${getNotificationColor(
                                notif.type,
                                notif.read
                              )}`}
                              onClick={() => handleMarkAsRead(notif.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  {getNotificationIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p
                                      className={`text-sm font-bold ${
                                        notif.read
                                          ? "text-gray-600"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {notif.title}
                                    </p>
                                    {!notif.read && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                                    )}
                                  </div>
                                  <p
                                    className={`text-xs mt-1 ${
                                      notif.read
                                        ? "text-gray-500"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {notif.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {notif.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t-2 border-gray-200 bg-gray-50">
                        <button
                          onClick={handleMarkAllAsRead}
                          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                        >
                          Mark All as Read
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3 bg-gray-100 px-3 lg:px-4 py-2 rounded-lg">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg lg:text-xl shadow-lg">
                {userRole[0]}
              </div>
              <span className="font-semibold text-gray-700 text-sm lg:text-base">
                {userRole} User
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-sm lg:text-base"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
