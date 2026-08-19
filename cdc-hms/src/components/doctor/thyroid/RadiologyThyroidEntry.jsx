import { useState, useEffect, useRef } from 'react';
import { Search, User, ArrowLeft } from 'lucide-react';
import patientService from '../../../services/patientService';
import ThyroidUsList from './ThyroidUsList';

/**
 * Thyroid reporting entry for the Radiology Suite. No fixed patient here (the
 * suite is machine-worklist-level), so pick a patient first, then their reports
 * open in the same in-page workspace as the imaging report. DRY: reuses
 * patientService.getAll (same search the attach-to-patient picker uses).
 */
export default function RadiologyThyroidEntry({ seed = null, onSeedConsumed = null }) {
  const [patient, setPatient] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  // Arriving from the imaging worklist with a patient + images already chosen:
  // drop straight into that patient's reports (ThyroidUsList consumes the seed).
  useEffect(() => { if (seed?.patient) setPatient(seed.patient); }, [seed]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); setSearching(false); return undefined; }
    setSearching(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      patientService.getAll({ search, limit: 10 })
        .then((res) => setResults(res?.data?.patients || res?.data || []))   // api unwraps to body
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [search]);

  if (patient) {
    return (
      <div>
        <button onClick={() => { setPatient(null); if (onSeedConsumed) onSeedConsumed(); }} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md px-3 py-1.5">
          <ArrowLeft className="w-4 h-4" /> Change patient
        </button>
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <User className="w-5 h-5 text-primary shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">{patientName(patient) || '—'}</span>
            <span className="text-gray-500"> · {patient.uhid || '—'}</span>
            {(patient.dateOfBirth || patient.dob) && <span className="text-gray-500"> · DOB {fmtDate(patient.dateOfBirth || patient.dob)}</span>}
            {patient.age != null && <span className="text-gray-500"> · {patient.age} yrs</span>}
            {(patient.gender || patient.sex) && <span className="text-gray-500"> · {patient.gender || patient.sex}</span>}
          </div>
        </div>
        <ThyroidUsList patient={patient} seed={seed} onSeedConsumed={onSeedConsumed} />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <p className="text-sm text-gray-500 mb-3">Select the patient this thyroid ultrasound report is for.</p>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or UHID…"
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm" />
      </div>
      {searching && <div className="text-sm text-gray-400">Searching…</div>}
      <div className="space-y-1.5">
        {results.map((p) => (
          <button key={p.id} onClick={() => setPatient(p)} className="w-full flex items-center gap-3 text-left bg-white border border-gray-200 rounded-lg px-3 py-2.5 hover:border-primary">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm"><span className="font-medium">{patientName(p)}</span> <span className="text-gray-400">· {p.uhid}</span></span>
          </button>
        ))}
        {!searching && search.trim() && results.length === 0 && <div className="text-sm text-gray-400">No patients found.</div>}
      </div>
    </div>
  );
}

// The patient list endpoint returns `name` (not firstName/lastName); fall back
// to either shape so both search results and the resolved seed patient display.
function patientName(p) {
  if (!p) return '';
  return p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
}
function fmtDate(d) {
  if (!d) return '';
  const s = String(d).slice(0, 10);
  return s;
}
