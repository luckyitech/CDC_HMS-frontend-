// A short, human name for this device — shown on the restore banner ("saved
// on the clinic iPad") so a doctor who switches devices knows which copy won.
export const deviceLabel = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const touchMac = /Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
  if (/iPad/.test(ua) || touchMac) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'another device';
};
