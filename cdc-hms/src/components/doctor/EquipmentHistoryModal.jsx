import Modal from '../shared/Modal';
import Button from '../shared/Button';

const EquipmentHistoryModal = ({ isOpen, onClose, history }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);

    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months > 1 ? 's' : ''}`;
    }
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📜 Equipment History">
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-gray-500">No equipment history</p>
            <p className="text-sm text-gray-400 mt-1">Previous equipment will appear here</p>
          </div>
        ) : (
          history.map((item, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">
                    {item.deviceType === 'pump' ? '⚡ Insulin Pump' : '📡 Transmitter'}
                  </p>
                  <p className="text-sm text-gray-600">Serial: {item.serialNo}</p>
                </div>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                  Archived
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {item.model && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-semibold text-gray-800">{item.model}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Used Period:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(item.startDate)} - {formatDate(item.endDate)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-semibold text-gray-800">
                    {calculateDuration(item.startDate, item.endDate)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Warranty:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(item.warrantyStartDate)} - {formatDate(item.warrantyEndDate)}
                  </span>
                </div>

                {item.reason && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-500">
                    <p className="text-xs font-semibold text-gray-700">Reason for Archive:</p>
                    <p className="text-sm text-gray-800">{item.reason}</p>
                  </div>
                )}

                <div className="pt-2 border-t mt-3">
                  <p className="text-xs text-gray-500">
                    Archived by {item.archivedBy} on {formatDate(item.archivedDate)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Close Button */}
        <div className="pt-4">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EquipmentHistoryModal;