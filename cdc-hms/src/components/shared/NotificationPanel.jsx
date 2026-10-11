import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, FileText, CalendarDays, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../../contexts/NotificationContext';

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// Only these roles have a patient-profile route to open. Others just mark-as-read.
const PROFILE_BASE = { doctor: '/doctor', staff: '/staff' };

/**
 * NotificationPanel — the in-app notifications list (11 Oct 2026).
 *
 * Opened from the profile menu (components/shared/ProfileMenu.jsx), which
 * replaced the bell in the sidebar footer. Rendered only while open; the
 * opener owns the open state and passes onClose. Escape and a click on the
 * backdrop close it. Styled as a sidebar island (sidebar.css) — the same
 * glass, pills and hover as the sidebar and the profile menu.
 */
const NotificationPanel = ({ userRole = 'doctor', onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllReadLocal, clearAll } = useNotificationContext();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleNotificationClick = (n) => {
    if (!n.isRead) markAsRead(n.id);
    onClose();
    // B27: HR alerts (and anything newer) carry their own in-app path.
    if (n.link && n.link.startsWith('/')) {
      navigate(n.link);
      return;
    }
    const base = PROFILE_BASE[String(userRole).toLowerCase()];
    if (base && n.patientUhid) {
      navigate(`${base}/patient-profile/${n.patientUhid}`, { state: { activeTab: 'medical-documents' } });
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel — a sidebar island (sidebar.css): same glass, pills, hover and
          icons. Portalled to <body> so no page container clips it.
          Phones: from just below the top bar to the bottom, with the same
          insets as the drawer. md+: under the avatar, top right. */}
      <div className="sb-white fixed z-50 top-[calc(4.75rem+env(safe-area-inset-top,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] md:top-16 md:bottom-auto md:left-auto md:right-4 lg:right-8 md:w-96 md:max-h-[75vh] flex flex-col">
        <div role="dialog" aria-label="Notifications" className="sb-island sb-drop flex flex-col min-h-0 h-full p-2">

          {/* Header */}
          <div className="flex items-center gap-2 px-2.5 pt-1 pb-2">
            <span className="w-8 h-8 rounded-full sb-disc flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 sb-icon" />
            </span>
            <span className="font-bold text-sm sb-strong">Notifications</span>
            {unreadCount > 0 && (
              <span className="ui-badge text-[11px] px-2 py-0.5 rounded-full">{unreadCount} new</span>
            )}
            <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center sb-muted sb-hover" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions — local to this user only; never touch other members' notifications */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-2.5 pb-1.5">
              <button
                onClick={markAllReadLocal}
                disabled={unreadCount === 0}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
              >
                Mark all as read
              </button>
              <button onClick={clearAll} className="text-xs font-semibold sb-muted hover:text-red-600 transition-colors">
                Clear all
              </button>
            </div>
          )}
          <div className="sb-divider" />

          {/* List */}
          <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain sidebar-scroll py-1 flex flex-col gap-0.5">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sb-muted">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = n.category && n.category !== 'document' ? CalendarDays : FileText;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="w-full text-left flex items-start gap-3 px-2.5 py-2 rounded-[22px] sb-hover transition-colors"
                  >
                    <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? 'sb-disc-on' : 'sb-disc'}`}>
                      <Icon className="w-4 h-4 sb-icon" />
                    </span>
                    {n.category && n.category !== 'document' ? (
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.isRead ? 'font-semibold sb-strong' : 'font-medium sb-text'}`}>{n.title}</p>
                        {n.body && <p className="text-xs sb-text mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-xs sb-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.isRead ? 'font-semibold sb-strong' : 'font-medium sb-text'}`}>
                          {n.patientName}
                          <span className="sb-muted font-normal ml-1">· {n.patientUhid}</span>
                        </p>
                        <p className="text-xs sb-text truncate mt-0.5">{n.documentCategory}</p>
                        <p className="text-xs sb-muted mt-0.5">Uploaded by {n.uploadedBy} · {timeAgo(n.createdAt)}</p>
                      </div>
                    )}
                    {!n.isRead && <span className="mt-2 w-2 h-2 rounded-full sb-dot shrink-0" aria-label="Unread" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default NotificationPanel;
