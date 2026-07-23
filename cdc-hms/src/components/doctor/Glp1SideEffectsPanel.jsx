import { AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Glp1SideEffectsPanel — the weekly summary grid that sits ABOVE the entry table.
 *
 * Rows are symptoms that have actually been reported; a symptom graded 'none' at
 * every visit never earns a row. Columns are the weeks that have a review.
 * The server does the aggregation — this only renders it.
 */

const SEVERITY_STYLES = {
  none:     'bg-gray-100 text-gray-500',
  mild:     'bg-amber-100 text-amber-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe:   'bg-red-100 text-red-800',
};

// A symptom that was reported and has since resolved reads as "settled", not
// "none" — a blank cell means never asked, which is a different clinical claim.
const SettledBadge = () => (
  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">settled</span>
);

const SeverityBadge = ({ severity }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.none}`}>
    {severity}
  </span>
);

const Glp1SideEffectsPanel = ({ summary }) => {
  if (!summary) return null;

  const { weeks = [], rows = [], alerts = [], headline, reviewCount = 0 } = summary;

  // Nothing recorded yet, or nothing ever reported — one line is enough.
  if (!rows.length) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span className="text-sm text-green-800">{headline}</span>
      </div>
    );
  }

  const doseAlerts = alerts.filter(a => a.doseChanged);

  return (
    <div className="space-y-3">
      {/* Headline — the one line a doctor reads before the grid */}
      <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-amber-900">{headline}</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Across {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="font-medium py-2 pr-3 min-w-[140px]">Symptom</th>
              {weeks.map(week => (
                <th key={week} className="font-medium py-2 px-3 whitespace-nowrap">Wk {week}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.symptomId ?? row.symptom} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-3 text-gray-800">{row.symptom}</td>
                {weeks.map(week => {
                  const cell = row.cells?.[week];
                  if (!cell) {
                    return <td key={week} className="py-2 px-3 text-gray-300">—</td>;
                  }
                  // 'none' after the symptom was reported means it settled
                  const settled = cell.severity === 'none' && row.firstReportedWeek !== null
                    && week > row.firstReportedWeek;
                  return (
                    <td key={week} className="py-2 px-3" title={cell.note || undefined}>
                      {settled ? <SettledBadge /> : <SeverityBadge severity={cell.severity} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Worsening across a dose step — the pattern the grid exists to surface */}
      {doseAlerts.length > 0 && (
        <ul className="space-y-1">
          {doseAlerts.map((alert, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>{alert.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Glp1SideEffectsPanel;
