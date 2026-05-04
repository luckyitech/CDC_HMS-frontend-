import { useState, useEffect } from "react";
import {
  Battery, Zap, Radio, PlusCircle, TrendingUp, RefreshCw,
  Edit, FileText, AlertCircle, CheckCircle, Circle,
  Globe, Mail, Lock, Eye, EyeOff, User, Users, Trash2, Phone,
} from "lucide-react";
import Card from "../shared/Card";
import Button from "../shared/Button";
import AddEquipmentModal from "./AddEquipmentModal";
import EquipmentHistoryModal from "./EquipmentHistoryModal";
import AddCareLinkPartnerModal from "./AddCareLinkPartnerModal";
import { usePatientContext } from "../../contexts/PatientContext";
import { useUserContext } from "../../contexts/UserContext";
import toast from "react-hot-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

const calculateDaysInUse = (startDate) =>
  Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));

// ── CareLink display config ───────────────────────────────────────────────────
// To add a new CareLink display field: one entry here — no other changes needed.
const CARELINK_DISPLAY = [
  { key: 'careLinkCountry',  label: 'Country',  Icon: Globe,  sensitive: false },
  { key: 'careLinkEmail',    label: 'Email',    Icon: Mail,   sensitive: false },
  { key: 'careLinkPassword', label: 'Password', Icon: Lock,   sensitive: true  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const DetailRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-600 uppercase font-semibold">{label}</p>
    <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || '—'}</p>
  </div>
);

