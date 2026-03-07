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
