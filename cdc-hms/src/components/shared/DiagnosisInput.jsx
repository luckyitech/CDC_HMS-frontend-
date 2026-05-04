import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader } from 'lucide-react';

// Parses a diagnosis value from the DB — handles both new JSON arrays and old plain strings.
export const parseDiagnoses = (diagnosis) => {
  if (!diagnosis) return [];
  try {
    const parsed = JSON.parse(diagnosis);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ code: '', description: diagnosis }];
};

// Formats a diagnoses array for display as a single string (used in cards/print).
export const formatDiagnosisDisplay = (diagnosis) => {
  return parseDiagnoses(diagnosis)
    .map((d) => (d.code ? `${d.code} — ${d.description}` : d.description))
    .join('; ');
};

// ── Component ─────────────────────────────────────────────────────────────────
const DiagnosisInput = ({ diagnoses = [], onChange }) => {
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef  = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside.
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced ICD-10 search via NIH Clinical Tables API (free, no key required).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(query)}&maxList=10`
        );
        const data = await res.json();
        // data[3] is an array of [code, description] pairs.
        const items = (data[3] || []).map(([code, description]) => ({ code, description }));
        setResults(items);
        setShowDropdown(items.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  const handleSelect = (item) => {
    if (diagnoses.some((d) => d.code === item.code)) return;
    onChange([...diagnoses, item]);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const handleRemove = (identifier) => {
    onChange(diagnoses.filter((d) => (d.code || d.description) !== identifier));
  };

  return (
    <div className="space-y-3">

      {/* Selected diagnosis tags */}
      {diagnoses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {diagnoses.map((d) => {
            const key = d.code || d.description;
            return (
              <span
                key={key}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800"
              >
                {d.code && (
                  <span className="text-xs font-bold text-blue-500 font-mono">{d.code}</span>
                )}
                {d.code && <span className="text-blue-300 text-xs">—</span>}
                <span className="font-semibold">{d.description}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(key)}
                  className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input + dropdown */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {loading && (
            <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ICD-10 diagnosis (e.g. diabetes, hypertension...)"
            className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          />
        </div>

        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-start gap-3 border-b border-gray-100 last:border-0 transition-colors"
              >
                <span className="text-xs font-bold text-blue-600 font-mono mt-0.5 flex-shrink-0 w-16">
                  {item.code}
                </span>
                <span className="text-sm text-gray-800">{item.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {diagnoses.length === 0 && (
        <p className="text-xs text-gray-400">Type at least 2 characters to search. Multiple diagnoses can be added.</p>
      )}
    </div>
  );
};

export default DiagnosisInput;
