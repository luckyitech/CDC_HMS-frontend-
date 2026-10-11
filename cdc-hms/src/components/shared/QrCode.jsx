import { useMemo } from 'react';
import { qrMatrix } from '../../utils/qrcode';

/**
 * QrCode — draws a QR code for `value` as crisp SVG (utils/qrcode, no package).
 * Props: value, size (px, default 180), label (accessible name)
 */
const QrCode = ({ value, size = 180, label = 'QR code' }) => {
  const m = useMemo(() => (value ? qrMatrix(value) : null), [value]);
  if (!m) return null;
  const n = m.length + 8;   // 4-module quiet zone each side
  let d = '';
  m.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + 4} ${y + 4}h1v1h-1z`; }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#ffffff" />
      <path d={d} fill="#111827" />
    </svg>
  );
};

export default QrCode;
