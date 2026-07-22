import { useState, useEffect, useRef } from 'react';
import { Search, Loader, Pill } from 'lucide-react';
import useCatalogSearch from '../../hooks/useCatalogSearch';

// ── Component ─────────────────────────────────────────────────────────────────
// Medication name autocomplete backed by the clinic's own catalog
// (Admin → Clinical Catalog), not an external API. Names not in the
// catalog can always be entered as typed (Enter or the footer row).
// Props:
//   value       — current medication name string (controlled)
//   onChange    — (name) => void  — called when doctor types freely
//   onSelect    — (name, dosage) => void — called when doctor picks a suggestion
//   placeholder — optional input placeholder
const MedicationSearchInput = ({ value, onChange, onSelect, placeholder }) => {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen]   = useState(false);
  const containerRef = useRef(null);

  // Keep local query in sync when the parent resets the field
  // (render-time reset — the React-recommended alternative to an effect).
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setQuery(value || '');
  }

  const { items, loading, active } = useCatalogSearch('medication', query);

  // Close dropdown on outside click.
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleType = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);
  };

  const handleSelect = (item) => {
    setQuery(item.name);
    setOpen(false);
    onSelect(item.name, item.detail || '');
  };

  // Commit the name exactly as typed (medication not in the catalog).
  // Keeps any dosage already entered, closes the dropdown.
  const commitTyped = (inputEl) => {
    const typed = query.trim();
    if (!typed) return;
    setOpen(false);
    onSelect(typed, '');
    // Move focus to the next field (Dosage) so the doctor keeps typing
    if (inputEl?.form) {
      const els = inputEl.form.elements;
      const idx = Array.prototype.indexOf.call(els, inputEl);
      els[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // never submit the form from this field
      commitTyped(e.target);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Search medication (e.g. Metformin, Insulin...)"}
          className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
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
              <Pill className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                {item.detail && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                )}
              </div>
            </button>
          ))}
          {/* Free-text escape hatch — medication not in the catalog */}
          <button
            type="button"
            onClick={() => commitTyped(containerRef.current?.querySelector('input'))}
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
  );
};

export default MedicationSearchInput;
