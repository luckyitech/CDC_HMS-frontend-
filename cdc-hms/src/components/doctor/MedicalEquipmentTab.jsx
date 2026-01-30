import { useState } from 'react';
import { 
  Battery, 
  Zap, 
  Radio, 
  PlusCircle, 
  TrendingUp, 
  RefreshCw, 
  Edit, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Circle
} from 'lucide-react';
import Card from '../shared/Card';
import Button from '../shared/Button';
import AddEquipmentModal from './AddEquipmentModal';
import EquipmentHistoryModal from './EquipmentHistoryModal';
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';
import toast, { Toaster } from 'react-hot-toast';

const MedicalEquipmentTab = ({ patient }) => {
  const { currentUser } = useUserContext();
  const {
    addMedicalEquipment,
    updateMedicalEquipment,
    replaceMedicalEquipment,
    getMedicalEquipmentHistory,
    getEquipmentWarrantyStatus
  } = usePatientContext();

  const [showAddPumpModal, setShowAddPumpModal] = useState(false);
  const [showAddTransmitterModal, setShowAddTransmitterModal] = useState(false);
  const [showEditPumpModal, setShowEditPumpModal] = useState(false);
  const [showEditTransmitterModal, setShowEditTransmitterModal] = useState(false);
  const [showReplacePumpModal, setShowReplacePumpModal] = useState(false);
  const [showReplaceTransmitterModal, setShowReplaceTransmitterModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const equipment = patient?.medicalEquipment?.insulinPump;
  const hasPump = equipment?.hasPump && equipment?.current;
  const hasTransmitter = equipment?.transmitter?.hasTransmitter;
  const history = getMedicalEquipmentHistory(patient?.uhid);

  // Check if user is staff (can delete/replace)
  const isStaff = currentUser?.role === 'Staff';

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate days between dates
  const calculateDaysInUse = (startDate) => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today - start) / (1000 * 60 * 60 * 24));
  };

  // Handle Add Pump
  const handleAddPump = (equipmentData) => {
    const userName = currentUser?.name || 'Unknown User';
    const result = addMedicalEquipment(patient.uhid, equipmentData, userName);
    
    if (result.success) {
      toast.success('✅ Insulin pump added successfully!');
      setShowAddPumpModal(false);
    } else {
      toast.error('❌ Failed to add insulin pump');
    }
  };

  // Handle Add Transmitter
  const handleAddTransmitter = (equipmentData) => {
    const userName = currentUser?.name || 'Unknown User';
    const result = addMedicalEquipment(patient.uhid, equipmentData, userName);
    
    if (result.success) {
      toast.success('✅ Transmitter added successfully!');
      setShowAddTransmitterModal(false);
    } else {
      toast.error('❌ Failed to add transmitter');
    }
  };

  // Handle Edit Pump
  const handleEditPump = (equipmentData) => {
    const userName = currentUser?.name || 'Unknown User';
    const result = updateMedicalEquipment(patient.uhid, equipmentData, userName);
    
    if (result.success) {
      toast.success('✅ Insulin pump updated successfully!');
      setShowEditPumpModal(false);
    } else {
      toast.error('❌ Failed to update insulin pump');
    }
  };

  // Handle Edit Transmitter
  const handleEditTransmitter = (equipmentData) => {
    const userName = currentUser?.name || 'Unknown User';
    const result = updateMedicalEquipment(patient.uhid, equipmentData, userName);
    
    if (result.success) {
      toast.success('✅ Transmitter updated successfully!');
      setShowEditTransmitterModal(false);
    } else {
      toast.error('❌ Failed to update transmitter');
    }
  };

  // Handle Replace Pump
  const handleReplacePump = (equipmentData, reason) => {
    const userName = currentUser?.name || 'Unknown User';
    const result = replaceMedicalEquipment(patient.uhid, equipmentData, reason, userName);
    
    if (result.success) {
      toast.success('✅ Insulin pump replaced successfully!');
      setShowReplacePumpModal(false);
    } else {
      toast.error('❌ Failed to replace insulin pump');
    }
  };

  // Handle Replace Transmitter
  const handleReplaceTransmitter = (equipmentData, reason) => {
    const userName = currentUser?.name || 'Unknown User';
    const result = replaceMedicalEquipment(patient.uhid, equipmentData, reason, userName);
    
    if (result.success) {
      toast.success('✅ Transmitter replaced successfully!');
      setShowReplaceTransmitterModal(false);
    } else {
      toast.error('❌ Failed to replace transmitter');
    }
  };

  // Get warranty badge
  const getWarrantyBadge = (warrantyEndDate) => {
    const status = getEquipmentWarrantyStatus(warrantyEndDate);
    if (!status) return null;

    const colors = {
      expired: 'bg-red-100 text-red-700 border-red-300',
      'expiring-soon': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      active: 'bg-green-100 text-green-700 border-green-300'
    };

    const icons = {
      expired: <Circle className="w-3 h-3 fill-red-600 text-red-600" />,
      'expiring-soon': <AlertCircle className="w-3 h-3" />,
      active: <CheckCircle className="w-3 h-3" />
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${colors[status.status]}`}>
        {icons[status.status]} {status.message}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Empty State */}
      {!hasPump && !hasTransmitter && (
        <Card>
          <div className="text-center py-12">
            <Battery className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-bold text-gray-800 mb-2">
              No Medical Equipment Registered
            </p>
            <p className="text-gray-600 mb-6">
              This patient does not have an insulin pump or transmitter on record.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setShowAddPumpModal(true)}>
                <Zap className="w-4 h-4 mr-2" />
                Add Insulin Pump
              </Button>
              <Button variant="secondary" onClick={() => setShowAddTransmitterModal(true)}>
                <Radio className="w-4 h-4 mr-2" />
                Add Transmitter
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Insulin Pump Card */}
      {hasPump && (
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap className="w-10 h-10 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-800">Insulin Pump</h3>
                <p className="text-sm text-gray-600">Active Equipment</p>
              </div>
            </div>
            {getWarrantyBadge(equipment.current.warrantyEndDate)}
          </div>

          {/* Pump Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Model</p>
                <p className="text-lg font-bold text-gray-800">
                  {equipment.current.model || 'Not specified'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Manufacturer</p>
                <p className="text-lg font-bold text-gray-800">
                  {equipment.current.manufacturer || 'Not specified'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Serial Number</p>
                <p className="text-lg font-bold text-primary">
                  {equipment.current.serialNo}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Type</p>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  {equipment.current.type === 'new' ? (
                    <><PlusCircle className="w-4 h-4" /> New Patient</>
                  ) : equipment.current.type === 'upgrade' ? (
                    <><TrendingUp className="w-4 h-4" /> Upgrade</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Replacement</>
                  )}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Start Date</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(equipment.current.startDate)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  In use for {calculateDaysInUse(equipment.current.startDate)} days
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Warranty Period</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(equipment.current.warrantyStartDate)} - {formatDate(equipment.current.warrantyEndDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Added By</p>
                <p className="text-sm text-gray-800">{equipment.current.addedBy}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(equipment.current.addedDate)}
                </p>
              </div>

              {equipment.current.lastUpdatedBy !== equipment.current.addedBy && (
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Last Updated By</p>
                  <p className="text-sm text-gray-800">{equipment.current.lastUpdatedBy}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(equipment.current.lastUpdatedDate)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditPumpModal(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </Button>
            {isStaff && (
              <Button variant="outline" onClick={() => setShowReplacePumpModal(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Replace Pump
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Add Pump Button (when no pump) */}
      {!hasPump && hasTransmitter && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No insulin pump registered</p>
            <Button onClick={() => setShowAddPumpModal(true)}>
              <Zap className="w-4 h-4 mr-2" />
              Add Insulin Pump
            </Button>
          </div>
        </Card>
      )}

      {/* Transmitter Card */}
      {hasTransmitter && (
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <Radio className="w-10 h-10 text-purple-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-800">Transmitter</h3>
                <p className="text-sm text-gray-600">Active Equipment</p>
              </div>
            </div>
            {getWarrantyBadge(equipment.transmitter.warrantyEndDate)}
          </div>

          {/* Transmitter Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Serial Number</p>
                <p className="text-lg font-bold text-primary">
                  {equipment.transmitter.serialNo}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Type</p>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  {equipment.transmitter.type === 'new' ? (
                    <><PlusCircle className="w-4 h-4" /> New Patient</>
                  ) : equipment.transmitter.type === 'upgrade' ? (
                    <><TrendingUp className="w-4 h-4" /> Upgrade</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Replacement</>
                  )}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Start Date</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(equipment.transmitter.startDate)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  In use for {calculateDaysInUse(equipment.transmitter.startDate)} days
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Warranty Period</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(equipment.transmitter.warrantyStartDate)} - {formatDate(equipment.transmitter.warrantyEndDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Added By</p>
                <p className="text-sm text-gray-800">{equipment.transmitter.addedBy}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(equipment.transmitter.addedDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditTransmitterModal(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </Button>
            {isStaff && (
              <Button variant="outline" onClick={() => setShowReplaceTransmitterModal(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Replace Transmitter
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Add Transmitter Button (when no transmitter) */}
      {hasPump && !hasTransmitter && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No transmitter registered</p>
            <Button variant="secondary" onClick={() => setShowAddTransmitterModal(true)}>
              <Radio className="w-4 h-4 mr-2" />
              Add Transmitter
            </Button>
          </div>
        </Card>
      )}

      {/* Equipment History */}
      {history.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Equipment History</h3>
              <p className="text-sm text-gray-600">{history.length} archived device(s)</p>
            </div>
            <Button variant="outline" onClick={() => setShowHistoryModal(true)}>
              <FileText className="w-4 h-4 mr-2" />
              View Full History
            </Button>
          </div>

          {/* Recent History Preview */}
          <div className="space-y-3">
            {history.slice(0, 2).map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.deviceType === 'pump' ? (
                      <Zap className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Radio className="w-4 h-4 text-purple-600" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">
                        {item.deviceType === 'pump' ? 'Pump' : 'Transmitter'} - {item.serialNo}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                    Archived
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      <AddEquipmentModal
        isOpen={showAddPumpModal}
        onClose={() => setShowAddPumpModal(false)}
        onSave={handleAddPump}
        deviceType="pump"
        mode="add"
      />

      <AddEquipmentModal
        isOpen={showAddTransmitterModal}
        onClose={() => setShowAddTransmitterModal(false)}
        onSave={handleAddTransmitter}
        deviceType="transmitter"
        mode="add"
      />

      <AddEquipmentModal
        isOpen={showEditPumpModal}
        onClose={() => setShowEditPumpModal(false)}
        onSave={handleEditPump}
        deviceType="pump"
        mode="edit"
        existingData={equipment?.current}
      />

      <AddEquipmentModal
        isOpen={showEditTransmitterModal}
        onClose={() => setShowEditTransmitterModal(false)}
        onSave={handleEditTransmitter}
        deviceType="transmitter"
        mode="edit"
        existingData={equipment?.transmitter}
      />

      <AddEquipmentModal
        isOpen={showReplacePumpModal}
        onClose={() => setShowReplacePumpModal(false)}
        onSave={handleReplacePump}
        deviceType="pump"
        mode="replace"
        existingData={equipment?.current}
      />

      <AddEquipmentModal
        isOpen={showReplaceTransmitterModal}
        onClose={() => setShowReplaceTransmitterModal(false)}
        onSave={handleReplaceTransmitter}
        deviceType="transmitter"
        mode="replace"
        existingData={equipment?.transmitter}
      />

      <EquipmentHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={history}
      />
    </div>
  );
};

export default MedicalEquipmentTab;