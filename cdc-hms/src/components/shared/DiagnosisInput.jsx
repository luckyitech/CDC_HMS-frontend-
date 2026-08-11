import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader } from 'lucide-react';
import useCatalogSearch from '../../hooks/useCatalogSearch';

// Parses a diagnosis value from the DB — handles both new JSON arrays and old plain strings.
export const parseDiagnoses = (diagnosis) => {
  if (!diagnosis) return [];
  try {
    const parsed = JSON.parse(diagnosis);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON — fall through to plain-string handling */ }
  return [{ code: '', description: diagnosis }];
};

// Formats a diagnoses array for display as a single string (used in cards/print).
export const formatDiagnosisDisplay = (diagnosis) => {
  return parseDiagnoses(diagnosis)
    .map((d) => (d.code ? `${d.code} — ${d.description}` : d.description))
    .join('; ');
};

// ── Component ─────────────────────────────────────────────────────────────────
// Diagnosis autocomplete backed by the clinic's own catalog
// (Admin → Clinical Catalog), not an external API. Diagnoses not in the
// catalog can always be added as typed (Enter or the footer row).
const DiagnosisInput = ({ diagnoses = [], onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const containerRef = useRef(null);

  const { items, loading, active } = useCatalogSearch('diagnosis', query, { limit: 10 });

  // Close dropdown when clicking outside.
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addDiagnosis = (entry) => {
    const duplicate = diagnoses.some(
      (d) => d.description.toLowerCase() === entry.description.toLowerCase()
    );
    if (!duplicate) onChange([...diagnoses, entry]);
    setQuery('');
    setOpen(false);
  };

  // Catalog entries store the code in `detail`
  const handleSelect = (item) => addDiagnosis({ code: item.detail || '', description: item.name });

  // Add the diagnosis exactly as typed (not in the catalog) — stored
  // with an empty code, which the rest of the app already supports.
  const commitTyped = () => {
    const typed = query.trim();
    if (typed) addDiagnosis({ code: '', description: typed });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // never submit the surrounding form from this field
      commitTyped();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
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
                  onClick={() => onChange(diagnoses.filter((x) => (x.code || x.description) !== key))}
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
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Search diagnosis (e.g. diabetes, hypertension...)"
            className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          />
        </div>

        {open && active && (
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-start gap-3 border-b border-gray-100 last:border-0 transition-colors"
              >
                {item.detail && (
                  <span className="text-xs font-bold text-blue-600 font-mono mt-0.5 flex-shrink-0 w-16">
                    {item.detail}
                  </span>
                )}
                <span className="text-sm text-gray-800">{item.name}</span>
              </button>
            ))}
            {/* Free-text escape hatch — diagnosis not in the catalog */}
            <button
              type="button"
              onClick={commitTyped}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 bg-gray-50 border-t-2 border-gray-200 transition-colors"
            >
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Use "<span className="font-semibold text-gray-800">{query}</span>" as typed
                <span className="text-xs text-gray-400 ml-2">(or press Enter)</span>
              </p>
            </button>
          </div>
        )}
      </div>

      {diagnoses.length === 0 && (
        <p className="text-xs text-gray-400">Type at least 2 characters to search the clinic's diagnosis list, or type any diagnosis and press Enter to add it as written. Multiple diagnoses can be added.</p>
      )}
    </div>
  );
};

export default DiagnosisInput;
