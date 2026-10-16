import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Add useLocation
import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import useSessionTimeout from "../hooks/useSessionTimeout";
import SessionTimeoutWarning from "../components/shared/SessionTimeoutWarning";
// import { useEffect } from "react"; // TODO: restore when notifications are implemented
// import appointmentService from "../services/appointmentService"; // TODO: restore for notification badge
import { useUserContext } from "../contexts/UserContext";
import { canOpenHrSettings } from "../components/hr/settings/settingsTabs";
import { canOpenPortal, canViewComms, canViewLabInbox, canUseMail, canUseSelfService, canApproveLeave, canViewAllLeave, canApproveProfileChanges, canVerifyCpd, canViewHrReports, canRunOnboarding, canEditOnboardingTemplates, canEditRoster, canEditShiftTypes, canRunAppraisals, canReadAppraisals, isHrStaff, passesAdminGate, isWithdrawn, PERMISSIONS } from "../utils/permissions";
import PageTabs from "../components/shared/PageTabs";
import "./sidebar.css";
import ProfileMenu from "../components/shared/ProfileMenu";
import { PageHeaderSlotContext } from "../components/shared/pageHeaderSlot";
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
  CalendarDays,
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
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  FileStack,
  Package,
  KeyRound,
  Waves,
  Scan,
  Footprints,
  Inbox,
  IdCard,
  Clock,
  TreePalm,
  UserCheck,
  ClipboardCheck,
  BarChart3,
  ListChecks,
  CalendarRange,
  Award,
  BookOpen,
} from "lucide-react";
import logo from "../assets/cdc_web_logo1.svg";
import commsService from "../services/commsService";
import mailService, { MAIL_STATE_EVENT } from "../services/mailService";
import leaveService from "../services/leaveService";
import { LEAVE_CHANGED_EVENT } from "../components/hr/leave/leaveFormat";
import { APPRAISALS_CHANGED } from "../components/hr/appraisals/appraisalFormat";
import { PROFILE_REQUESTS_CHANGED } from "../components/hr/hrFormat";
import hrService from "../services/hrService";
import MailNudge from "../components/mail/MailNudge";

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

  // ── Temporary opening (11 Oct 2026, phones and tablets) ────────────────────
  // The sidebar is "temporarily open" when the phone drawer is open, or when a
  // collapsed rail is expanded without being pinned. With a mouse, hovering
  // does that and leaving undoes it. On touch there is no "leaving", so it got
  // stuck open. Now a temporary opening closes when:
  //   · anything outside the sidebar is touched or clicked (or Escape);
  //   · something in the sidebar is chosen (on touch — a mouse is still over it);
  //   · nothing happens inside it for SIDEBAR_IDLE_MS.
  // A pinned sidebar is never closed by any of these.
  const SIDEBAR_IDLE_MS = 6000;
  const asideRef = useRef(null);
  const pointerRef = useRef("mouse"); // the kind of pointer last used on the sidebar
  // Close the drawer and the flyout, and a touch-expanded rail (a mouse-hovered
  // rail closes itself when the pointer leaves). `force` also closes a
  // mouse-hovered rail — used for a click outside the sidebar.
  const closeTemporary = useCallback((force = false) => {
    setSidebarOpen(false);
    setPortalSwitcherOpen(false);
    if (force || pointerRef.current !== "mouse") setHovered(false);
  }, []);
  useEffect(() => {
    if (!sidebarOpen && !portalSwitcherOpen && !(collapsed && hovered)) return undefined;
    // The phone's hamburger toggles the drawer itself — don't fight it.
    const onDown = (e) => {
      if (asideRef.current?.contains(e.target) || e.target.closest?.("[data-sidebar-toggle]")) return;
      closeTemporary(true);
    };
    const onKey = (e) => { if (e.key === "Escape") closeTemporary(true); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [sidebarOpen, portalSwitcherOpen, collapsed, hovered, closeTemporary]);
  // Idle close — only for the touch openings; a mouse resting on the rail
  // keeps it open on purpose.
  useEffect(() => {
    const touchExpanded = collapsed && hovered && pointerRef.current !== "mouse";
    if (!sidebarOpen && !touchExpanded) return undefined;
    const aside = asideRef.current;
    let timer;
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => closeTemporary(), SIDEBAR_IDLE_MS); };
    const events = ["pointerdown", "scroll", "wheel", "keydown", "focusin"];
    arm();
    events.forEach((ev) => aside?.addEventListener(ev, arm, true));
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => aside?.removeEventListener(ev, arm, true));
    };
  }, [sidebarOpen, collapsed, hovered, closeTemporary]);

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

  // Inbox badge — everything waiting: WhatsApp unread + unpaired lab reports +
  // due reminders (GET /api/comms/badge returns the sum). Refreshed on the SSE
  // events, on route change, on the window fan-out events, and on a slow timer.
  const [inboxCount, setInboxCount] = useState(0);
  // Who has an Inbox entry in their sidebar — the SAME shared gates the Inbox
  // tabs and the standalone Lab Inbox page use, so the menu, the tab strip and
  // the page can never disagree (comms held by role by staff/doctor/nurse/admin,
  // lab reports by staff/lab/admin, either granted or covered by admin.access,
  // and withdrawable). See utils/permissions.
  //
  // Staff Email (B26): My mail lives in the Inbox too, and every internal role
  // holds it — so the Inbox entry now shows for anyone who can use ANY tab.
  // Personal unread mail is a separate dot, never added to the clinic count.
  const clinicInbox = canViewComms(currentUser) || canViewLabInbox(currentUser);
  const mailInNav = canUseMail(currentUser);
  const inboxInNav = clinicInbox || mailInNav;
  const [mailState, setMailState] = useState(null);   // { connected, status, unread, canSetUp, latest }
  const refreshMail = useCallback(() => {
    mailService.unread().then((r) => {
      const state = r?.data || null;
      setMailState(state);
      // One ask for the whole app: the Inbox page and My mail listen for this.
      window.dispatchEvent(new CustomEvent(MAIL_STATE_EVENT, { detail: state }));
    }).catch(() => {});
  }, []);
  // Phase 3b: every 30 s while the mailbox is connected — the server answers
  // from its live INBOX watcher, and these asks are what keep that watcher
  // alive (it closes ~3 min after they stop). Someone not connected is asked
  // only every 2 min, just to keep the setup nudge current.
  const mailConnected = !!(mailState && mailState.connected);
  useEffect(() => {
    if (!mailInNav) return undefined;
    refreshMail();
    const t = setInterval(refreshMail, mailConnected ? 30 * 1000 : 2 * 60 * 1000);
    window.addEventListener('mail:changed', refreshMail);
    return () => { clearInterval(t); window.removeEventListener('mail:changed', refreshMail); };
  }, [mailInNav, refreshMail, mailConnected]);
  const mailDot = !!(mailState && mailState.connected && mailState.unread > 0);
  // B27 phase 3 — leave waiting on me (approver), for the HR Suite's
  // "Leave to approve" badge. Asked in the HR portal only: on mount, on route
  // change, after a decision (LEAVE_CHANGED_EVENT) and every two minutes.
  const inHr = homeRole === 'hr';
  const [leaveWaiting, setLeaveWaiting] = useState(0);
  const refreshLeaveWaiting = useCallback(() => {
    leaveService.inboxCount()
      .then((r) => setLeaveWaiting(r?.data?.waiting || 0))
      .catch(() => { /* not on any request — badge stays hidden */ });
  }, []);
  useEffect(() => {
    if (inHr) refreshLeaveWaiting();
  }, [inHr, location.pathname, refreshLeaveWaiting]);
  useEffect(() => {
    if (!inHr) return undefined;
    const t = setInterval(refreshLeaveWaiting, 2 * 60 * 1000);
    window.addEventListener(LEAVE_CHANGED_EVENT, refreshLeaveWaiting);
    return () => { clearInterval(t); window.removeEventListener(LEAVE_CHANGED_EVENT, refreshLeaveWaiting); };
  }, [inHr, refreshLeaveWaiting]);

  // B27 phase 4 — profile change requests waiting (hr.profile.approve), for the
  // "Profile requests" badge. Same rhythm as the leave badge.
  const approvesProfiles = canApproveProfileChanges(currentUser);
  const [profileWaiting, setProfileWaiting] = useState(0);
  const refreshProfileWaiting = useCallback(() => {
    hrService.changeRequestCount()
      .then((r) => setProfileWaiting(r?.data?.pending || 0))
      .catch(() => { /* not granted — badge stays hidden */ });
  }, []);
  useEffect(() => {
    if (inHr && approvesProfiles) refreshProfileWaiting();
  }, [inHr, approvesProfiles, location.pathname, refreshProfileWaiting]);
  useEffect(() => {
    if (!inHr || !approvesProfiles) return undefined;
    const t = setInterval(refreshProfileWaiting, 2 * 60 * 1000);
    window.addEventListener(PROFILE_REQUESTS_CHANGED, refreshProfileWaiting);
    return () => { clearInterval(t); window.removeEventListener(PROFILE_REQUESTS_CHANGED, refreshProfileWaiting); };
  }, [inHr, approvesProfiles, refreshProfileWaiting]);

  // B27 phase 5 — CPD waiting to verify (cpd.verify), shown on the same
  // "Profile requests" badge (CPD is a tab there). Same rhythm as above.
  const verifiesCpd = canVerifyCpd(currentUser);
  const [cpdWaiting, setCpdWaiting] = useState(0);
  const refreshCpdWaiting = useCallback(() => {
    hrService.cpdCount()
      .then((r) => setCpdWaiting(r?.data?.pending || 0))
      .catch(() => { /* not granted — badge stays hidden */ });
  }, []);
  useEffect(() => {
    if (inHr && verifiesCpd) refreshCpdWaiting();
  }, [inHr, verifiesCpd, location.pathname, refreshCpdWaiting]);
  useEffect(() => {
    if (!inHr || !verifiesCpd) return undefined;
    const t = setInterval(refreshCpdWaiting, 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [inHr, verifiesCpd, refreshCpdWaiting]);

  // HR Tier 3 Phase 5 — appraisal steps waiting on me (my own self-assessment
  // or acknowledgement, and reviews), for the "Appraisals" badge.
  const [appraisalWaiting, setAppraisalWaiting] = useState(0);
  const refreshAppraisalWaiting = useCallback(() => {
    hrService.myAppraisals()
      .then((r) => setAppraisalWaiting((r?.data?.toDo || 0) + (r?.data?.toReview || 0)))
      .catch(() => { /* withdrawn — badge stays hidden */ });
  }, []);
  useEffect(() => {
    if (inHr) refreshAppraisalWaiting();
  }, [inHr, location.pathname, refreshAppraisalWaiting]);
  useEffect(() => {
    if (!inHr) return undefined;
    window.addEventListener(APPRAISALS_CHANGED, refreshAppraisalWaiting);
    return () => window.removeEventListener(APPRAISALS_CHANGED, refreshAppraisalWaiting);
  }, [inHr, refreshAppraisalWaiting]);

  // B27 phase 4 — the avatar opens My profile (/hr/me) for anyone the server
  // lets read their own record (routes/hrSelf.js SELF: every staff role,
  // withdrawable per person). Patients and anyone withdrawn keep the old toggle.
  const hasMyProfile = currentUser?.role !== 'patient' && canUseSelfService(currentUser);
  const openMyProfile = () => { closeTemporary(); navigate('/hr/me'); };

  const refreshInboxCount = useCallback(() => {
    commsService.badge()
      .then((r) => setInboxCount(r?.data?.total || 0))
      .catch(() => { /* not granted — badge stays hidden */ });
  }, []);
  // route change → refresh (cheap: one GET)
  useEffect(() => {
    if (clinicInbox) refreshInboxCount();
  }, [clinicInbox, location.pathname, refreshInboxCount]);
  // one SSE subscription + slow fallback timer for the life of the layout. The
  // SSE events fan out to window events so the Inbox pages refresh without each
  // opening its own EventSource (nine already exist; add none).
  useEffect(() => {
    if (!clinicInbox) return undefined;
    const timer = setInterval(refreshInboxCount, 2 * 60 * 1000);
    const SSE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse`;
    const source = new EventSource(SSE_URL);
    const onComms = () => window.dispatchEvent(new CustomEvent('comms:changed'));
    const onLab = () => { window.dispatchEvent(new CustomEvent('lab-inbox:changed')); window.dispatchEvent(new CustomEvent('comms:changed')); };
    source.addEventListener('comms_new', onComms);
    source.addEventListener('lab_inbox_new', onLab);
    window.addEventListener('comms:changed', refreshInboxCount);
    window.addEventListener('lab-inbox:changed', refreshInboxCount);
    return () => {
      clearInterval(timer);
      source.close();
      window.removeEventListener('comms:changed', refreshInboxCount);
      window.removeEventListener('lab-inbox:changed', refreshInboxCount);
    };
  }, [clinicInbox, refreshInboxCount]);
  // Only these portals actually mount an /{portal}/inpatient-board route (App.jsx).
  // The nurse and inpatient portals do NOT: a nurse's own dashboard IS the ward
  // board, and the inpatient workspace has /inpatient/board. Generating the tab
  // path from homeRole without this check produced /nurse/inpatient-board and
  // /inpatient/inpatient-board — links straight to NotFound.
  const PORTALS_WITH_INPATIENT_BOARD = ['staff', 'doctor', 'lab'];
  // One question governs everything inpatient (permissions audit, 16 Oct 2026):
  // may this person open the Inpatient workspace? Doctors and nurses by role,
  // anyone else by grant, nobody once it is withdrawn — the same answer the
  // portal switcher and the admissions API give.
  const canSeeInpatientTab =
    PORTALS_WITH_INPATIENT_BOARD.includes(homeRole) && canOpenPortal(currentUser, PERMISSIONS.PORTAL_INPATIENT);

  // Hide any nav entry or tab this person cannot use. A real admin holds every
  // capability implicitly, so hasPermission keeps the full menu for them.
  // Untagged entries are open to anyone already inside the portal.
  // `permission`  — shown only when GRANTED (or admin.access): for areas nobody holds by role.
  // `withdrawnBy` — shown by ROLE DEFAULT, hidden only when an admin has WITHDRAWN that
  //                 capability from this person (the server refuses them anyway).
  // `show`        — an explicit boolean computed from the shared gates (the Inbox:
  //                 visible when ANY of its tabs is usable — see inboxInNav).
  const allowedEntry = (item) =>
    item.show !== false
    && (!item.permission || passesAdminGate(currentUser, item.permission))
    && !(item.withdrawnBy && isWithdrawn(currentUser, item.withdrawnBy));

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
        { label: 'Appointments', path: '/doctor/appointments', Icon: Calendar, withdrawnBy: PERMISSIONS.APPOINTMENTS_VIEW },
        { label: 'My Schedule', path: '/doctor/my-schedule', Icon: CalendarCheck },
        { label: 'Patient Visits', path: '/doctor/patient-visits', Icon: TrendingUp },
        { label: 'Attendance', path: '/doctor/attendance', Icon: CalendarDays },
      ],
    },
    {
      // Staff appointments: booking + the visit report share the Appointments page.
      show: homeRole === 'staff',
      tabs: [
        { label: 'Appointments', path: '/staff/appointments', Icon: Calendar, withdrawnBy: PERMISSIONS.APPOINTMENTS_VIEW },
        { label: 'Book Appointment', path: '/staff/book-appointment', Icon: CalendarCheck, withdrawnBy: PERMISSIONS.APPOINTMENTS_WRITE },
        { label: 'Patient Visits', path: '/staff/patient-visits', Icon: TrendingUp },
        { label: 'Attendance', path: '/staff/attendance', Icon: CalendarDays },
      ],
    },
    {
      // Staff front desk: the queue, patient search and registration share one page.
      show: homeRole === 'staff',
      tabs: [
        { label: 'Queue Management', path: '/staff/queue', Icon: ClipboardList, withdrawnBy: PERMISSIONS.QUEUE_WRITE },
        { label: 'Patient Search', path: '/staff/patients', Icon: Search },
        { label: 'Register Patient', path: '/staff/create-patient', Icon: UserPlus, withdrawnBy: PERMISSIONS.PATIENTS_WRITE },
      ],
    },
    {
      show: homeRole === 'admin',
      tabs: [
        { label: 'Onboard', path: '/admin/onboard', Icon: UserPlus, permission: PERMISSIONS.STAFF_ONBOARD },
        { label: 'Manage Users', path: '/admin/manage-users', Icon: UserCog, permission: PERMISSIONS.USERS_VIEW },
        { label: 'Duplicate Patients', path: '/admin/duplicate-patients', Icon: Copy, permission: PERMISSIONS.PATIENTS_MERGE },
      ],
    },
    {
      show: homeRole === 'admin',
      tabs: [
        { label: 'Activity Log', path: '/admin/activity-log', Icon: ShieldAlert, permission: PERMISSIONS.MONITORING_VIEW },
        { label: 'Analytics', path: '/admin/analytics', Icon: TrendingUp, permission: PERMISSIONS.MONITORING_VIEW },
        { label: 'Patient Visits', path: '/admin/patient-visits', Icon: ClipboardList, permission: PERMISSIONS.MONITORING_VIEW },
        { label: 'Attendance', path: '/admin/attendance', Icon: CalendarDays, permission: PERMISSIONS.MONITORING_VIEW },
      ],
    },
    {
      show: homeRole === 'admin',
      tabs: [
        { label: 'System Settings', path: '/admin/settings', Icon: Settings, permission: PERMISSIONS.CONFIG_WRITE },
        { label: 'Change Password', path: '/admin/change-password', Icon: KeyRound },
      ],
    },
  ];
  // The switcher shows wherever one of its tabs is active (prefix match, so
  // sub-routes like /admin/analytics/doctors still show the Monitoring tabs).
  const matchesTab = (t) =>
    location.pathname === t.path || location.pathname.startsWith(`${t.path}/`);
  const pageTabs = switcherGroups
    .map((g) => ({ ...g, tabs: g.tabs.filter(allowedEntry) }))
    .find((g) => g.show && g.tabs.length > 0 && g.tabs.some(matchesTab))?.tabs ?? null;

  // Session timeout — enabled for all roles except patient
  const sessionTimeoutEnabled = currentUser?.role !== 'patient';
  const { showWarning, countdown, resetTimer } = useSessionTimeout(sessionTimeoutEnabled);

  // Portals reachable from the logo switcher. Every portal is listed; the one the
  // user is currently in is filtered out at render time.
  // Each entry carries the capability that opens it, so the switcher offers
  // exactly the portals this person may actually enter — previously it showed
  // all four to anyone with admin access and none to anybody else.
  const portalOptions = [
    { label: 'Admin Portal', path: '/admin/dashboard', icon: ShieldCheck, portal: PERMISSIONS.PORTAL_ADMIN },
    { label: 'Doctor Portal', path: '/doctor/dashboard', icon: Stethoscope, portal: PERMISSIONS.PORTAL_DOCTOR },
    { label: 'Staff Portal', path: '/staff/dashboard', icon: Users, portal: PERMISSIONS.PORTAL_STAFF },
    { label: 'Lab Portal', path: '/lab/dashboard', icon: TestTube, portal: PERMISSIONS.PORTAL_LAB },
    { label: 'Radiology Suite', path: '/radiology/dashboard', icon: Scan, portal: PERMISSIONS.PORTAL_RADIOLOGY },
    // HR Suite (B21) — every internal role by default; the person's own time &
    // attendance record, plus the clinic's for hr.view holders.
    { label: 'HR Suite', path: '/hr/dashboard', icon: IdCard, portal: PERMISSIONS.PORTAL_HR },
  ];

  // Portals this person may open, other than the one they are already in.
  // Switching is offered when there is somewhere to switch TO — which is now a
  // per-portal grant rather than "do they hold admin access".
  const openablePortalOptions = portalOptions.filter(({ portal }) =>
    canOpenPortal(currentUser, portal));
  const canSwitchPortal = openablePortalOptions.some(({ path }) =>
    !path.startsWith(`/${userRole.toLowerCase()}/`));

  // Stocks (to become Pharmacy) lives in the portal list, not the sidebar. Shown
  // to holders of the Stocks portal (canManageStock, resolved by the server),
  // pointing at the CURRENT portal's stock page — every portal has one since
  // 13 Oct 2026, so it appears wherever you are (it used to show only from the
  // Admin, Doctor and Staff portals). Hiding the link is UX; the API is guarded
  // server-side regardless.
  const hasStockAccess = !!currentUser?.canManageStock;
  const stockModule = hasStockAccess
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
    closeTemporary();
  };

  // The Meta-style switcher pill toggles the portal dropdown. Opening it collapses
  // any open nav group (single-open accordion).
  const togglePortalSwitcher = () => {
    setPortalSwitcherOpen((open) => !open);
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

  // Display name for the profile menu.
  const displayName = currentUser?.name || `${userRole} User`;

  // ── Profile menu (11 Oct 2026) ─────────────────────────────────────────────
  // The round avatar + chevron, top right: My profile · Notifications ·
  // (Switch workspace) · Sign out. It replaced the profile row and icon strip
  // in the sidebar footer. Desktop: on each portal's home page only (dashboard
  // / ward board), in the first row's right-hand corner. Phones: in the slim
  // top bar on every page — that bar already exists, so it costs nothing.
  const isHomePage = /^\/[a-z-]+\/(dashboard|inpatient-board|board)\/?$/.test(location.pathname);
  // HMIS V3 workspace switcher, moved here from the footer. Nurses use it in
  // both directions; anyone inside /inpatient/* needs it to get back out
  // (the inpatient portal has no dashboard tabs and one sidebar entry, and the
  // ward board — this portal's home — shows the menu).
  const inInpatient = userRole.toLowerCase() === "inpatient";
  const workspaceSwitch = currentUser?.role === "nurse" || inInpatient
    ? {
        label: inInpatient ? "Go to Outpatient" : "Go to Inpatient",
        // Back to the user's own portal home, whoever they are.
        onClick: () => navigate(inInpatient ? `/${currentUser?.role || "staff"}/dashboard` : "/inpatient/board"),
      }
    : null;
  const myProfileAction = hasMyProfile
    ? openMyProfile
    : currentUser?.role === "patient"
      ? () => navigate("/patient/profile")
      : null;
  const renderProfileMenu = (size = "md") => (
    <ProfileMenu
      userRole={userRole}
      name={displayName}
      showPhoto={hasMyProfile}
      onMyProfile={myProfileAction}
      workspaceSwitch={workspaceSwitch}
      onSignOut={handleLogout}
      size={size}
    />
  );
  // Where the desktop menu goes on a home page: beside the dashboard tabs when
  // the page has them (that row is the top of the page), otherwise at the right
  // end of the page's title row (PageHeader reads it from context).
  const menuBesideTabs = isHomePage && !!pageTabs;
  const headerSlot = isHomePage && !pageTabs ? renderProfileMenu() : null;

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
      { name: "Dashboard", path: "/radiology/dashboard", icon: LayoutDashboard },
      { name: "Patients", path: "/radiology/patients", icon: Users },
      { name: "Ultrasound Suite", path: "/radiology/suite", icon: Scan },
      { name: "Neuropathy Suite", path: "/radiology/neuropathy", icon: Footprints },
    ],
    staff: [
      { name: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
      // Front-desk group entry — Patient Search + Register Patient ride along as
      // tabs on this page (see switcherGroups). Keeps the sidebar decongested.
      // Triage lives as the second tab inside Queue Management now, not a nav item.
      { name: "Queue Management", path: "/staff/queue", icon: ClipboardList, withdrawnBy: PERMISSIONS.QUEUE_WRITE },
      // Appointments group entry — Book Appointment + Patient Visits are its tabs.
      { name: "Appointments", path: "/staff/appointments", icon: Calendar, withdrawnBy: PERMISSIONS.APPOINTMENTS_VIEW },
      // Admissions follow the Inpatient workspace grant (see canSeeInpatientTab).
      { name: "Admissions", path: "/staff/inpatient-admissions", icon: BedDouble, show: canOpenPortal(currentUser, PERMISSIONS.PORTAL_INPATIENT) },
      // Everything reaching the clinic from outside: patient WhatsApp messages,
      // external lab reports (email + WhatsApp) and reminders. The badge is the
      // sum still needing attention. Held by role; hidden only if withdrawn.
      { name: "Inbox", path: "/staff/inbox", icon: Inbox, badge: inboxCount, dot: mailDot, show: inboxInNav },
      // { name: "Medical Documents", path: "/staff/medical-documents", icon: FileStack },
      { name: "Change Password", path: "/staff/change-password", icon: KeyRound },
    ],
    doctor: [
      { name: "Dashboard", path: "/doctor/dashboard", icon: LayoutDashboard },
      { name: "Patients", path: "/doctor/patients", icon: Users },
      // Doctors hold the Inbox (WhatsApp) by role; hidden only if withdrawn.
      { name: "Inbox", path: "/doctor/inbox", icon: Inbox, badge: inboxCount, dot: mailDot, show: inboxInNav },
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
      { name: "Appointments", path: "/doctor/appointments", icon: Calendar, withdrawnBy: PERMISSIONS.APPOINTMENTS_VIEW },
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
      // The lab reaches the Inbox for its Lab reports tab (by role); WhatsApp
      // needs a comms grant. Hidden if lab-inbox access is withdrawn.
      { name: "Inbox", path: "/lab/inbox", icon: Inbox, badge: inboxCount, dot: mailDot, show: inboxInNav },
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
      { name: "Queue Management", path: "/nurse/queue", icon: ClipboardList, withdrawnBy: PERMISSIONS.QUEUE_WRITE },
      { name: "Inbox", path: "/nurse/inbox", icon: Inbox, badge: inboxCount, dot: mailDot, show: inboxInNav },
    ],
    // HR Suite (B21) — one portal, two views. Dashboard and the register are
    // open to everyone in the portal (own rows); Settings only to hr.write.
    hr: [
      { name: "Dashboard", path: "/hr/dashboard", icon: LayoutDashboard },
      { name: "Time & Attendance", path: "/hr/register", icon: Clock },
      // B27 phase 2: my own leave — everyone (hr.self); withdrawn per person.
      { name: "My leave", path: "/hr/me/leave", icon: TreePalm, show: canUseSelfService(currentUser) },
      // B27 phase 3: anyone can be chosen as an approver, so the item shows for
      // whoever can approve or manage leave, and for anyone something waits on.
      { name: "Leave to approve", path: "/hr/leave", icon: ClipboardCheck, badge: leaveWaiting, show: canApproveLeave(currentUser) || canViewAllLeave(currentUser) || leaveWaiting > 0 },
      // B27 phase 5: the team leave calendar — every internal role (hr.self).
      { name: "Team calendar", path: "/hr/calendar", icon: CalendarDays, show: canUseSelfService(currentUser) },
      { name: "Staff", path: "/hr/staff", icon: Users, permission: PERMISSIONS.STAFF_VIEW },
      // B27 phase 4/5: profile change requests (hr.profile.approve) and CPD to
      // verify (cpd.verify) share this page and its badge.
      { name: "Profile requests", path: "/hr/requests", icon: UserCheck, badge: profileWaiting + cpdWaiting, show: canApproveProfileChanges(currentUser) || canVerifyCpd(currentUser) },
      // Settings (6 Oct 2026): Attendance · Leave · Staff lists · Alerts & reminders on one
      // page (it replaced Leave settings and Departments & positions); shown when any
      // of its sub-tabs is open to this person — the gates live in settingsTabs.js.
      { name: "Settings", path: "/hr/settings", icon: Settings, show: canOpenHrSettings(currentUser) },
      // HR Tier 3 Phase 2: HR reports (hr.reports; figures limited to the holder's scope).
      { name: "Reports", path: "/hr/reports", icon: BarChart3, show: canViewHrReports(currentUser) },
      // HR Tier 3 Phase 3: onboarding checklists (hr.onboarding) and templates (hr.onboarding.templates).
      { name: "Onboarding", path: "/hr/onboarding", icon: ListChecks, show: canRunOnboarding(currentUser) || canEditOnboardingTemplates(currentUser) },
      // HR Tier 3 Phase 4: the shift roster (hr.roster) and shift types (hr.roster.shifts).
      { name: "Roster", path: "/hr/roster", icon: CalendarRange, show: canEditRoster(currentUser) || canEditShiftTypes(currentUser) },
      // HR Tier 3 Phase 5: appraisals — everyone (own + reviewing); runners and readers also see the cycle.
      { name: "Appraisals", path: "/hr/appraisals", icon: Award, badge: appraisalWaiting, show: canUseSelfService(currentUser) || canRunAppraisals(currentUser) || canReadAppraisals(currentUser) },
      // HR Suite → Manual (5 Oct 2026): the HR Suite Manual and the shared HR checklist — HR staff only (isHrStaff).
      { name: "Manual", path: "/hr/manual", icon: BookOpen, show: isHrStaff(currentUser) },
    ],
    // HMIS V3 — inpatient workspace (entered by doctors + nurses via the switcher)
    inpatient: [
      { name: "Ward Board", path: "/inpatient/board", icon: BedDouble },
    ],
    // An entry is a leaf ({ name, path, icon }) or a group
    // ({ name, icon, children: [...leaves] }) rendered as an expandable section.
    // `permission` hides an entry the person cannot use. Entering the admin
    // portal is now a separate grant from being able to run any given screen in
    // it, so without this a user granted portal.admin plus one narrow capability
    // sees the whole menu and gets a 403 on most of it. Untagged entries are
    // open to anyone already in the portal.
    admin: [
      { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Users", path: "/admin/manage-users", icon: Users, permission: PERMISSIONS.USERS_VIEW },
      { name: "Inbox", path: "/admin/inbox", icon: Inbox, badge: inboxCount, dot: mailDot, show: inboxInNav },
      { name: "Medical Documents", path: "/admin/medical-documents", icon: FileStack },
      // The scan inbox reads /ultrasound, which admits admin.access (not a narrower slice).
      { name: "Radiology Queue", path: "/admin/unassigned-ultrasound", icon: Waves, permission: PERMISSIONS.ADMIN_ACCESS },
      { name: "Clinical Catalog", path: "/admin/catalog", icon: Pill, permission: PERMISSIONS.CONFIG_WRITE },
      { name: "Ward Config", path: "/admin/ward-config", icon: BedDouble, permission: PERMISSIONS.CONFIG_WRITE },
      {
        name: "Monitoring",
        path: "/admin/activity-log",
        icon: Activity,
        permission: PERMISSIONS.MONITORING_VIEW,
      },
      {
        name: "Settings",
        path: "/admin/settings",
        icon: Settings,
        permission: PERMISSIONS.CONFIG_WRITE,
      },
    ],
  };

  const currentMenu = (menuItems[userRole.toLowerCase()] || menuItems.staff)
    .filter(allowedEntry)
    .map((item) => (item.children ? { ...item, children: item.children.filter(allowedEntry) } : item))
    .filter((item) => !item.children || item.children.length > 0);

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

  // ── Portal switcher choices ───────────────────────────────────────────────
  // Every portal the user can switch to. Normally the portal you're in is
  // hidden — but Stocks is a sub-page OF a portal, so on a stock route the base
  // portal is NOT where you are and must stay listed, otherwise it looks like
  // the portal vanished. Stocks is the current destination on a stock route,
  // so drop it there — unless it's the only thing the switcher can offer (a
  // stock-only user who can't switch portals), where hiding it leaves an
  // empty menu.
  const portalChoices = [
    ...openablePortalOptions.filter(({ path }) => onStockRoute || !path.startsWith(`/${userRole.toLowerCase()}/`)),
    ...(!onStockRoute || !canSwitchPortal ? stockModule : []),
  ];
  // Desktop (11 Oct 2026): the switcher opens as a glass flyout to the RIGHT
  // of the sidebar instead of inside it. It is a child of the <aside>, so
  // moving the pointer into it doesn't count as leaving the sidebar (the
  // hover-expanded rail stays open).
  const choosePortal = (path) => {
    navigate(path);
    closeTemporary();
  };
  // The portal choices — ONE list for both places it opens: the desktop flyout,
  // and on phones inside the switcher's own island, which grows downward and
  // pushes the menu island down until a portal is chosen (Emu, 11 Oct 2026).
  // Left alone it folds with the drawer's idle close (SIDEBAR_IDLE_MS).
  const portalList = portalChoices.map(({ label, path, icon: Icon }) => (
    <button
      key={path}
      type="button"
      role="menuitem"
      data-nav-path={path}
      onClick={() => choosePortal(path)}
      className="relative z-[1] w-full px-2 py-0.5 text-left"
    >
      <span className="flex items-center gap-3 sb-round px-3 py-2.5 text-sm font-medium sb-text sb-hover transition-colors">
        <span className="w-7 h-7 flex-shrink-0 rounded-full sb-disc flex items-center justify-center">
          <Icon size={16} className="sb-icon" />
        </span>
        {label}
      </span>
    </button>
  ));

  // ── Selection lens (Floating islands, 11 Oct 2026) ──────────────────────
  // One glass capsule behind the active menu item, moved by measuring the
  // item (data-sb-active) inside the scrolling <nav>. Re-measured whenever the
  // nav or any slot changes size — the rail widening on hover, a group
  // opening, the portal list dropping down — via a ResizeObserver, so it
  // tracks those animations. Hidden when the current page isn't in the menu.
  // The first placement skips the glide so a page load doesn't animate in.
  const navRef = useRef(null);
  const navLensRef = useRef(null);
  const lensPlacedRef = useRef(false);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const lens = navLensRef.current;
    if (!nav || !lens) return undefined;
    const place = () => {
      const slot = nav.querySelector('[data-sb-active="true"]');
      if (!slot) { lens.style.opacity = "0"; return; }
      const n = nav.getBoundingClientRect();
      const r = slot.getBoundingClientRect();
      if (!lensPlacedRef.current) lens.style.transition = "none";
      lens.style.width = `${r.width}px`;
      lens.style.height = `${r.height}px`;
      lens.style.transform = `translate(${r.left - n.left}px, ${r.top - n.top + nav.scrollTop}px)`;
      lens.style.opacity = "1";
      if (!lensPlacedRef.current) {
        lensPlacedRef.current = true;
        requestAnimationFrame(() => { lens.style.transition = ""; });
      }
    };
    place();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    nav.querySelectorAll("[data-sb-slot]").forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  });

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
        // data-nav-path lets a page guard notice "leaving" (DraftLeaveGuard).
        data-nav-path={item.path}
        onClick={() => {
          navigate(item.path);
          closeTemporary();
        }}
        title={item.name}
        className={`
          w-full flex items-center overflow-hidden group px-2 py-0.5 ${indentCls}
          ${isCollapsed ? "md:px-0 md:justify-center" : ""}
          transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        `}
      >
        {/* Rounded slot — a centered square in the icon rail, a full-width
            pill when the rail is expanded. The active slot carries no fill of
            its own: the glass lens (navLensRef) glides behind it. */}
        <span
          data-sb-slot=""
          data-sb-active={isActive ? "true" : undefined}
          className={`
            relative z-[1] flex items-center sb-round transition-colors duration-200
            ${isCollapsed ? "md:w-10 md:h-10 md:justify-center md:p-0 w-full px-3 py-2.5" : "w-full px-3 py-2.5"}
            ${
              isActive
                ? "sb-active" // ← ACTIVE STATE (the lens sits behind it)
                : "sb-text sb-hover" // ← INACTIVE STATE (colours: sidebar.css)
            }
          `}
        >
          <IconComponent
            size={nested ? 18 : 20}
            strokeWidth={2}
            className="flex-shrink-0 transition-colors sb-icon"
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
          {/* Count badge (e.g. unpaired lab reports). A pill when the rail is
              expanded; a small dot on the icon when collapsed. */}
          {/* Personal mail (Staff Email, B26): a small separate dot, never folded
              into the clinic count above — newsletters must not make the clinic
              queue look busy. */}
          {item.dot && !(item.badge > 0) && (
            <span
              title="Unread mail in My mail"
              className={`ml-auto h-2.5 w-2.5 rounded-full bg-sky-300 ${isCollapsed ? "md:absolute md:top-1.5 md:right-1.5 md:ml-0" : ""}`}
            />
          )}
          {item.dot && item.badge > 0 && (
            <span title="Unread mail in My mail" className={`ml-1.5 h-2 w-2 rounded-full bg-sky-300 ${isCollapsed ? "md:hidden" : ""}`} />
          )}
          {item.badge > 0 && (
            <>
              <span
                className={`ml-auto min-w-[1.35rem] h-5 px-1.5 rounded-full sb-badge text-[11px] font-extrabold flex items-center justify-center ${isCollapsed ? "md:hidden" : ""}`}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
              <span
                className={`hidden ${isCollapsed ? "md:block" : ""} absolute top-1.5 right-1.5 w-2 h-2 rounded-full sb-dot`}
              />
            </>
          )}
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
              flex items-center w-full sb-round px-3 py-2.5 transition-colors duration-200
              ${hasActiveChild ? "sb-group-active" : "sb-text sb-hover"}
            `}
          >
            <GroupIcon
              size={20}
              strokeWidth={2}
              className="flex-shrink-0 transition-colors sb-icon"
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
              className={`flex-shrink-0 sb-muted transition-transform duration-200 ${
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
    <div className="app-shell app-canvas safe-x flex overflow-hidden">
      {/* Phones: a clear tap-catcher behind the open drawer — a tap outside it
          closes it without also pressing whatever is underneath. No tint: the
          islands' own cast shadow (sidebar.css --sb-glass-shadow) lifts the
          panel. The top bar sits above it, so its hamburger (now an X) still
          works. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on desktop so hover-expand floats over content.
          "Floating islands" (11 Oct 2026): three separate pieces of glass —
          brand + portal switcher · menu · pin button — with gaps between them
          (styles in ./sidebar.css). The aside itself is transparent. */}
      <aside
        ref={asideRef}
        // Hover-to-expand is for a mouse only; a touch tap on the rail's empty
        // space expands it instead (onClick) — see "Temporary opening" above.
        onPointerDown={(e) => { pointerRef.current = e.pointerType; }}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") { pointerRef.current = "mouse"; setHovered(true); } }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          setHovered(false);
          // Leaving a pinned-collapsed rail shrinks it back to icons — close the
          // portal dropdown so it doesn't linger clipped in the narrow rail.
          if (collapsed) setPortalSwitcherOpen(false);
        }}
        onClick={(e) => {
          if (pointerRef.current !== "mouse" && collapsed && !hovered && !e.target.closest("button, a")) setHovered(true);
        }}
        className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)] md:translate-x-0"}
        fixed top-[calc(4.75rem+env(safe-area-inset-top,0px))] md:top-[calc(1rem+env(safe-area-inset-top,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] z-30 flex flex-col gap-2.5
        w-72 ${isCollapsed ? "md:w-[3.25rem]" : "md:w-72"}
        sb-white
        transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
      `}
      >
        {/* ── Island 1: brand + portal switcher ──
            Phones: the brand row is hidden (the top bar already shows it), so
            the island holds only the switcher, or is hidden when there is none. */}
        <div className={`sb-island flex-none ${canOpenSwitcher ? "" : "hidden md:block"}`}>
        <div className={`relative px-3 pt-3 transition-[padding] duration-200 ${canOpenSwitcher ? "pb-2" : "pb-3"} ${isCollapsed ? "md:px-0" : ""} hidden md:flex items-center justify-between ${isCollapsed ? "md:justify-center" : ""}`}>
          {/* LEFT SIDE — Logo + brand. A plain shortcut back to the dashboard; portal
              switching now lives in the pill below (see the switcher pill). */}
          <button
            type="button"
            onClick={handleLogoClick}
            title="Go to dashboard"
            className={`flex items-center gap-3 flex-1 min-w-0 text-left sb-round px-2 py-1.5 transition sb-hover ${isCollapsed ? "md:flex-none md:justify-center md:px-0" : ""}`}
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
                <p className="text-xs sb-muted mt-0.5 truncate">{userRole} Portal</p>
              )}
            </div>
          </button>

        </div>

        {/* ── Portal switcher pill (Meta-style) ───────────────────────────────
            Sits under the logo, separate from it. Full-width bordered pill when
            the rail is expanded; a single centered icon button in the icon rail.
            Only rendered for users who can actually switch (or stock users). */}
        {canOpenSwitcher && (
          <div className={`px-3 pb-3 pt-3 md:pt-0 ${isCollapsed ? "md:px-0 md:flex md:justify-center" : ""}`}>
            <button
              type="button"
              onClick={togglePortalSwitcher}
              title="Switch portal"
              aria-haspopup="menu"
              aria-expanded={portalSwitcherOpen}
              className={`
                w-full flex items-center gap-3 sb-round px-3 py-2.5
                sb-chip ${portalSwitcherOpen ? "sb-chip-open" : ""}
                ${isCollapsed ? "md:w-10 md:h-10 md:p-0 md:gap-0 md:justify-center" : ""}
              `}
            >
              <span className="w-7 h-7 flex-shrink-0 rounded-full sb-disc-on flex items-center justify-center">
                <SwitcherIcon size={16} className="sb-icon" />
              </span>
              <span className={`min-w-0 flex-1 text-left text-sm font-medium sb-strong truncate ${isCollapsed ? "md:hidden" : ""}`}>
                {switcherLabel}
              </span>
              <ChevronDown
                size={16}
                className={`flex-shrink-0 sb-muted transition-transform duration-200 md:hidden ${portalSwitcherOpen ? "rotate-180" : ""}`}
              />
              {/* Desktop: the list opens to the right, so the chevron points there. */}
              <ChevronRight
                size={16}
                className={`hidden flex-shrink-0 sb-muted ${isCollapsed ? "" : "md:block"}`}
              />
            </button>
          </div>
        )}
        {/* Phones: the list opens inside this island, under the pill. */}
        {canOpenSwitcher && portalSwitcherOpen && (
          <div className="md:hidden -mt-1 pb-2" role="menu" aria-label="Switch portal">
            {portalList}
          </div>
        )}
        </div>

        {/* ── Portal flyout (desktop) — beside the brand island, to the right of
            the sidebar. pl-2.5 is a transparent bridge over the gap, so the
            pointer can cross it without leaving the sidebar. ── */}
        {canOpenSwitcher && portalSwitcherOpen && (
          <div className="hidden md:block absolute top-0 left-full pl-2.5 z-40">
            <div className="sb-island sb-flyout w-64 py-2" role="menu" aria-label="Switch portal">
              <p className="px-4 pt-1 pb-2 text-xs font-medium sb-muted">Open another portal</p>
              {portalList}
            </div>
          </div>
        )}

        {/* ── Island 2: the menu ── */}
        <div className="sb-island flex-1 min-h-0 flex flex-col">

        <nav ref={navRef} className={`relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-2 sidebar-scroll ${isCollapsed ? "sb-rail-scroll" : ""}`}>
          {/* The selection lens — glides to the active item (see navRef effect). */}
          <div ref={navLensRef} className="sb-lens" style={{ opacity: 0 }} aria-hidden="true" />
          {currentMenu
            .filter((item) => !item.path?.includes("change-password"))
            .map((item) => (item.children ? renderGroup(item) : renderLeaf(item)))}
        </nav>
        </div>

        {/* ── Island 3: the collapse toggle (desktop only). The profile row and
            its icons (bell, my profile, workspace, logout) moved to the
            top-right profile menu on 11 Oct 2026 — see renderProfileMenu. */}
        <div className="sb-island flex-none hidden md:block">
          <div>
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
              className={`w-full flex items-center py-3 ${isCollapsed ? "justify-center px-0" : "px-5"} sb-muted sb-hover transition-all duration-200`}
            >
              {/* The panel glyph says what the control acts on, which a bare
                  chevron does not: a rail with the arrow pointing out of it to
                  open, back into it to collapse. */}
              {collapsed ? <PanelLeftOpen size={22} className="shrink-0" /> : <PanelLeftClose size={22} className="shrink-0" />}
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
          collapsed ? "w-[5rem]" : "w-[19.75rem]"
        }`}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Slim mobile bar — desktop has no top bar at all now. The drawer opens
            BELOW it (11 Oct 2026), so the hamburger stays visible and turns
            into the drawer's close button. */}
        <header className="md:hidden fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-20 h-14 bg-white shadow-lg border border-gray-200 rounded-2xl px-3 flex items-center justify-between">
          <button
            type="button"
            data-sidebar-toggle=""
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={sidebarOpen}
            className="text-gray-700 hover:text-primary ui-hover p-2 rounded-lg transition"
          >
            {sidebarOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="CDC" className="w-7 h-7 object-contain" />
            <span className="font-bold text-gray-800">CDC HMS</span>
          </div>
          {/* Profile menu — on phones it lives here, on every page. */}
          {renderProfileMenu("sm")}
        </header>

        {/* Page Content */}
        {/* The app's ONLY scroll container. overflow-x-hidden: a single wide
            table must scroll inside its own wrapper, never pan the whole app.
            Top margin clears the fixed mobile bar (+notch); bottom padding
            clears the home-indicator on installed iOS. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain px-4 pt-3 lg:px-8 lg:pt-4 mt-[calc(4.75rem+env(safe-area-inset-top,0px))] md:mt-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
          {menuBesideTabs ? (
            <div className="flex items-start justify-between gap-3">
              <PageTabs tabs={pageTabs} />
              <div className="hidden md:block">{renderProfileMenu()}</div>
            </div>
          ) : (
            pageTabs && <PageTabs tabs={pageTabs} />
          )}
          {mailInNav && <MailNudge state={mailState} userId={currentUser?.id} role={homeRole} />}
          <PageHeaderSlotContext.Provider value={headerSlot}>
            <Outlet />
          </PageHeaderSlotContext.Provider>
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
