import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, FlaskConical, Bell, BarChart3, Clock } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { hasPermission, isWithdrawn, PERMISSIONS } from '../../utils/permissions';
import commsService from '../../services/commsService';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import WhatsAppTab from '../../components/inbox/WhatsAppTab';
import LabReportsTab from '../../components/inbox/LabReportsTab';
import RemindersTab from '../../components/inbox/RemindersTab';
import InboxAnalytics from '../../components/inbox/InboxAnalytics';

// One "Inbox" for everything reaching the clinic from outside: patient WhatsApp
// messages, external lab reports (email + WhatsApp), reminders, and analytics.
// Channel-generic — Messenger/Instagram are shown "soon" (disabled) later.
const Inbox = () => {
  const { currentUser } = useUserContext();
  const [params, setParams] = useSearchParams();
  const [badge, setBadge] = useState(null);

  const role = currentUser?.role;
  const commsByRole = ['staff', 'doctor', 'nurse', 'admin'].includes(role);
  const labByRole = ['staff', 'lab', 'admin'].includes(role);
  const canViewComms = (commsByRole || hasPermission(currentUser, PERMISSIONS.COMMS_VIEW)) && !isWithdrawn(currentUser, PERMISSIONS.COMMS_VIEW);
  const canWriteComms = (commsByRole || hasPermission(currentUser, PERMISSIONS.COMMS_WRITE)) && !isWithdrawn(currentUser, PERMISSIONS.COMMS_WRITE);
  const canViewLab = (labByRole || hasPermission(currentUser, PERMISSIONS.LABINBOX_VIEW)) && !isWithdrawn(currentUser, PERMISSIONS.LABINBOX_VIEW);
  const isAdmin = role === 'admin' || hasPermission(currentUser, PERMISSIONS.ADMIN_ACCESS);

  const refreshBadge = useCallback(() => { commsService.badge().then((r) => setBadge(r.data)).catch(() => {}); }, []);
  useEffect(() => { refreshBadge(); const h = () => refreshBadge(); window.addEventListener('comms:changed', h); window.addEventListener('lab-inbox:changed', h); const t = setInterval(refreshBadge, 60000); return () => { window.removeEventListener('comms:changed', h); window.removeEventListener('lab-inbox:changed', h); clearInterval(t); }; }, [refreshBadge]);

  // Live tabs the user can open, plus the two channels that are not wired up yet
  // (shown disabled so the roadmap is visible without being clickable). Uses the
  // app's standard SwitcherTabs look, same as LabInbox's own sub-tabs.
  const liveTabs = [
    canViewComms && { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, count: badge?.whatsapp?.unread || undefined },
    canViewLab && { id: 'lab', label: 'Lab reports', Icon: FlaskConical, count: badge?.lab?.new || undefined },
    canViewComms && { id: 'reminders', label: 'Reminders', Icon: Bell, count: badge?.reminders?.due || undefined },
    canViewComms && { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  ].filter(Boolean);
  const soonTabs = canViewComms ? [
    { id: 'messenger-soon', label: 'Messenger · soon', Icon: Clock, disabled: true, title: 'Coming soon' },
    { id: 'instagram-soon', label: 'Instagram · soon', Icon: Clock, disabled: true, title: 'Coming soon' },
  ] : [];
  const liveKeys = liveTabs.map((t) => t.id);

  const tab = liveKeys.includes(params.get('tab')) ? params.get('tab') : (liveKeys[0] || 'whatsapp');
  const setTab = (key) => { if (liveKeys.includes(key)) setParams((p) => { p.set('tab', key); return p; }, { replace: true }); };

  if (!liveTabs.length) return <div className="p-8 text-center text-gray-400">You don't have access to the Inbox.</div>;

  return (
    <div className="mx-auto max-w-7xl p-3 sm:p-4">
      <h1 className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-800"><MessageCircle className="text-emerald-600" /> Inbox</h1>
      <SwitcherTabs className="mb-3" tabs={[...liveTabs, ...soonTabs]} active={tab} onChange={setTab} />

      {tab === 'whatsapp' && canViewComms && <WhatsAppTab canWrite={canWriteComms} />}
      {tab === 'lab' && canViewLab && <LabReportsTab />}
      {tab === 'reminders' && canViewComms && <RemindersTab canWrite={canWriteComms} />}
      {tab === 'analytics' && canViewComms && <InboxAnalytics isAdmin={isAdmin} />}
    </div>
  );
};

export default Inbox;
