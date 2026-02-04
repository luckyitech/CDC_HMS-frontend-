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

export const showNotification = (message, isBlue = false) => {
  const div = document.createElement('div');
  div.className = `fixed top-4 right-4 ${isBlue ? 'bg-blue-500' : 'bg-green-500'} text-white px-6 py-4 rounded-lg shadow-lg z-50`;
  div.innerHTML = `<p class="font-bold">${message}</p>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
};
