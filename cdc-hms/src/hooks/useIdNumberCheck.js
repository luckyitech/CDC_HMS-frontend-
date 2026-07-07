import { useState, useEffect } from 'react';
import patientService from '../services/patientService';

// Debounced real-time check: does an ID number already exist in the system?
// status: null | 'checking' | 'clear' | 'duplicate'
// existing: null | { uhid, name }
const useIdNumberCheck = (idNumber) => {
  const [status, setStatus]     = useState(null);
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    if (!idNumber || !idNumber.trim()) {
      setStatus(null);
      setExisting(null);
      return;
    }

    setStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const res = await patientService.checkIdNumber(idNumber.trim());
        if (res?.data?.exists) {
          setStatus('duplicate');
          setExisting({ uhid: res.data.uhid, name: res.data.name });
        } else {
          setStatus('clear');
          setExisting(null);
        }
      } catch {
        setStatus(null);
        setExisting(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [idNumber]);

  return { status, existing };
};

export default useIdNumberCheck;
