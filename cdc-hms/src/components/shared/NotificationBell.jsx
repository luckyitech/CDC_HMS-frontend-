import { useState } from 'react';
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

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead } = useNotificationContext();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (n) => {
    if (!n.isRead) markAsRead(n.id);
    setOpen(false);
    navigate(`/doctor/patient-profile/${n.patientUhid}`, { state: { activeTab: 'medical-documents' } });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col max-h-[80vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-bold text-gray-800 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

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
        </>
      )}
    </div>
  );
};

export default NotificationBell;
