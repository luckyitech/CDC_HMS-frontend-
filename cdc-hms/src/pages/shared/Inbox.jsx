import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, FlaskConical, Bell, BarChart3, Facebook, Instagram, Lock } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canViewComms as canViewCommsCap, canWriteComms as canWriteCommsCap, canViewLabInbox as canViewLabInboxCap, canUseMail as canUseMailCap, hasPermission, PERMISSIONS } from '../../utils/permissions';
import commsService from '../../services/commsService';
import mailService from '../../services/mailService';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import ChannelTab from '../../components/inbox/ChannelTab';
import LabReportsTab from '../../components/inbox/LabReportsTab';
import RemindersTab from '../../components/inbox/RemindersTab';
import InboxAnalytics from '../../components/inbox/InboxAnalytics';
import MailTab from '../../components/mail/MailTab';

// One "Inbox" for everything reaching the clinic from outside: patient messages
// on WhatsApp, Facebook Messenger and Instagram, external lab reports (email +
// WhatsApp), reminders, and analytics. All three chat channels share ChannelTab.
// Plus "My mail" (Staff Email, B26): the user's OWN clinic mailbox. It is
// personal, not shared clinic work, so it sits first, apart from the clinic
// channels behind a divider, with a lock icon and its own count.
const Inbox = () => {
  const { currentUser } = useUserContext();
  const [params, setParams] = useSearchParams();
  const [badge, setBadge] = useState(null);

  const role = currentUser?.role;
  // Shared capability gates (utils/permissions) so this tab strip, the sidebar
  // entry and the standalone Lab Inbox page agree — and honour the admin.access
  // bypass the API grants. See canUseCapability.
  const canViewComms = canViewCommsCap(currentUser);
  const canWriteComms = canWriteCommsCap(currentUser);
  const canViewLab = canViewLabInboxCap(currentUser);
  const canUseMail = canUseMailCap(currentUser);
  const isAdmin = role === 'admin' || hasPermission(currentUser, PERMISSIONS.ADMIN_ACCESS);

  const refreshBadge = useCallback(() => { if (canViewComms || canViewLab) commsService.badge().then((r) => setBadge(r.data)).catch(() => {}); }, [canViewComms, canViewLab]);
  const [mailUnread, setMailUnread] = useState(0);
  const refreshMail = useCallback(() => { if (canUseMail) mailService.unread().then((r) => setMailUnread(r.data?.unread || 0)).catch(() => {}); }, [canUseMail]);
  useEffect(() => { refreshMail(); window.addEventListener('mail:changed', refreshMail); const t = setInterval(refreshMail, 120000); return () => { window.removeEventListener('mail:changed', refreshMail); clearInterval(t); }; }, [refreshMail]);
  useEffect(() => { refreshBadge(); const h = () => refreshBadge(); window.addEventListener('comms:changed', h); window.addEventListener('lab-inbox:changed', h); const t = setInterval(refreshBadge, 60000); return () => { window.removeEventListener('comms:changed', h); window.removeEventListener('lab-inbox:changed', h); clearInterval(t); }; }, [refreshBadge]);

  // The tabs the user can open. WhatsApp, Messenger and Instagram all render the
  // same ChannelTab, scoped by channel; each shows its own unread badge when the
  // API reports one. Uses the app's standard SwitcherTabs look.
  const liveTabs = [
    canViewComms && { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, count: badge?.whatsapp?.unread || undefined },
    canViewComms && { id: 'messenger', label: 'Messenger', Icon: Facebook, count: badge?.messenger?.unread || undefined },
    canViewComms && { id: 'instagram', label: 'Instagram', Icon: Instagram, count: badge?.instagram?.unread || undefined },
    canViewLab && { id: 'lab', label: 'Lab reports', Icon: FlaskConical, count: badge?.lab?.new || undefined },
    canViewComms && { id: 'reminders', label: 'Reminders', Icon: Bell, count: badge?.reminders?.due || undefined },
    canViewComms && { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  ].filter(Boolean);
  const mailTabs = canUseMail ? [{ id: 'mail', label: 'My mail', Icon: Lock, count: mailUnread || undefined, title: 'Your own mailbox — only you can open it here' }] : [];
  const liveKeys = [...mailTabs, ...liveTabs].map((t) => t.id);

  // Default to the first clinic channel when there is one — the Inbox has
  // always opened on shared work; My mail is one click (or ?tab=mail) away.
  const tab = liveKeys.includes(params.get('tab')) ? params.get('tab') : ((liveTabs[0] || mailTabs[0])?.id || 'whatsapp');
  const setTab = (key) => { if (liveKeys.includes(key)) setParams((p) => { p.set('tab', key); return p; }, { replace: true }); };

  if (!liveTabs.length && !mailTabs.length) return <div className="p-8 text-center text-gray-400">You don't have access to the Inbox.</div>;

  return (
    <div className="mx-auto max-w-7xl p-3 sm:p-4">
      <h1 className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-800"><MessageCircle className="text-emerald-600" /> Inbox</h1>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {mailTabs.length > 0 && <SwitcherTabs tabs={mailTabs} active={tab} onChange={setTab} />}
        {mailTabs.length > 0 && liveTabs.length > 0 && <span className="hidden h-8 w-px bg-gray-300 sm:block" aria-hidden="true" />}
        {liveTabs.length > 0 && <SwitcherTabs tabs={liveTabs} active={tab} onChange={setTab} />}
      </div>

      {tab === 'mail' && canUseMail && <MailTab />}

      {tab === 'whatsapp' && canViewComms && <ChannelTab channel="whatsapp" canWrite={canWriteComms} />}
      {tab === 'messenger' && canViewComms && <ChannelTab channel="messenger" canWrite={canWriteComms} />}
      {tab === 'instagram' && canViewComms && <ChannelTab channel="instagram" canWrite={canWriteComms} />}
      {tab === 'lab' && canViewLab && <LabReportsTab />}
      {tab === 'reminders' && canViewComms && <RemindersTab canWrite={canWriteComms} />}
      {tab === 'analytics' && canViewComms && <InboxAnalytics isAdmin={isAdmin} />}
    </div>
  );
};

export default Inbox;
