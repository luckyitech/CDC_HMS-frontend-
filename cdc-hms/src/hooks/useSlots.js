import { useState, useEffect } from 'react';
import appointmentService from '../services/appointmentService';

const useSlots = (doctorId, date) => {
  const [slots, setSlots]         = useState([]);
  const [dayBlocked, setDayBlocked] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const applyResponse = (res) => {
    setSlots(res.data.slots || []);
    setDayBlocked(res.data.dayBlocked || false);
  };

  useEffect(() => {
    if (!doctorId || !date) { setSlots([]); setDayBlocked(false); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);

    appointmentService.getSlots(doctorId, date)
      .then(res => { if (!cancelled) applyResponse(res); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load slots'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [doctorId, date]);

  const refreshSlots = () => {
    if (!doctorId || !date) return;
    setLoading(true);
    setError(null);
    appointmentService.getSlots(doctorId, date)
      .then(res => applyResponse(res))
      .catch(err => setError(err.message || 'Failed to load slots'))
      .finally(() => setLoading(false));
  };

  return { slots, dayBlocked, loading, error, refreshSlots };
};

export default useSlots;
