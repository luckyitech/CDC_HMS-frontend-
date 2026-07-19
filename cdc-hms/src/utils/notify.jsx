import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// One place for the app's toast styling (staff-portal style: soft palette
// with lucide icons) — use instead of inlining style objects at call sites.
const STYLES = {
  success: { background: '#D1FAE5', color: '#065F46' },
  error:   { background: '#FEE2E2', color: '#991B1B' },
  info:    { background: '#DBEAFE', color: '#1E40AF' },
};

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5" />,
  error:   <AlertCircle className="w-5 h-5" />,
  info:    <CheckCircle2 className="w-5 h-5" />,
};

export const notify = (type, message, { duration = 4000 } = {}) => {
  const fn = type === 'error' ? toast.error : type === 'success' ? toast.success : toast;
  return fn(message, {
    duration,
    icon: ICONS[type] || ICONS.info,
    style: {
      ...(STYLES[type] || STYLES.info),
      fontWeight: 'bold',
      padding: '16px',
      whiteSpace: 'pre-line',
    },
  });
};
