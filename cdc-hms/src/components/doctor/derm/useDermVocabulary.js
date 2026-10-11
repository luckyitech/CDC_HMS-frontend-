import { useEffect, useState } from 'react';
import dermService from '../../../services/dermService';

/**
 * The clinic's own words typed under "Other…" before — finding types (8 Oct)
 * and every examination field (9 Oct 2026) — so a word is typed once and
 * picked from then on. One fetch per page load; forgetDermVocabulary() after a
 * save that may have added a word.
 *
 *   const { findingTypes, terms } = useDermVocabulary();
 *   terms.pattern → [{ name: 'Sporotrichoid', uses: 2 }, …]
 */
const EMPTY = { findingTypes: [], terms: {} };
let cache = null;
let inflight = null;
const listeners = new Set();

export const forgetDermVocabulary = () => {
  cache = null;
  inflight = null;
  // Reload for anyone showing it now, so a new word appears straight away.
  if (listeners.size) load();
};

const load = () => {
  if (!inflight) {
    inflight = dermService.vocabulary()
      .then((res) => {
        const d = res?.data || res || {};
        cache = { findingTypes: d.findingTypes || [], terms: d.terms || {} };
        listeners.forEach((fn) => fn(cache));
        return cache;
      })
      .catch(() => { inflight = null; return EMPTY; });   // the forms still work without the list
  }
  return inflight;
};

const useDermVocabulary = () => {
  const [vocab, setVocab] = useState(() => cache || EMPTY);
  useEffect(() => {
    listeners.add(setVocab);
    if (cache) setVocab(cache); else load();
    return () => { listeners.delete(setVocab); };
  }, []);
  return vocab;
};

export default useDermVocabulary;
