import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Add useLocation
import { useState, useEffect } from "react";
import useSessionTimeout from "../hooks/useSessionTimeout";
import SessionTimeoutWarning from "../components/shared/SessionTimeoutWarning";
// import { useEffect } from "react"; // TODO: restore when notifications are implemented
// import appointmentService from "../services/appointmentService"; // TODO: restore for notification badge
import { useUserContext } from "../contexts/UserContext";
import { canAccessAdmin, hasPermission, PERMISSIONS } from "../utils/permissions";
import PageTabs from "../components/shared/PageTabs";
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
  Waves,
  Scan,
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
  // Profile footer — the action icons (bell, logout, …) stay hidden behind the
  // profile row; the chevron (or the avatar, in the collapsed rail) reveals them.
  const [profileOpen, setProfileOpen] = useState(false);
  // Collapsing the sidebar (pinning it, or the hover-expand ending) tucks the
  // profile menu away too — the rail always returns to just the avatar.
  useEffect(() => {
    if (isCollapsed) setProfileOpen(false);
  }, [isCollapsed]);

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
  // The doctor/staff dashboard switcher. Carries Dashboard, plus an Inpatient
  // Dashboard tab for users with inpatient access — doctors by role, others by the
  // admin-granted inpatient.access capability (admins hold it implicitly). Patient
  // Visits used to live here but now rides in the Appointments group for both the
  // doctor and staff portals. Every tab stays INSIDE the current portal (the board
  // renders at /{portal}/inpatient-board), so the sidebar never changes. Nurses
  // keep their own ward-board home.
  const homeRole = userRole.toLowerCase();
  // Only these portals actually mount an /{portal}/inpatient-board route (App.jsx).
  // The nurse and inpatient portals do NOT: a nurse's own dashboard IS the ward
  // board, and the inpatient workspace has /inpatient/board. Generating the tab
  // path from homeRole without this check produced /nurse/inpatient-board and
  // /inpatient/inpatient-board — links straight to NotFound.
  const PORTALS_WITH_INPATIENT_BOARD = ['staff', 'doctor', 'lab'];
  const canSeeInpatientTab =
    PORTALS_WITH_INPATIENT_BOARD.includes(homeRole) &&
    (currentUser?.role === 'doctor' || hasPermission(currentUser, PERMISSIONS.INPATIENT_ACCESS));

  const dashboardTabs = [
    {
      label: canSeeInpatientTab ? 'Outpatient Dashboard' : 'Dashboard',
      path: `/${homeRole}/dashboard`,
      Icon: canSeeInpatientTab ? Stethoscope : LayoutDashboard,
    },
    ...(canSeeInpatientTab
      ? [{ label: 'Inpatient Dashboard', path: `/${homeRole}/inpatient-board`, Icon: BedDouble }]
      : []),
  ];
  // Grouped pages that share one top-of-page switcher instead of separate sidebar
  // entries (decongests the side nav). Each group lists the routes it covers; the
  // first group containing the current route renders. Add a group here to collapse
  // more sidebar items into tabs.
  const switcherGroups = [
    {
      // Doctor/staff dashboard: Dashboard (+ Inpatient if permitted) + Patient Visits.
      show: homeRole !== 'admin' && dashboardTabs.length >= 2,
      tabs: dashboardTabs,
    },
    {
      // Doctor appointments: schedule + the visit report share the Appointments page.
      show: homeRole === 'doctor',
      tabs: [
        { label: 'Appointments', path: '/doctor/appointments', Icon: Calendar },
        { label: 'My Schedule', path: '/doctor/my-schedule', Icon: CalendarCheck },
        { label: 'Patient Visits', path: '/doctor/patient-visits', Icon: TrendingUp },
      ],
    },
    {
      // Staff appointments: booking + the visit report share the Appointments page.
      show: homeRole === 'staff',
      tabs: [
        { label: 'Appointments', path: '/staff/appointments', Icon: Calendar },
        { label: 'Book Appointment', path: '/staff/book-appointment', Icon: CalendarCheck },
        { label: 'Patient Visits', path: '/staff/patient-visits', Icon: TrendingUp },
      ],
    },
    {
      // Staff front desk: the queue, patient search and registration share one page.
      show: homeRole === 'staff',
      tabs: [
        { label: 'Queue Management', path: '/staff/queue', Icon: ClipboardList },
        { label: 'Patient Search', path: '/staff/patients', Icon: Search },
        { label: 'Register Patient', path: '/staff/create-patient', Icon: UserPlus },
      ],
    },
    {
      show: homeRole === 'admin',
      tabs: [
        { label: 'Create Users', path: '/admin/create-users', Icon: UserPlus },
        { label: 'Manage Users', path: '/admin/manage-users', Icon: UserCog },
        { label: 'Duplicate Patients', path: '/admin/duplicate-patients', Icon: Copy },
      ],
    },
    {
      show: homeRole === 'admin',
      tabs: [
        { label: 'Activity Log', path: '/admin/activity-log', Icon: ShieldAlert },
        { label: 'Analytics', path: '/admin/analytics', Icon: TrendingUp },
        { label: 'Patient Visits', path: '/admin/patient-visits', Icon: ClipboardList },
      ],
    },
    {
      show: homeRole === 'admin',
      tabs: [
        { label: 'System Settings', path: '/admin/settings', Icon: Settings },
        { label: 'Change Password', path: '/admin/change-password', Icon: KeyRound },
      ],
    },
  ];
  // The switcher shows wherever one of its tabs is active (prefix match, so
  // sub-routes like /admin/analytics/doctors still show the Monitoring tabs).
  const matchesTab = (t) =>
    location.pathname === t.path || location.pathname.startsWith(`${t.path}/`);
  const pageTabs =
    switcherGroups.find((g) => g.show && g.tabs.some(matchesTab))?.tabs ?? null;

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
    { label: 'Radiology Suite', path: '/radiology/suite', icon: Scan },
  ];

  // Capability gate for switching portals — backed by the real permission system:
  // anyone with admin capability (role admin, or a granted user) can switch.
  const canSwitchPortal = canAccessAdmin(currentUser);

  // Stocks (to become Pharmacy) lives in the portal list, not the sidebar. Shown
  // to users granted stock access, pointing at the CURRENT portal's stock page so
  // a non-admin stock user isn't sent to an admin-only route. Only portals that
  // actually have a stock route qualify. Hiding the link is UX; the API is guarded
  // server-side regardless.
  const hasStockAccess = !!currentUser?.canManageStock;
  const stockModule = (hasStockAccess && ['admin', 'doctor', 'staff'].includes(userRole.toLowerCase()))
    ? [{ label: 'Stocks', path: `/${userRole.toLowerCase()}/stock`, icon: Package }]
    : [];

  // The switcher pill is shown for portal-switchers OR stock users (their one
  // module lives in the list too).
  const canOpenSwitcher = canSwitchPortal || stockModule.length > 0;

  // Icon + label shown on the switcher pill for the destination the user is
  // currently in (Meta shows the active account's avatar in the same spot).
  // Stocks is a switcher destination that lives under the current portal, so when
  // the user is on a stock route the pill reflects Stocks — otherwise it would
  // fall back to the base portal's icon (e.g. the admin shield) even though the
  // user switched into Stocks.
  const onStockRoute = stockModule.length > 0 && location.pathname.includes("/stock");
  const SwitcherIcon = onStockRoute
    ? Package
    : portalOptions.find((p) => p.path.startsWith(`/${userRole.toLowerCase()}/`))?.icon || Stethoscope;
  const switcherLabel = onStockRoute ? "Stocks" : `${userRole} Portal`;

  // Logo is now a plain brand shortcut back to the current portal's dashboard.
  // Portal switching moved out of the logo and into its own pill below the header,
  // so the two concerns no longer share a single click.
  const handleLogoClick = () => {
    navigate(`/${userRole.toLowerCase()}/dashboard`);
    setSidebarOpen(false);
    setPortalSwitcherOpen(false);
  };

  // The Meta-style switcher pill toggles the portal dropdown. Opening it collapses
  // any open nav group (single-open accordion).
  const togglePortalSwitcher = () => {
    setPortalSwitcherOpen((open) => !open);
    setOpenGroups({});
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


  const menuItems = {
    // Radiology is a top-level section, not a role. Reached from the portal
    // switcher; use the switcher to return to another portal.
    radiology: [
      { name: "Patients", path: "/radiology/patients", icon: Users },
      { name: "Radiology Suite", path: "/radiology/suite", icon: Scan },
      { name: "Unassigned Queue", path: "/radiology/unassigned", icon: Waves },
    ],
    staff: [
      { name: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
      // Front-desk group entry — Patient Search + Register Patient ride along as
      // tabs on this page (see switcherGroups). Keeps the sidebar decongested.
      // Triage lives as the second tab inside Queue Management now, not a nav item.
      { name: "Queue Management", path: "/staff/queue", icon: ClipboardList },
      // Appointments group entry — Book Appointment + Patient Visits are its tabs.
      { name: "Appointments", path: "/staff/appointments", icon: Calendar },
      { name: "Admissions", path: "/staff/inpatient-admissions", icon: BedDouble },
      // { name: "Medical Documents", path: "/staff/medical-documents", icon: FileStack },
      { name: "Change Password", path: "/staff/change-password", icon: KeyRound },
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
      { name: "Appointments", path: "/doctor/appointments", icon: Calendar },
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
      // Triage is the second tab inside Queue Management now, not a nav item.
      { name: "Queue Management", path: "/nurse/queue", icon: ClipboardList },
    ],
    // HMIS V3 — inpatient workspace (entered by doctors + nurses via the switcher)
    inpatient: [
      { name: "Ward Board", path: "/inpatient/board", icon: BedDouble },
    ],
    // An entry is a leaf ({ name, path, icon }) or a group
    // ({ name, icon, children: [...leaves] }) rendered as an expandable section.
    admin: [
      { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Users", path: "/admin/manage-users", icon: Users },
      { name: "Medical Documents", path: "/admin/medical-documents", icon: FileStack },
      { name: "Radiology Queue", path: "/admin/unassigned-ultrasound", icon: Waves },
      { name: "Clinical Catalog", path: "/admin/catalog", icon: Pill },
      { name: "Ward Config", path: "/admin/ward-config", icon: BedDouble },
      {
        name: "Monitoring",
        path: "/admin/activity-log",
        icon: Activity,
      },
      {
        name: "Settings",
        path: "/admin/settings",
        icon: Settings,
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
    const indentCls = nested && !isCollapsed ? "pl-6 lg:pl-8" : "";
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
          w-full flex items-center overflow-hidden group px-2 py-0.5 ${indentCls}
          ${isCollapsed ? "md:px-0 md:justify-center" : ""}
          transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        `}
      >
        {/* Filled rounded slot — Meta-style active/hover highlight. A centered
            square in the icon rail, a full-width pill when the rail is expanded. */}
        <span
          className={`
            flex items-center rounded-xl transition-colors duration-200
            ${isCollapsed ? "md:w-10 md:h-10 md:justify-center md:p-0 w-full px-3 py-2.5" : "w-full px-3 py-2.5"}
            ${
              isActive
                ? "bg-white/15 text-white" // ← ACTIVE STATE (filled rounded slot)
                : "text-blue-200 hover:bg-white/10 hover:text-white" // ← INACTIVE STATE
            }
          `}
        >
          <IconComponent
            size={nested ? 18 : 20}
            strokeWidth={2}
            className={`
              flex-shrink-0 transition-colors
              ${
                isActive
                  ? "text-white" // ← ACTIVE ICON COLOR
                  : "text-blue-200 group-hover:text-white" // ← INACTIVE ICON COLOR
              }
            `}
          />
          <span
            className={`
            ml-3 font-medium whitespace-nowrap ${nested ? "text-sm" : "text-base"}
            ${isCollapsed ? "md:hidden" : ""}
            ${isActive ? "font-semibold" : ""}
          `}
          >
            {item.name}
          </span>
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
            w-full flex items-center overflow-hidden px-2 py-0.5
            ${isCollapsed ? "md:hidden" : ""}
            transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            group
          `}
        >
          <span
            className={`
              flex items-center w-full rounded-xl px-3 py-2.5 transition-colors duration-200
              ${hasActiveChild ? "bg-white/15 text-white" : "text-blue-200 hover:bg-white/10 hover:text-white"}
            `}
          >
            <GroupIcon
              size={20}
              strokeWidth={2}
              className={`flex-shrink-0 transition-colors ${
                hasActiveChild ? "text-white" : "text-blue-200 group-hover:text-white"
              }`}
            />
            <span
              className={`ml-3 flex-1 text-left font-medium text-base whitespace-nowrap ${
                hasActiveChild ? "font-semibold" : ""
              }`}
            >
              {groupItem.name}
            </span>
            <ChevronDown
              size={16}
              className={`flex-shrink-0 text-blue-200 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        {/* Children show when the group is open, and always in the rail */}
        {(isOpen || isCollapsed) &&
          groupItem.children.map((child) => renderLeaf(child, true))}
      </div>
    );
  };

  return (
    <div className="app-shell safe-x flex bg-gray-50 overflow-hidden">
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
        fixed top-[calc(1rem+env(safe-area-inset-top,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] z-30 flex flex-col overflow-hidden rounded-[20px]
        w-72 ${isCollapsed ? "md:w-16" : "md:w-72"}
        bg-gradient-to-b from-blue-600 to-blue-800 text-white
        transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-2xl
      `}
      >
        <div className={`relative px-6 pt-6 transition-[padding] duration-200 ${canOpenSwitcher ? "pb-3" : "pb-6"} ${isCollapsed ? "md:p-2" : ""} flex items-center justify-between ${isCollapsed ? "md:justify-center" : ""}`}>
          {/* LEFT SIDE — Logo + brand. A plain shortcut back to the dashboard; portal
              switching now lives in the pill below (see the switcher pill). */}
          <button
            type="button"
            onClick={handleLogoClick}
            title="Go to dashboard"
            className={`flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl px-3 py-2 transition hover:bg-blue-700/40 ${isCollapsed ? "md:flex-none md:justify-center md:px-0" : ""}`}
          >
            {/* Logo */}
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg p-1.5 flex-shrink-0">
              <img
                src={logo}
                alt="CDC Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {/* Text — the portal name drops when the switcher pill carries it */}
            <div className={`min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
              <h2 className="text-xl font-bold truncate">CDC HMS</h2>
              {!canOpenSwitcher && (
                <p className="text-xs text-blue-200 mt-0.5 truncate">{userRole} Portal</p>
              )}
            </div>
          </button>

          {/* RIGHT SIDE - Close Button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden ml-2 text-white hover:bg-blue-700 p-2 rounded-lg flex-shrink-0"
          >
            <X size={20} />
          </button>

        </div>

        {/* ── Portal switcher pill (Meta-style) ───────────────────────────────
            Sits under the logo, separate from it. Full-width bordered pill when
            the rail is expanded; a single centered icon button in the icon rail.
            Only rendered for users who can actually switch (or stock users). */}
        {canOpenSwitcher && (
          <div className={`px-4 pb-3 ${isCollapsed ? "md:px-0 md:flex md:justify-center" : ""}`}>
            <button
              type="button"
              onClick={togglePortalSwitcher}
              title="Switch portal"
              aria-haspopup="menu"
              aria-expanded={portalSwitcherOpen}
              className={`
                w-full flex items-center gap-3 rounded-xl px-3 py-2.5
                bg-white/10 hover:bg-white/[0.17] border border-white/15 transition-colors
                ${isCollapsed ? "md:w-10 md:h-10 md:p-0 md:gap-0 md:justify-center md:border-white/10" : ""}
              `}
            >
              <span className="w-7 h-7 flex-shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <SwitcherIcon size={16} className="text-white" />
              </span>
              <span className={`min-w-0 flex-1 text-left text-sm font-medium text-white truncate ${isCollapsed ? "md:hidden" : ""}`}>
                {switcherLabel}
              </span>
              <ChevronDown
                size={16}
                className={`flex-shrink-0 text-blue-200 transition-transform duration-200 ${isCollapsed ? "md:hidden" : ""} ${portalSwitcherOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4">
          {/* Portal switcher — opened from the switcher pill above. Renders inline and
              pushes the menu down, exactly like the nav group dropdowns (reuses
              renderLeaf). Negative top margin cancels the nav's top padding so the list
              sits right under the pill. */}
          {canOpenSwitcher && portalSwitcherOpen && (
            <div className="-mt-4">
              {/* Every portal the user can switch to. Normally the portal you're in
                  is hidden — but Stocks is a sub-page OF a portal, so on a stock
                  route the base portal is NOT where you are and must stay listed,
                  otherwise it looks like the portal vanished. */}
              {canSwitchPortal && portalOptions
                .filter(({ path }) => onStockRoute || !path.startsWith(`/${userRole.toLowerCase()}/`))
                .map(({ label, path, icon }) => renderLeaf({ name: label, path, icon }, true))}
              {/* Stocks is the current destination on a stock route, so drop it there
                  — unless it's the only thing the switcher can offer (a stock-only
                  user who can't switch portals), where hiding it leaves an empty menu. */}
              {(!onStockRoute || !canSwitchPortal) &&
                stockModule.map(({ label, path, icon }) => renderLeaf({ name: label, path, icon }, true))}
            </div>
          )}
          {currentMenu
            .filter((item) => !item.path?.includes("change-password"))
            .map((item) => (item.children ? renderGroup(item) : renderLeaf(item)))}
        </nav>

        {/* ── Footer: everything that used to live in the topbar ──────────── */}
        <div>
          {/* Profile row — clicking it (chevron expanded, avatar in the collapsed
              rail) reveals the action icons below. */}
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            aria-expanded={profileOpen}
            aria-label="Profile menu"
            className={`w-full flex items-center gap-2 px-4 pt-3 pb-2 text-left hover:bg-white/5 transition-colors ${isCollapsed ? "md:justify-center md:px-0" : ""}`}
          >
            <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {initials}
            </div>
            <div className={`min-w-0 flex-1 ${isCollapsed ? "md:hidden" : ""}`}>
              <p className="font-semibold text-sm text-white truncate">{displayName}</p>
              <p className="text-xs text-blue-200">{userRole} Portal</p>
            </div>
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-blue-200 transition-transform ${profileOpen ? "rotate-180" : ""} ${isCollapsed ? "md:hidden" : ""}`} />
          </button>

          {/* Action icons — revealed by the profile row; stack in the collapsed rail */}
          {profileOpen && (
          <div className={`flex items-center gap-2 px-4 pb-3 ${isCollapsed ? "md:flex-col md:px-0" : ""}`}>
            <NotificationBell userRole={userRole} />
            {/* HMIS V3 — workspace switcher.
                Nurses use it in both directions. Everyone else reaches the ward
                board through the Outpatient/Inpatient dashboard tabs — but those
                tabs do NOT render inside the Inpatient portal, and clicking a bed
                on the board navigates to /inpatient/admission/:id. Without a way
                out here, a doctor who opened a bed was stranded: no tabs, no
                portal switcher (unless admin), and one sidebar entry. So the
                button is also shown to anyone currently inside /inpatient/*. */}
            {(currentUser?.role === "nurse" || userRole.toLowerCase() === "inpatient") && (
              <button
                onClick={() =>
                  navigate(
                    userRole.toLowerCase() === "inpatient"
                      // Back to the user's own portal home, whoever they are.
                      ? `/${currentUser?.role || "staff"}/dashboard`
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
                <Home className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                className="p-2 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
          )}

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
          collapsed ? "w-[5.75rem]" : "w-[19.75rem]"
        }`}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Slim mobile bar — desktop has no top bar at all now.
            Exists only to open the sidebar drawer on small screens. */}
        <header className="md:hidden fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-20 h-14 bg-white shadow-lg border border-gray-200 rounded-2xl px-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-700 hover:text-primary hover:bg-blue-50 p-2 rounded-lg transition"
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
        {/* The app's ONLY scroll container. overflow-x-hidden: a single wide
            table must scroll inside its own wrapper, never pan the whole app.
            Top margin clears the fixed mobile bar (+notch); bottom padding
            clears the home-indicator on installed iOS. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain px-4 pt-3 lg:px-8 lg:pt-4 bg-gray-50 mt-[calc(4.75rem+env(safe-area-inset-top,0px))] md:mt-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
          {pageTabs && <PageTabs tabs={pageTabs} />}
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
