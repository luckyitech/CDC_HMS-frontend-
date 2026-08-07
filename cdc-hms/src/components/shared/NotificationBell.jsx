import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, FileText, X } from 'lucide-react';
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

const NotificationBell = ({ userRole = 'doctor' }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllReadLocal, clearAll } = useNotificationContext();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (n) => {
    if (!n.isRead) markAsRead(n.id);
    setOpen(false);
    const base = PROFILE_BASE[String(userRole).toLowerCase()];
    if (base && n.patientUhid) {
      navigate(`${base}/patient-profile/${n.patientUhid}`, { state: { activeTab: 'medical-documents' } });
    }
  };

  return (
    <div className="relative">
      {/* Bell trigger — light so it reads clearly against the blue sidebar */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] leading-none font-bold rounded-full shadow ring-2 ring-blue-700">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel — floats to the right of the sidebar as an extension of it.
              Fixed so it escapes the sidebar's overflow-hidden clipping.
              Mobile: a bottom sheet. Desktop: beside the expanded rail. */}
          <div className="fixed z-50 left-4 right-4 bottom-4 lg:left-[19.5rem] lg:right-auto lg:w-96 flex flex-col max-h-[75vh] bg-white rounded-[20px] shadow-2xl ring-1 ring-black/5 overflow-hidden">

            {/* Header — blue, echoes the sidebar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="font-bold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-blue-100 hover:text-white p-1" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions — local to this user only; never touch other members' notifications */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                <button
                  onClick={markAllReadLocal}
                  disabled={unreadCount === 0}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  Mark all as read
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${!n.isRead ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <FileText className={`w-4 h-4 ${!n.isRead ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                        {n.patientName}
                        <span className="text-gray-400 font-normal ml-1">· {n.patientUhid}</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{n.documentCategory}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Uploaded by {n.uploadedBy} · {timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
