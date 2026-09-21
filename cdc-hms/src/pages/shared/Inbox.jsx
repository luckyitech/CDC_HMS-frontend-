import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, FlaskConical, Bell, BarChart3 } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { hasPermission, isWithdrawn, PERMISSIONS } from '../../utils/permissions';
import commsService from '../../services/commsService';
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

  const tabs = [
    canViewComms && { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, badge: badge?.whatsapp?.unread },
    canViewLab && { key: 'lab', label: 'Lab reports', Icon: FlaskConical, badge: badge?.lab?.new },
    canViewComms && { key: 'reminders', label: 'Reminders', Icon: Bell, badge: badge?.reminders?.due },
    canViewComms && { key: 'analytics', label: 'Analytics', Icon: BarChart3 },
  ].filter(Boolean);

  const tab = params.get('tab') || (tabs[0]?.key || 'whatsapp');
  const setTab = (key) => setParams((p) => { p.set('tab', key); return p; }, { replace: true });

  if (!tabs.length) return <div className="p-8 text-center text-gray-400">You don't have access to the Inbox.</div>;

  return (
    <div className="mx-auto max-w-7xl p-3 sm:p-4">
      <h1 className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-800"><MessageCircle className="text-emerald-600" /> Inbox</h1>
      <div className="mb-3 flex flex-wrap gap-1 border-b">
        {tabs.map(({ key, label, Icon, badge: b }) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${tab === key ? 'border-emerald-600 font-semibold text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon size={16} /> {label}
            {b > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-[11px] text-white">{b}</span>}
          </button>
        ))}
        <span className="ml-2 flex items-center gap-2 self-center text-[11px] text-gray-300">
          <span className="cursor-not-allowed">Messenger · soon</span>
          <span className="cursor-not-allowed">Instagram · soon</span>
        </span>
      </div>

      {tab === 'whatsapp' && canViewComms && <WhatsAppTab canWrite={canWriteComms} />}
      {tab === 'lab' && canViewLab && <LabReportsTab />}
      {tab === 'reminders' && canViewComms && <RemindersTab canWrite={canWriteComms} />}
      {tab === 'analytics' && canViewComms && <InboxAnalytics isAdmin={isAdmin} />}
    </div>
  );
};

export default Inbox;
