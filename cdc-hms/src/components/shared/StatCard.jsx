/**
 * StatCard — the compact metric tile used across dashboards and list pages.
 *
 * One source of truth for the gradient stat tiles so height/spacing stay
 * consistent everywhere. Deliberately short: a single row (label + value on the
 * left, icon on the right) instead of the old tall stacked block.
 *
 * Usage:
 *   <StatCard title="Today's Patients" value={24} icon={Users} gradient="from-blue-500 to-blue-600" />
 *   <StatCard title="Pending" value={4} icon={Clock} gradient="from-yellow-500 to-yellow-600" sub="Awaiting processing" />
 *
 * @param {string}          title    metric label
 * @param {string|number}   value    the number/stat shown large
 * @param {React.Component}  icon     optional lucide icon component
 * @param {string}          gradient tailwind gradient stops, e.g. "from-blue-500 to-blue-600"
 * @param {React.ReactNode} sub      optional small caption under the value
 * @param {Function}        onClick  optional — makes the card a clickable button
 * @param {string}          className extra classes for one-off tweaks
 */
const StatCard = ({
  title,
  value,
  icon: Icon,
  gradient = "from-blue-500 to-blue-600",
  sub,
  onClick,
  className = "",
}) => (
  <div
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    className={`bg-gradient-to-br ${gradient} rounded-xl shadow-md px-4 py-3 text-white flex items-center justify-between gap-3 ${
      onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""
    } ${className}`}
  >
    <div className="min-w-0">
      <p className="text-xs font-semibold opacity-90 leading-tight truncate">{title}</p>
      <p className="text-2xl font-bold leading-none mt-1">{value}</p>
      {sub && <p className="text-[11px] opacity-80 mt-1 truncate">{sub}</p>}
    </div>
    {Icon && <Icon className="w-7 h-7 flex-shrink-0 opacity-90" />}
  </div>
);

export default StatCard;
