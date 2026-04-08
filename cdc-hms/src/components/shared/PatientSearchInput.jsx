import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import patientService from '../../services/patientService';

/**
 * Reusable search-as-you-type patient selector.
 *
 * Props:
 *  - onSelect(patient)  — called when a patient is chosen from results
 *  - placeholder        — input placeholder text
 *  - selectedPatient    — currently selected patient (to show name in input)
 *  - onClear()          — called when the user clears the selection
 */
const PatientSearchInput = ({
  onSelect,
  placeholder = 'Search by name or UHID...',
  selectedPatient = null,
  onClear,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const search = useCallback(async (term) => {
    if (!term.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const response = await patientService.getAll({ search: term, limit: 10 });
      if (response.success) {
        const patients = response.data.patients || response.data || [];
        setResults(patients);
        setOpen(true);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (patient) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(patient);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    if (onClear) onClear();
  };

  return (
    <div ref={containerRef} className="relative">
      {selectedPatient ? (
        /* Show selected patient pill */
        <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-primary rounded-lg">
          <div className="flex-1">
            <p className="font-bold text-primary text-sm">{selectedPatient.uhid}</p>
            <p className="font-semibold text-gray-800 text-sm">{selectedPatient.name}</p>
            <p className="text-xs text-gray-500">{selectedPatient.age} yrs · {selectedPatient.gender}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-blue-100 rounded-full transition"
            title="Clear selection"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => query && results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelect(patient)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-primary text-sm">{patient.uhid}</p>
                  <p className="font-semibold text-gray-800 text-sm">{patient.name}</p>
                  <p className="text-xs text-gray-500">{patient.age} yrs · {patient.gender}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  patient.riskLevel === 'High'
                    ? 'bg-red-100 text-red-700'
                    : patient.riskLevel === 'Medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {patient.riskLevel}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500">
          No patients found for "{query}"
        </div>
      )}
    </div>
  );
};

export default PatientSearchInput;
