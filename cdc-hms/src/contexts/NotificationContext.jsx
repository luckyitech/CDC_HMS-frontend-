import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';
import notificationService from '../services/notificationService';
import { useUserContext } from './UserContext';

// Set to true to show all document notifications to all doctors.
// Set to false to show only notifications for the doctor's own patients.
const NOTIFY_ALL_DOCTORS = import.meta.env.VITE_NOTIFY_ALL_DOCTORS !== 'false';

const NotificationContext = createContext();

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useUserContext();
  const isDoctor = currentUser?.role === 'doctor';

  const [notifications, setNotifications]   = useState([]);
  const [unreadCount,   setUnreadCount]     = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!isDoctor) return;
    try {
      const res = await notificationService.getAll();
      setNotifications(res.data?.notifications ?? []);
      setUnreadCount(res.data?.unreadCount ?? 0);
    } catch {
      // silent — bell just shows 0
    }
  }, [isDoctor]);

  // Load on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for live SSE document_uploaded events
  useEffect(() => {
    if (!isDoctor) return;

    const SSE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse`;
    const source  = new EventSource(SSE_URL);

    source.addEventListener('document_uploaded', (e) => {
      try {
        const data = JSON.parse(e.data);

        // Respect NOTIFY_ALL_DOCTORS flag
        if (!NOTIFY_ALL_DOCTORS && data.assignedDoctorId !== currentUser?.id) return;

        // Add to top of list and bump unread count
        setNotifications(prev => [data, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        // Live toast
        toast(
          `New document uploaded\n${data.patientName} (${data.patientUhid})\n${data.documentCategory} · by ${data.uploadedBy}`,
          {
            duration: 6000,
            position: 'top-right',
            icon: <FileText className="w-5 h-5 text-blue-600" />,
            style: { background: '#DBEAFE', color: '#1E40AF', whiteSpace: 'pre-line', fontWeight: '600' },
          }
        );
      } catch {
        // Malformed SSE payload — ignore silently
      }
    });

    source.onerror = () => {
      // Browser auto-reconnects — no action needed, suppress console noise
    };

    return () => source.close();
  }, [isDoctor, currentUser?.id]);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  // ── Local-only bulk actions ────────────────────────────────────────────────
  // These affect ONLY this user's current panel view — they make no server call,
  // so the shared notification rows (and other members' panels) are untouched.
  // Note: because there is no per-user notification state in the backend, these
  // reset on a full page reload / next fetch. A persistent per-user clear would
  // need a new backend table + endpoint.
  const markAllReadLocal = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, markAllReadLocal, clearAll, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
