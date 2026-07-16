import { TONES, SOLID_TONES } from '../../utils/statusStyles';

const SIZES = {
  xs: 'px-2.5 py-0.5 text-xs font-semibold',
  sm: 'px-3 py-1 text-xs font-semibold',
  md: 'px-4 py-2 text-sm font-bold',
};

const SHAPES = {
  pill: 'rounded-full',
  tag:  'rounded-md',
};

/**
 * One badge to replace every hand-rolled status/role/priority pill.
 *
 * Usage:
 *   import { LAB_STATUS_TONES } from '../../utils/statusStyles';
 *   <StatusBadge tone={LAB_STATUS_TONES[test.status]}>{test.status}</StatusBadge>
 *
 *   // solid emphasis (severity):
 *   <StatusBadge solid tone={SEVERITY_SOLID_TONES[alert.severity] || 'warning'}>
 *     {alert.severity}
 *   </StatusBadge>
 *
 *   // squared-off tag, no outline (user lists):
 *   <StatusBadge shape="tag" size="xs" bordered={false} tone={ROLE_TONES[user.role]}>
 *     {ROLE_LABEL[user.role]}
 *   </StatusBadge>
 *
 * @param {string}  tone      tone key from TONES — semantic (success | warning |
 *                            danger | info | neutral) or categorical (blue |
 *                            violet | teal | emerald | rose)
 * @param {boolean} solid     use the solid palette instead of the soft fill
 * @param {'xs'|'sm'|'md'} size   xs = compact cards, sm = tables/lists, md = detail emphasis
 * @param {'pill'|'tag'} shape   pill = fully rounded, tag = squared-off
 * @param {boolean} bordered  outline the badge (ignored when solid)
 * @param {string}  className extra classes for one-off tweaks
 */
const StatusBadge = ({
  children,
  tone,
  solid = false,
  size = 'sm',
  shape = 'pill',
  bordered = true,
  className = '',
}) => {
  const palette = solid ? SOLID_TONES : TONES;
  const toneClasses = palette[tone] || (solid ? SOLID_TONES.warning : TONES.neutral);
  const borderClass = !solid && bordered ? (size === 'md' ? 'border-2' : 'border') : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${SHAPES[shape]} ${SIZES[size]} ${borderClass} ${toneClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export default StatusBadge;
