/**
 * PageHeader — the standard top-of-page title block.
 *
 * One source of truth for every page's heading so titles stay compact and
 * consistent and never drift per page. Replaces the old hand-rolled
 * `<h2 className="text-2xl lg:text-3xl font-bold text-gray-800">…</h2>` pattern.
 *
 * Usage:
 *   <PageHeader title="Doctor Dashboard" subtitle={`Welcome back, ${name}`} />
 *   <PageHeader title="Pending Tests" actions={<Button>Back</Button>} />
 *
 * @param {string}          title     required page title
 * @param {React.ReactNode} subtitle  optional supporting line under the title
 * @param {React.ReactNode} actions   optional right-aligned controls (buttons, filters)
 * @param {string}          className extra classes for one-off spacing tweaks
 */
const PageHeader = ({ title, subtitle, actions, className = "" }) => (
  <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4 ${className}`}>
    <div className="min-w-0">
      <h2 className="text-lg lg:text-xl font-bold text-gray-800 leading-tight">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
    </div>
    {actions && (
      <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
    )}
  </div>
);

export default PageHeader;
