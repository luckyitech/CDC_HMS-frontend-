export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const getStatusBadge = (status) => {
  const colors = {
    'Reviewed': 'bg-green-100 text-green-700 border-green-300',
    'Pending Review': 'bg-yellow-100 text-yellow-700 border-yellow-300'
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
};

export const getCategoryIcon = (category) => {
  const icons = {
    'Lab Report - External': '🔬',
    'Imaging Report': '🏥',
    'Endocrinology Report': '⚕️',
    'Cardiology Report': '❤️',
    'Nephrology Report': '🩺',
    'Ophthalmology Report': '👁️',
    'Neuropathy Screening Test': '🧠',
    'Specialist Consultation Report': '👨‍⚕️',
    'Other Medical Document': '📄'
  };
  return icons[category] || '📄';
};

import toast from 'react-hot-toast';

export const showNotification = (message, isBlue = false) => {
  if (isBlue) {
    toast.info(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: '#FFFFFF',
        fontWeight: 'bold',
        padding: '16px',
      },
    });
  } else {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      icon: '✅',
      style: {
        background: '#10B981',
        color: '#FFFFFF',
        fontWeight: 'bold',
        padding: '16px',
      },
    });
  }
};

// Confirmation copy for document actions — shared by the Medical Documents
// page and the patient-profile documents tab so wording stays consistent.
// Add new document actions here and both views pick them up.
export const DOCUMENT_ACTIONS = {
  hide: {
    title: 'Hide from Patient',
    confirmLabel: 'Hide from Patient',
    variant: 'primary',
    message: (doc) => `Hide "${doc.fileName}" from the patient portal? Doctors and staff will still see it.`,
  },
  archive: {
    title: 'Archive File',
    confirmLabel: 'Archive File',
    variant: 'danger',
    withReason: true,
    reasonLabel: 'Reason for archiving (optional)',
    message: (doc) => `Archive "${doc.fileName}"? It will be hidden from every view (doctors, staff and patients) but never deleted. You can restore it from the "Archived Files" view.`,
  },
  restore: {
    title: 'Restore File',
    confirmLabel: 'Restore',
    variant: 'primary',
    message: (doc) => `Restore "${doc.fileName}"? It will reappear in all views.`,
  },
};
