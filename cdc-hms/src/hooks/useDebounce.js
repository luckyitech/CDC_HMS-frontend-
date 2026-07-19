import { useState, useEffect } from 'react';

// Returns `value` only after it has stopped changing for `delay` ms.
// Used to keep large filtered lists from re-rendering on every keystroke.
const useDebounce = (value, delay = 250) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
