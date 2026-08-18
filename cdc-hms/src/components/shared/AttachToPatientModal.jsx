import { useState, useEffect, useRef } from 'react';
import { UserPlus, Search, User, X, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import patientService from '../../services/patientService';

/**
 * Attach the current workspace images to a patient's ultrasound image safe.
 *
 * Mirrors the appointment BookingModal's patient picker: an inline, scrollable
 * results list (not an absolute dropdown, which clips inside a modal). Search by
 * name, UHID or clinic number — a barcode/QR scanner emulates a keyboard, so
 * scanning a patient card types the code straight in and finds them. When
 * `fixedPatient` is supplied (the patient file) the patient is pre-selected.
 */
const AttachToPatientModal = ({
  isOpen,
  onClose,
  fixedPatient = null,
  imageCount = 0,
  busy = false,
  onConfirm,
}) => {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  // Reset transient state whenever the modal opens/closes.
  useEffect(() => {
    if (!isOpen) { setSearch(''); setPatients([]); setSelected(null); }
  }, [isOpen]);

  useEffect(() => {
    if (!search.trim()) { setPatients([]); setSearching(false); return undefined; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patientService.getAll({ search, limit: 10 })
        .then((res) => setPatients(res.data.patients || res.data || []))
        .catch(() => setPatients([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const patient = fixedPatient || selected;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Attach images to a patient" size="lg">
      <p className="text-sm text-gray-600 mb-4">
        <span className="font-semibold text-gray-800">{imageCount}</span> image{imageCount !== 1 && 's'} in
        the workspace will be saved into the patient&apos;s ultrasound image safe.
      </p>

      {fixedPatient ? (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-primary rounded-lg mb-4">
          <User className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-primary text-sm">{fixedPatient.uhid}</p>
            <p className="font-semibold text-gray-800 text-sm">{fixedPatient.name}</p>
          </div>
        </div>
      ) : selected ? (
        <div className="flex items-center justify-between p-3 bg-blue-50 border-2 border-primary rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <div>
              <p className="font-bold text-primary text-sm">{selected.uhid}</p>
              <p className="font-semibold text-gray-800 text-sm">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.age ?? '—'} yrs · {selected.gender ?? '—'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="p-1.5 rounded-full hover:bg-blue-100 text-gray-500"
            title="Change patient"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Find patient</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, UHID or clinic number — or scan a barcode"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          {searching && <p className="text-xs text-gray-400 mt-1.5">Searching…</p>}
          {patients.length > 0 && (
            <ul className="mt-2 border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
              {patients.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { setSelected(p); setSearch(''); setPatients([]); }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition"
                  >
                    <p className="font-bold text-primary text-sm">{p.uhid}</p>
                    <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.age ?? '—'} yrs · {p.gender ?? '—'}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && search.trim() && patients.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No patients found for &quot;{search}&quot;.</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t mt-2">
        <Button variant="outline" onClick={onClose} disabled={busy} className="!px-4 !py-2 text-sm">
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(patient)}
          disabled={!patient || busy || imageCount === 0}
          className="!px-4 !py-2 text-sm"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {' '}Add to image safe
        </Button>
      </div>
    </Modal>
  );
};

export default AttachToPatientModal;
