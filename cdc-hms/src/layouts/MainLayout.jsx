import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Add useLocation
import { useState } from "react";
import useSessionTimeout from "../hooks/useSessionTimeout";
import SessionTimeoutWarning from "../components/shared/SessionTimeoutWarning";
// import { useEffect } from "react"; // TODO: restore when notifications are implemented
// import appointmentService from "../services/appointmentService"; // TODO: restore for notification badge
import { useUserContext } from "../contexts/UserContext";
import { canAccessAdmin } from "../utils/permissions";
import NotificationBell from "../components/shared/NotificationBell";
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
  BedDouble,
  Home,
  Edit,
  TrendingUp,
  User,
  Calendar,
  CalendarCheck,
  Upload,
  TestTube,
  FileCheck,
  AlertTriangle,
  UserCog,
  Settings,
  ShieldAlert,
  Bell,
  Menu,
  X,
  // CheckCircle, // TODO: notifications
  // Info,        // TODO: notifications
  // AlertCircle, // TODO: notifications
  LogOut,
  ShieldCheck,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  FileStack,
  Package,
  KeyRound,
} from "lucide-react";
import logo from "../assets/cdc_web_logo1.svg";

const MainLayout = ({ userRole = "Staff" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useUserContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop-only icon rail. Defaults to collapsed; the pinned state is
  // persisted across reloads and portals. `false` here means "pinned open".
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") !== "false"
  );
  // Desktop hover expands the rail without changing the pinned preference.
  const [hovered, setHovered] = useState(false);
  // Effective visual state: a pinned-collapsed rail looks expanded while hovered.
  const isCollapsed = collapsed && !hovered;
  const [portalSwitcherOpen, setPortalSwitcherOpen] = useState(false);

  const toggleCollapsed = () => {
    // Any collapse/expand of the rail closes the portal dropdown — the narrow icon
    // rail can't show it, and it would otherwise render clipped.
    setPortalSwitcherOpen(false);
    setCollapsed((prev) => {
      localStorage.setItem("sidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  // Someone with admin capabilities looking at another portal. Capability, not
  // role: a granted staff member gets the same banner as the admin does.
  const isAdminViewing = canAccessAdmin(currentUser) && userRole.toLowerCase() !== 'admin';

  // Session timeout — enabled for all roles except patient
  const sessionTimeoutEnabled = currentUser?.role !== 'patient';
  const { showWarning, countdown, resetTimer } = useSessionTimeout(sessionTimeoutEnabled);

  // Portals reachable from the logo switcher. Every portal is listed; the one the
  // user is currently in is filtered out at render time.
  const portalOptions = [
    { label: 'Admin Portal', path: '/admin/dashboard', icon: ShieldCheck },
    { label: 'Doctor Portal', path: '/doctor/dashboard', icon: Stethoscope },
    { label: 'Staff Portal', path: '/staff/dashboard', icon: Users },
    { label: 'Lab Portal', path: '/lab/dashboard', icon: TestTube },
  ];

  // Capability gate for switching portals — backed by the real permission system:
  // anyone with admin capability (role admin, or a granted user) can switch.
  const canSwitchPortal = canAccessAdmin(currentUser);

  // Logo click: opens the portal dropdown for those who may switch; otherwise it
  // is a shortcut back to the current portal's dashboard.
  const handleLogoClick = () => {
    if (canSwitchPortal) {
      setPortalSwitcherOpen((open) => !open);
      setOpenGroups({}); // single-open: opening the switcher closes any open nav group
    } else {
      navigate(`/${userRole.toLowerCase()}/dashboard`);
      setSidebarOpen(false);
    }
  };
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

  // Actually sign out, then leave.
  //
  // This used to navigate("/") and nothing else, so the token and the stored
  // user survived: you landed on the login page still authenticated. It looked
  // like a logout only because the login page happened to render. Once the
  // login page started redirecting a signed-in user to their dashboard, the
  // same click began bouncing straight back into the portal — and a shared
  // machine could be handed over with the previous session still live.
  //
  // logout() invalidates the token server-side and clears sessionStorage; it
  // has existed on the context all along and was simply never called.
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Display name + initials for the sidebar user footer (moved out of the old topbar)
  const displayName = currentUser?.name || `${userRole} User`;
  const initials = (
    currentUser?.name
      ? currentUser.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("")
      : userRole[0]
  ).toUpperCase();

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

  // Stocks appears only for users the admin has granted stock access
  // (admins always — their auth profile carries canManageStock: true).
  // Hiding the link is UX; the API is guarded server-side regardless.
  const hasStockAccess = !!currentUser?.canManageStock;
  const stockEntry = (portal) =>
    hasStockAccess ? [{ name: "Stocks", path: `/${portal}/stock`, icon: Package }] : [];

  const menuItems = {
    staff: [
      { name: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
      { name: "Patient Search", path: "/staff/patients", icon: Search },
      { name: "Queue Management", path: "/staff/queue", icon: ClipboardList },
      { name: "Triage", path: "/staff/triage", icon: Stethoscope },
      { name: "Appointments", path: "/staff/appointments", icon: Calendar },
      { name: "Book Appointment", path: "/staff/book-appointment", icon: CalendarCheck },
      { name: "Register Patient", path: "/staff/create-patient", icon: UserPlus },
      { name: "Patient Visits", path: "/staff/patient-visits", icon: TrendingUp },
      ...stockEntry("staff"),
      { name: "Admissions", path: "/staff/inpatient-admissions", icon: BedDouble },
      // { name: "Medical Documents", path: "/staff/medical-documents", icon: FileStack },
      { name: "Change Password", path: "/staff/change-password", icon: KeyRound },
    ],
    doctor: [
      { name: "Dashboard", path: "/doctor/dashboard", icon: LayoutDashboard },
      { name: "Patients", path: "/doctor/patients", icon: Users },
      { name: "Ward Board", path: "/inpatient/board", icon: BedDouble },
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
      { name: "Appointments", path: "/doctor/appointments", icon: Calendar },
      { name: "My Schedule", path: "/doctor/my-schedule", icon: CalendarCheck },
      { name: "Patient Visits", path: "/doctor/patient-visits", icon: TrendingUp },
      ...stockEntry("doctor"),
      // { name: "Prescriptions", path: "/doctor/prescriptions", icon: Pill },
      // { name: "Reports", path: "/doctor/reports", icon: FileText },
      // { name: "Medical Documents", path: "/doctor/medical-documents", icon: FileStack },
      { name: "Change Password", path: "/doctor/change-password", icon: KeyRound },
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
      { name: "Change Password", path: "/patient/change-password", icon: KeyRound },
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
      { name: "Change Password", path: "/lab/change-password", icon: KeyRound },
    ],
    // HMIS V3 — nurse portal (inpatient home + OPD nursing work)
    nurse: [
      { name: "Ward Board", path: "/nurse/dashboard", icon: BedDouble },
      { name: "Queue Management", path: "/nurse/queue", icon: ClipboardList },
      { name: "Triage", path: "/nurse/triage", icon: Stethoscope },
    ],
    // HMIS V3 — inpatient workspace (entered by doctors + nurses via the switcher)
    inpatient: [
      { name: "Ward Board", path: "/inpatient/board", icon: BedDouble },
    ],
    // An entry is a leaf ({ name, path, icon }) or a group
    // ({ name, icon, children: [...leaves] }) rendered as an expandable section.
    admin: [
      { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      {
        name: "Users",
        icon: Users,
        children: [
          { name: "Create Users", path: "/admin/create-users", icon: UserPlus },
          { name: "Manage Users", path: "/admin/manage-users", icon: UserCog },
          { name: "Duplicate Patients", path: "/admin/duplicate-patients", icon: Copy },
        ],
      },
      { name: "Medical Documents", path: "/admin/medical-documents", icon: FileStack },
      { name: "Clinical Catalog", path: "/admin/catalog", icon: Pill },
      { name: "Stocks", path: "/admin/stock", icon: Package },
      { name: "Ward Config", path: "/admin/ward-config", icon: BedDouble },
      {
        name: "Monitoring",
        icon: Activity,
        children: [
          { name: "Activity Log", path: "/admin/activity-log", icon: ShieldAlert },
          { name: "Analytics", path: "/admin/analytics", icon: TrendingUp },
          { name: "Patient Visits", path: "/admin/patient-visits", icon: ClipboardList },
        ],
      },
      {
        name: "Settings",
        icon: Settings,
        children: [
          // /admin/settings holds the staff password rotation policy.
          { name: "System Settings", path: "/admin/settings", icon: Settings },
          { name: "Change Password", path: "/admin/change-password", icon: KeyRound },
        ],
      },
    ],
  };

  const currentMenu = menuItems[userRole.toLowerCase()] || menuItems.staff;

  // Expanded menu groups. Defaults to open for the group holding the current
  // page so the active item is visible on load; after that the user decides.
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(
      currentMenu
        .filter((item) => item.children)
        .map((group) => [
          group.name,
          group.children.some((child) => child.path === location.pathname),
        ])
    )
  );

  // Single-open accordion: opening one nav dropdown closes the others (and the
  // portal switcher, which is itself a nav dropdown). See DRY-GUIDELINES §4f.
  const toggleGroup = (name) => {
    setPortalSwitcherOpen(false);
    setOpenGroups((prev) => (prev[name] ? {} : { [name]: true }));
  };

  // A single navigable menu entry. `nested` indents it under a group header.
  const renderLeaf = (item, nested = false) => {
    const IconComponent = item.icon;
    const isActive = location.pathname === item.path;
    // Indentation is meaningless in the collapsed icon rail, where group
    // headers are hidden and children show as plain centered icons.
    const indentCls = nested && !isCollapsed ? "pl-12 lg:pl-14" : "";
    return (
      <button
        key={item.path}
        onClick={() => {
          navigate(item.path);
          setSidebarOpen(false);
          setPortalSwitcherOpen(false);
        }}
        title={item.name}
        className={`
          w-full flex items-center overflow-hidden px-6 py-4 ${indentCls}
          ${isCollapsed ? "md:px-0 md:justify-center" : ""}
          transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          border-l-4 group
          ${
            isActive
              ? "bg-blue-700 border-cyan-400 text-white" // ← ACTIVE STATE
              : "border-transparent hover:bg-blue-700 hover:border-cyan-400" // ← INACTIVE STATE
          }
        `}
      >
        <IconComponent
          size={nested ? 20 : 24}
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
          ml-4 font-medium whitespace-nowrap ${nested ? "text-base" : "text-lg"}
          ${isCollapsed ? "md:hidden" : ""}
          ${isActive ? "font-bold" : ""}
        `}
        >
          {item.name}
        </span>
      </button>
    );
  };

  // A collapsible section header plus its children.
  const renderGroup = (groupItem) => {
    const GroupIcon = groupItem.icon;
    const hasActiveChild = groupItem.children.some(
      (child) => child.path === location.pathname
    );
    const isOpen = !!openGroups[groupItem.name];
    return (
      <div key={groupItem.name}>
        {/* Header — hidden in the collapsed rail, where children stand alone */}
        <button
          onClick={() => toggleGroup(groupItem.name)}
          title={groupItem.name}
          className={`
            w-full flex items-center overflow-hidden px-6 py-4
            ${isCollapsed ? "md:hidden" : ""}
            transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            border-l-4 border-transparent hover:bg-blue-700 group
          `}
        >
          <GroupIcon
            size={24}
            strokeWidth={2}
            className={`transition-colors ${
              hasActiveChild ? "text-white" : "text-blue-200 group-hover:text-white"
            }`}
          />
          <span
            className={`ml-4 flex-1 text-left font-medium text-lg whitespace-nowrap ${
              hasActiveChild ? "font-bold" : ""
            }`}
          >
            {groupItem.name}
          </span>
          <ChevronDown
            size={18}
            className={`text-blue-200 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Children show when the group is open, and always in the rail */}
        {(isOpen || isCollapsed) &&
          groupItem.children.map((child) => renderLeaf(child, true))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on desktop so hover-expand floats over content.
          Now a full-height flex column: header · nav · user/actions footer. */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          // Leaving a pinned-collapsed rail shrinks it back to icons — close the
          // portal dropdown so it doesn't linger clipped in the narrow rail.
          if (collapsed) setPortalSwitcherOpen(false);
        }}
        className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)] md:translate-x-0"}
        fixed inset-y-4 left-4 z-30 flex flex-col overflow-hidden rounded-[20px]
        w-72 ${isCollapsed ? "md:w-20" : "md:w-72"}
        bg-gradient-to-b from-blue-600 to-blue-800 text-white
        transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-2xl
      `}
      >
        <div className={`relative px-6 pt-6 transition-[padding] duration-200 ${portalSwitcherOpen ? "pb-1" : "pb-6"} ${isCollapsed ? "md:p-3" : ""} flex items-center justify-between ${isCollapsed ? "md:justify-center" : ""}`}>
          {/* LEFT SIDE — Logo + text, spanning the full rail width. Acts as the portal
              switcher when the user may switch (canSwitchPortal); else a dashboard shortcut. */}
          <button
            type="button"
            onClick={handleLogoClick}
            title={canSwitchPortal ? "Switch portal" : "Go to dashboard"}
            aria-haspopup={canSwitchPortal ? "menu" : undefined}
            aria-expanded={canSwitchPortal ? portalSwitcherOpen : undefined}
            className={`flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl px-3 py-2 transition hover:bg-blue-700/40 ${isCollapsed ? "md:flex-none md:justify-center md:px-0" : ""}`}
          >
            {/* Logo */}
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg p-2 flex-shrink-0">
              <img
                src={logo}
                alt="CDC Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {/* Text */}
            <div className={`min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
              <h2 className="text-xl font-bold truncate">CDC HMS</h2>
              <p className="text-xs text-blue-200 mt-0.5 truncate">{userRole} Portal</p>
            </div>
            {/* Switcher affordance — pushed to the far right of the full-width button */}
            {canSwitchPortal && (
              <ChevronDown
                size={18}
                className={`ml-auto flex-shrink-0 text-blue-200 transition-transform duration-200 ${isCollapsed ? "md:hidden" : ""} ${portalSwitcherOpen ? "rotate-180" : ""}`}
              />
            )}
          </button>

          {/* RIGHT SIDE - Close Button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden ml-2 text-white hover:bg-blue-700 p-2 rounded-lg flex-shrink-0"
          >
            <X size={20} />
          </button>

        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {/* Portal switcher — opened from the logo. Renders inline and pushes the menu
              down, exactly like the nav group dropdowns (reuses renderLeaf). Negative
              top margin cancels the nav's top padding so it sits right under the logo. */}
          {canSwitchPortal && portalSwitcherOpen && (
            <div className="-mt-4">
              {portalOptions
                .filter(({ path }) => !path.startsWith(`/${userRole.toLowerCase()}/`))
                .map(({ label, path, icon }) => renderLeaf({ name: label, path, icon }, true))}
            </div>
          )}
          {currentMenu
            .filter((item) => !item.path?.includes("change-password"))
            .map((item) => (item.children ? renderGroup(item) : renderLeaf(item)))}
        </nav>

        {/* ── Footer: everything that used to live in the topbar ──────────── */}
        <div>
          {/* User identity */}
          <div className={`flex items-center gap-3 px-4 pt-3 pb-2 ${isCollapsed ? "md:justify-center md:px-0" : ""}`}>
            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
              {initials}
            </div>
            <div className={`min-w-0 flex-1 ${isCollapsed ? "md:hidden" : ""}`}>
              <p className="font-semibold text-sm text-white truncate">{displayName}</p>
              <p className="text-xs text-blue-200">{userRole} Portal</p>
            </div>
          </div>

          {/* Action icons — notifications + logout (or home for patients), lined up
              horizontally below the avatar; stack as icons in the collapsed rail */}
          <div className={`flex items-center gap-2 px-4 pb-3 ${isCollapsed ? "md:flex-col md:px-0" : ""}`}>
            <NotificationBell userRole={userRole} />
            {/* HMIS V3 — workspace switcher for doctors & nurses (Outpatient <-> Inpatient) */}
            {["doctor", "nurse"].includes(currentUser?.role) && (
              <button
                onClick={() =>
                  navigate(
                    userRole.toLowerCase() === "inpatient"
                      ? (currentUser?.role === "nurse" ? "/nurse/dashboard" : "/doctor/dashboard")
                      : "/inpatient/board"
                  )
                }
                title={userRole.toLowerCase() === "inpatient" ? "Go to Outpatient" : "Go to Inpatient"}
                aria-label="Switch workspace"
                className="p-2 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                <BedDouble className="w-5 h-5" />
              </button>
            )}
            {userRole.toLowerCase() === "patient" ? (
              <button
                onClick={() => navigate("/patient/dashboard")}
                title="Home"
                aria-label="Home"
                className="p-2 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Home className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                className="p-2 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                <LogOut className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Collapse toggle — desktop only */}
          <div className="hidden md:block">
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
              className={`w-full flex items-center px-6 py-3 ${isCollapsed ? "justify-center px-0" : ""} text-blue-200 hover:text-white hover:bg-blue-700 transition-all duration-200`}
            >
              {/* The panel glyph says what the control acts on, which a bare
                  chevron does not: a rail with the arrow pointing out of it to
                  open, back into it to collapse. */}
              {collapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
              <span className={`ml-4 font-medium ${isCollapsed ? "hidden" : ""}`}>
                {collapsed ? "Pin open" : "Collapse"}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop spacer — reserves the floating rail's resting footprint
          (left gap + rail width + a right gap) so the hover-expand overlays
          content instead of shifting it */}
      <div
        className={`hidden md:block flex-shrink-0 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          collapsed ? "w-[6.75rem]" : "w-[19.75rem]"
        }`}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Slim mobile bar — desktop has no top bar at all now.
            Exists only to open the sidebar drawer on small screens. */}
        <header className="md:hidden fixed top-3 left-4 right-4 z-20 h-14 bg-white shadow-lg border border-gray-200 rounded-2xl px-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-700 hover:text-primary hover:bg-gray-100 p-2 rounded-lg transition"
          >
            <Menu size={26} />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="CDC" className="w-7 h-7 object-contain" />
            <span className="font-bold text-gray-800">CDC HMS</span>
          </div>
          {/* Spacer keeps the title centred (bell/actions live in the drawer) */}
          <span className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar overscroll-contain px-4 pb-4 pt-3 lg:px-8 lg:pb-8 lg:pt-4 bg-gray-50 mt-[4.75rem] md:mt-0">
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

      {showWarning && (
        <SessionTimeoutWarning
          countdown={countdown}
          onStayLoggedIn={resetTimer}
        />
      )}
    </div>
  );
};

export default MainLayout;
