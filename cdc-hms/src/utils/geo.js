// The device's own location, asked for once and never waited on for long.
// Shared by the HR tap page (check-in location) and sign-in (16 Oct 2026,
// Settings → Sign-in security). Never rejects.

/**
 * Ask the browser where it is.
 * Resolves { status: 'given', lat, lng, accuracy } | { status: 'declined' } |
 * { status: 'unavailable' } — declined when the person refuses the prompt,
 * unavailable when there is no answer in time or no location service.
 */
export const askLocation = (timeoutMs = 1500) => new Promise((resolve) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({ status: 'unavailable' });
  let done = false;
  const finish = (v) => { if (!done) { done = true; resolve(v); } };
  const t = setTimeout(() => finish({ status: 'unavailable' }), timeoutMs);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      clearTimeout(t);
      finish({ status: 'given', lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    },
    (err) => { clearTimeout(t); finish({ status: err?.code === 1 ? 'declined' : 'unavailable' }); },
    { maximumAge: 60000, timeout: timeoutMs, enableHighAccuracy: false },
  );
});

/** { lat, lng, accuracy } or null — the shape the tap page has always sent. */
export const geoOnce = async (timeoutMs = 1500) => {
  const r = await askLocation(timeoutMs);
  return r.status === 'given' ? { lat: r.lat, lng: r.lng, accuracy: r.accuracy } : null;
};