// Displays the patient's HMS account info (read-only, from patient prop).
const HmsAccountSection = ({ patient }) => (
  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">HMS Account</p>
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Username</p>
          <p className="text-sm font-semibold text-gray-800">{patient?.username || '—'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm font-semibold text-gray-800">{patient?.email || '—'}</p>
        </div>
      </div>
    </div>
  </div>
);

// Displays CareLink account details with show/hide toggle on the password.
const CareLinkSection = ({ equipment }) => {
  const [showPassword, setShowPassword] = useState(false);
  const hasAnyData = CARELINK_DISPLAY.some((f) => equipment[f.key]);
  if (!hasAnyData) return (
    <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
      <p className="text-sm text-gray-500">No CareLink account details recorded</p>
    </div>
  );
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">CareLink Account</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CARELINK_DISPLAY.map(({ key, label, Icon, sensitive }) => (
          <div key={key} className="flex items-start gap-2">
            <Icon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-500">{label}</p>
              {sensitive ? (
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-gray-800 font-mono">
                    {equipment[key] ? (showPassword ? equipment[key] : '••••••••') : '—'}
                  </p>
                  {equipment[key] && (
                    <button onClick={() => setShowPassword((v) => !v)} className="text-gray-400 hover:text-gray-600 ml-1">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-800 truncate">{equipment[key] || '—'}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Displays and manages the list of CareLink partners.
const CareLinkPartnersSection = ({ partners, onAdd, onEdit, onRemove }) => (
  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-500" />
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          CareLink Partners
        </p>
        {partners.length > 0 && (
          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold border border-gray-300">
            {partners.length}
          </span>
        )}
      </div>
      <button
        onClick={onAdd}
        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        <PlusCircle className="w-3.5 h-3.5" /> Add Partner
      </button>
    </div>

    {partners.length === 0 ? (
      <p className="text-sm text-gray-500 text-center py-2">No CareLink partners recorded</p>
    ) : (
      <div className="space-y-2">
        {partners.map((p) => (
          <div key={p.id} className="flex items-start justify-between bg-white rounded-lg p-3 border border-gray-200">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-gray-800">{p.firstName} {p.lastName}</p>
              <p className="text-xs text-gray-500">{p.relationship}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <Mail className="w-3 h-3" /> {p.email}
                </span>
                {p.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <Phone className="w-3 h-3" /> {p.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                onClick={() => onEdit(p)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => onRemove(p.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const MedicalEquipmentTab = ({ patient }) => {
  const { currentUser } = useUserContext();
  const {
    getEquipment,
    addMedicalEquipment,
    updateMedicalEquipment,
    replaceMedicalEquipment,
    getMedicalEquipmentHistory,
    getEquipmentAuditLog,
    getEquipmentWarrantyStatus,
    getCareLinkPartners,
    addCareLinkPartner,
    updateCareLinkPartner,
    removeCareLinkPartner,
  } = usePatientContext();

  // Modal visibility state
  const [modals, setModals] = useState({
    addPump: false, addTransmitter: false,
    editPump: false, editTransmitter: false,
    replacePump: false, replaceTransmitter: false,
    pumpHistory: false, transmitterHistory: false,
    addPartner: false, editPartner: false,
  });
  const openModal  = (key) => setModals((m) => ({ ...m, [key]: true  }));
  const closeModal = (key) => setModals((m) => ({ ...m, [key]: false }));

  const [equipmentData,   setEquipmentData]   = useState(null);
  const [history,         setHistory]         = useState([]);
  const [auditLog,        setAuditLog]        = useState([]);
  const [partners,        setPartners]        = useState([]);
  const [editingPartner,  setEditingPartner]  = useState(null);
  const [loading,         setLoading]         = useState(true);

  // Load equipment, history and audit log on mount.
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!patient?.uhid) return;
      setLoading(true);
      try {
        const [eqData, historyData, auditData, partnerData] = await Promise.all([
          getEquipment(patient.uhid),
          getMedicalEquipmentHistory(patient.uhid),
          getEquipmentAuditLog(patient.uhid),
          getCareLinkPartners(patient.uhid),
        ]);
        if (!isMounted) return;
        setEquipmentData(eqData?.insulinPump || null);
        setHistory(Array.isArray(historyData)  ? historyData  : []);
        setAuditLog(Array.isArray(auditData)   ? auditData    : []);
        setPartners(Array.isArray(partnerData) ? partnerData  : []);
      } catch (err) {
        console.error("Error loading equipment:", err);
        if (!isMounted) return;
        setEquipmentData(null);
        setHistory([]);
        setAuditLog([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [patient?.uhid, getEquipment, getMedicalEquipmentHistory, getEquipmentAuditLog]);

  // Refresh after any equipment mutation.
  const refresh = async () => {
    const [eqData, historyData, auditData] = await Promise.all([
      getEquipment(patient.uhid),
      getMedicalEquipmentHistory(patient.uhid),
      getEquipmentAuditLog(patient.uhid),
    ]);
    setEquipmentData(eqData?.insulinPump || null);
    setHistory(Array.isArray(historyData) ? historyData : []);
    setAuditLog(Array.isArray(auditData)  ? auditData  : []);
  };

  // Refresh only the partners list.
  const refreshPartners = async () => {
    const partnerData = await getCareLinkPartners(patient.uhid);
    setPartners(Array.isArray(partnerData) ? partnerData : []);
  };

  // ── Partner handlers ────────────────────────────────────────────────────────
  const handleAddPartner = async (data) => {
    const result = await addCareLinkPartner(patient.uhid, data);
    if (result.success) {
      toast.success('CareLink partner added');
      closeModal('addPartner');
      await refreshPartners();
    } else {
      toast.error(result.message || 'Failed to add partner');
    }
  };

  const handleEditPartner = async (data) => {
    const result = await updateCareLinkPartner(patient.uhid, editingPartner.id, data);
    if (result.success) {
      toast.success('CareLink partner updated');
      closeModal('editPartner');
      setEditingPartner(null);
      await refreshPartners();
    } else {
      toast.error(result.message || 'Failed to update partner');
    }
  };

  const handleRemovePartner = async (partnerId) => {
    const result = await removeCareLinkPartner(patient.uhid, partnerId);
    if (result.success) {
      toast.success('CareLink partner removed');
      await refreshPartners();
    } else {
      toast.error(result.message || 'Failed to remove partner');
    }
  };

  const equipment    = equipmentData;
  const hasPump        = equipment?.hasPump && equipment?.current;
  const hasTransmitter = equipment?.transmitter?.hasTransmitter;
  const canReplace     = ["staff", "doctor"].includes(currentUser?.role?.toLowerCase());

  // ── Mutation handlers ───────────────────────────────────────────────────────
  const handleMutation = (modalKey, successMsg, action) => async (eqData, reason) => {
    const result = await action(eqData, reason);
    if (result.success) {
      toast.success(successMsg);
      closeModal(modalKey);
      await refresh();
    } else {
      toast.error(result.message || 'Operation failed');
    }
  };

  const handleAddPump = handleMutation('addPump', 'Insulin pump added successfully!',
    (eqData) => addMedicalEquipment(patient.uhid, eqData));

  const handleAddTransmitter = handleMutation('addTransmitter', 'Transmitter added successfully!',
    (eqData) => addMedicalEquipment(patient.uhid, eqData));

  const handleEditPump = handleMutation('editPump', 'Insulin pump updated successfully!', async (eqData) => {
    const pumpId = equipment?.current?.id;
    if (!pumpId) return { success: false, message: 'Cannot update: equipment ID not found' };
    return updateMedicalEquipment(patient.uhid, pumpId, eqData);
  });

  const handleEditTransmitter = handleMutation('editTransmitter', 'Transmitter updated successfully!', async (eqData) => {
    const transmitterId = equipment?.transmitter?.id;
    if (!transmitterId) return { success: false, message: 'Cannot update: equipment ID not found' };
    return updateMedicalEquipment(patient.uhid, transmitterId, eqData);
  });

  const handleReplacePump = handleMutation('replacePump', 'Insulin pump replaced successfully!', async (eqData, reason) => {
    const pumpId = equipment?.current?.id;
    if (!pumpId) return { success: false, message: 'Cannot replace: equipment ID not found' };
    return replaceMedicalEquipment(patient.uhid, pumpId, { ...eqData, reason });
  });

  const handleReplaceTransmitter = handleMutation('replaceTransmitter', 'Transmitter replaced successfully!', async (eqData, reason) => {
    const transmitterId = equipment?.transmitter?.id;
    if (!transmitterId) return { success: false, message: 'Cannot replace: equipment ID not found' };
    return replaceMedicalEquipment(patient.uhid, transmitterId, { ...eqData, reason });
  });

  // ── Warranty badge ──────────────────────────────────────────────────────────
  const getWarrantyBadge = (warrantyEndDate) => {
    const status = getEquipmentWarrantyStatus(warrantyEndDate);
    if (!status) return null;
    const styles = {
      expired:         'bg-red-100 text-red-700 border-red-300',
      'expiring-soon': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      active:          'bg-green-100 text-green-700 border-green-300',
    };
    const icons = {
      expired:         <Circle className="w-3 h-3 fill-red-600 text-red-600" />,
      'expiring-soon': <AlertCircle className="w-3 h-3" />,
      active:          <CheckCircle className="w-3 h-3" />,
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${styles[status.status]}`}>
        {icons[status.status]} {status.message}
      </span>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Loading equipment data...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasPump && !hasTransmitter && (
        <Card>
          <div className="text-center py-12">
            <Battery className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-bold text-gray-800 mb-2">No Medical Equipment Registered</p>
            <p className="text-gray-600 mb-6">This patient does not have an insulin pump or transmitter on record.</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => openModal('addPump')}>
                <Zap className="w-4 h-4 mr-2" /> Add Insulin Pump
              </Button>
              <Button variant="secondary" onClick={() => openModal('addTransmitter')}>
                <Radio className="w-4 h-4 mr-2" /> Add Transmitter
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Insulin Pump card */}
      {!loading && hasPump && (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <DetailRow label="Model"         value={equipment.current.model || 'Not specified'} />
              <DetailRow label="Manufacturer"  value={equipment.current.manufacturer || 'Not specified'} />
              <DetailRow label="Serial Number" value={equipment.current.serialNo} />
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Type</p>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 mt-0.5">
                  {equipment.current.type === 'new'     && <><PlusCircle className="w-4 h-4" /> New Patient</>}
                  {equipment.current.type === 'upgrade' && <><TrendingUp className="w-4 h-4" /> Upgrade</>}
                  {equipment.current.type === 'replacement' && <><RefreshCw className="w-4 h-4" /> Replacement</>}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <DetailRow label="Start Date" value={formatDate(equipment.current.startDate)} />
                <p className="text-xs text-gray-500 mt-1">In use for {calculateDaysInUse(equipment.current.startDate)} days</p>
              </div>
              <DetailRow label="Warranty Period" value={`${formatDate(equipment.current.warrantyStartDate)} – ${formatDate(equipment.current.warrantyEndDate)}`} />
              <DetailRow label="Added By" value={`${equipment.current.addedBy || '—'} on ${formatDate(equipment.current.addedDate)}`} />
              {equipment.current.lastUpdatedBy && equipment.current.lastUpdatedBy !== equipment.current.addedBy && (
                <DetailRow label="Last Updated By" value={`${equipment.current.lastUpdatedBy} on ${formatDate(equipment.current.lastUpdatedDate)}`} />
              )}
            </div>
          </div>

          {/* CareLink */}
          <div className="space-y-3 mb-6">
            <CareLinkSection equipment={equipment.current} />
            <CareLinkPartnersSection
              partners={partners}
              onAdd={() => openModal('addPartner')}
              onEdit={(p) => { setEditingPartner(p); openModal('editPartner'); }}
              onRemove={handleRemovePartner}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => openModal('editPump')}>
              <Edit className="w-4 h-4 mr-2" /> Edit Details
            </Button>
            {canReplace && (
              <Button variant="outline" onClick={() => openModal('replacePump')}>
                <RefreshCw className="w-4 h-4 mr-2" /> Replace Pump
              </Button>
            )}
            <Button variant="outline" onClick={() => openModal('pumpHistory')}>
              <FileText className="w-4 h-4 mr-2" /> View History
            </Button>
          </div>
        </Card>
      )}

      {/* Add Pump button when only transmitter exists */}
      {!loading && !hasPump && hasTransmitter && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No insulin pump registered</p>
            <Button onClick={() => openModal('addPump')}>
              <Zap className="w-4 h-4 mr-2" /> Add Insulin Pump
            </Button>
          </div>
        </Card>
      )}

      {/* Transmitter card */}
      {!loading && hasTransmitter && (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <DetailRow label="Serial Number" value={equipment.transmitter.serialNo} />
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Type</p>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 mt-0.5">
                  {equipment.transmitter.type === 'new'     && <><PlusCircle className="w-4 h-4" /> New Patient</>}
                  {equipment.transmitter.type === 'upgrade' && <><TrendingUp className="w-4 h-4" /> Upgrade</>}
                  {equipment.transmitter.type === 'replacement' && <><RefreshCw className="w-4 h-4" /> Replacement</>}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <DetailRow label="Start Date" value={formatDate(equipment.transmitter.startDate)} />
                <p className="text-xs text-gray-500 mt-1">In use for {calculateDaysInUse(equipment.transmitter.startDate)} days</p>
              </div>
              <DetailRow label="Warranty Period" value={`${formatDate(equipment.transmitter.warrantyStartDate)} – ${formatDate(equipment.transmitter.warrantyEndDate)}`} />
              <DetailRow label="Added By" value={`${equipment.transmitter.addedBy || '—'} on ${formatDate(equipment.transmitter.addedDate)}`} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => openModal('editTransmitter')}>
              <Edit className="w-4 h-4 mr-2" /> Edit Details
            </Button>
            {canReplace && (
              <Button variant="outline" onClick={() => openModal('replaceTransmitter')}>
                <RefreshCw className="w-4 h-4 mr-2" /> Replace Transmitter
              </Button>
            )}
            <Button variant="outline" onClick={() => openModal('transmitterHistory')}>
              <FileText className="w-4 h-4 mr-2" /> View History
            </Button>
          </div>
        </Card>
      )}

      {/* Add Transmitter button when only pump exists */}
      {!loading && hasPump && !hasTransmitter && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No transmitter registered</p>
            <Button variant="secondary" onClick={() => openModal('addTransmitter')}>
              <Radio className="w-4 h-4 mr-2" /> Add Transmitter
            </Button>
          </div>
        </Card>
      )}

      {/* ── Modals ── */}
      <AddEquipmentModal isOpen={modals.addPump}            onClose={() => closeModal('addPump')}            onSave={handleAddPump}            deviceType="pump"        mode="add" />
      <AddEquipmentModal isOpen={modals.addTransmitter}     onClose={() => closeModal('addTransmitter')}     onSave={handleAddTransmitter}     deviceType="transmitter" mode="add" />
      <AddEquipmentModal isOpen={modals.editPump}           onClose={() => closeModal('editPump')}           onSave={handleEditPump}           deviceType="pump"        mode="edit"    existingData={equipment?.current} />
      <AddEquipmentModal isOpen={modals.editTransmitter}    onClose={() => closeModal('editTransmitter')}    onSave={handleEditTransmitter}    deviceType="transmitter" mode="edit"    existingData={equipment?.transmitter} />
      <AddEquipmentModal isOpen={modals.replacePump}        onClose={() => closeModal('replacePump')}        onSave={handleReplacePump}        deviceType="pump"        mode="replace" existingData={equipment?.current} />
      <AddEquipmentModal isOpen={modals.replaceTransmitter} onClose={() => closeModal('replaceTransmitter')} onSave={handleReplaceTransmitter} deviceType="transmitter" mode="replace" existingData={equipment?.transmitter} />
      <EquipmentHistoryModal isOpen={modals.pumpHistory}        onClose={() => closeModal('pumpHistory')}        history={history} auditLog={auditLog} deviceType="pump" />
      <EquipmentHistoryModal isOpen={modals.transmitterHistory} onClose={() => closeModal('transmitterHistory')} history={history} auditLog={auditLog} deviceType="transmitter" />
      <AddCareLinkPartnerModal isOpen={modals.addPartner}  onClose={() => closeModal('addPartner')}  onSave={handleAddPartner}  mode="add" />
      <AddCareLinkPartnerModal isOpen={modals.editPartner} onClose={() => { closeModal('editPartner'); setEditingPartner(null); }} onSave={handleEditPartner} mode="edit" existingData={editingPartner} />
    </div>
  );
};

export default MedicalEquipmentTab;
