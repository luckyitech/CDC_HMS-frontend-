import { useState, useEffect, useRef } from 'react';
import { Search, Loader, Pill } from 'lucide-react';

// ── Component ─────────────────────────────────────────────────────────────────
// Provides RxNorm-powered medication name autocomplete via the NIH NLM API.
// Props:
//   value       — current medication name string (controlled)
//   onChange    — (name) => void  — called when doctor types freely
//   onSelect    — (name, dosage) => void — called when doctor picks a suggestion
//   placeholder — optional input placeholder
const MedicationSearchInput = ({ value, onChange, onSelect, placeholder }) => {
  const [query,        setQuery]        = useState(value || '');
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef  = useRef(null);
  const containerRef = useRef(null);

  // Keep local query in sync when parent resets the field.
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close dropdown on outside click.
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search against NLM rxterms API (free, no key required).
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
          `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?ef=STRENGTHS_AND_FORMS&terms=${encodeURIComponent(query)}&maxList=8`
        );
        const data = await res.json();
        const names = data[1] || [];
        const forms = data[2]?.STRENGTHS_AND_FORMS || [];

        // Flatten into {name, dosage} pairs — one item per strength/form.
        // Strip anything in parentheses from the drug name (e.g. "Panadol (Oral Liquid)" → "Panadol").
        const items = [];
        names.forEach((rawName, i) => {
          const name = rawName.replace(/\s*\([^)]*\)/g, '').trim();
          const strengthList = forms[i] || [];
          if (strengthList.length > 0) {
            strengthList.slice(0, 4).forEach((form) => {
              items.push({ name, dosage: form });
            });
          } else {
            items.push({ name, dosage: '' });
          }
        });

        setResults(items);
        setShowDropdown(items.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  const handleType = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (val.length < 2) setShowDropdown(false);
  };

  const handleSelect = (item) => {
    setQuery(item.name);
    setShowDropdown(false);
    onSelect(item.name, item.dosage);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {loading && (
          <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        <input
          type="text"
          value={query}
          onChange={handleType}
          placeholder={placeholder || "Search medication (e.g. Metformin, Insulin...)"}
          className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-start gap-3 border-b border-gray-100 last:border-0 transition-colors"
            >
              <Pill className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                {item.dosage && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.dosage}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicationSearchInput;
