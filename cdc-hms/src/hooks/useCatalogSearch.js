import { useState, useEffect } from 'react';
import useDebounce from './useDebounce';
import catalogService from '../services/catalogService';

// External (NIH) sources used while the clinic's own lists are being
// entered — the admin picks the source per catalog in Clinical Catalog.
// Results are normalized to the catalog item shape {id, name, detail}
// so the inputs never know (or care) where suggestions came from.
const EXTERNAL_SOURCES = {
  medication: {
    url: (q, limit) =>
      `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?ef=STRENGTHS_AND_FORMS&terms=${encodeURIComponent(q)}&maxList=${limit}`,
    parse: (data) => {
      const names = data[1] || [];
      const forms = data[2]?.STRENGTHS_AND_FORMS || [];
      const items = [];
      names.forEach((rawName, i) => {
        // Strip parentheses from the drug name, e.g. "Panadol (Oral Liquid)" → "Panadol"
        const name = rawName.replace(/\s*\([^)]*\)/g, '').trim();
        const strengths = forms[i] || [];
        if (strengths.length > 0) {
          strengths.slice(0, 4).forEach((form, j) => items.push({ id: `ext-${i}-${j}`, name, detail: form }));
        } else {
          items.push({ id: `ext-${i}`, name, detail: null });
        }
      });
      return items;
    },
  },
  diagnosis: {
    url: (q, limit) =>
      `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(q)}&maxList=${limit}`,
    parse: (data) => (data[3] || []).map(([code, description], i) => ({ id: `ext-${i}`, name: description, detail: code })),
  },
};

const searchExternal = async (type, query, limit) => {
  const cfg = EXTERNAL_SOURCES[type];
  const res = await fetch(cfg.url(query, limit));
  return cfg.parse(await res.json());
};

// Debounced search for the autocomplete inputs, backed by whichever source
// the admin selected (clinic catalog or external API).
// Returns { items, loading, active } — active means the query is long
// enough to search, loading is derived (no state juggling).
const useCatalogSearch = (type, query, { limit = 8, minLength = 2 } = {}) => {
  const debounced = useDebounce(query, 300).trim();
  // Keyed by query so stale responses are never shown
  const [result, setResult] = useState({ key: '', items: [] });
  const [source, setSource] = useState(null);

  useEffect(() => {
    let cancelled = false;
    catalogService.getSources().then((sources) => {
      if (!cancelled) setSource(sources[type] || 'catalog');
    });
    return () => { cancelled = true; };
  }, [type]);

  useEffect(() => {
    if (!source || debounced.length < minLength) return;
    let cancelled = false;
    const request = source === 'external'
      ? searchExternal(type, debounced, limit)
      : catalogService.search(type, debounced, limit).then((res) => (res.success ? res.data.items : []));
    request
      .then((items) => { if (!cancelled) setResult({ key: debounced, items }); })
      .catch(() => { if (!cancelled) setResult({ key: debounced, items: [] }); });
    return () => { cancelled = true; };
  }, [type, debounced, limit, minLength, source]);

  const active = query.trim().length >= minLength;
  const upToDate = result.key === debounced && debounced.length >= minLength;

  return {
    items: active && upToDate ? result.items : [],
    loading: active && !upToDate,
    active,
  };
};

export default useCatalogSearch;
