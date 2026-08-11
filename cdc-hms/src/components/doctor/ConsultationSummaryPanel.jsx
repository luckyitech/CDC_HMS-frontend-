import { useState } from 'react';
import {
  Activity, Calendar, FlaskConical, LineChart as LineChartIcon, Pill,
  ChevronDown, ExternalLink, FileText, Pencil, ClipboardList, Plus, Check, RotateCcw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import VitalsGrid from '../shared/VitalsGrid';
import useCatalogSearch from '../../hooks/useCatalogSearch';

/**
 * ConsultationSummaryPanel — sticky right-hand summary for the consultation screen.
 *
 * Presentational: all data + actions come in via props (see ConsultationSummaryContainer).
 *
 * Behaviour:
 * - Vitals card is independent: open by default, toggles freely, never auto-closed.
 * - The other cards act as an accordion: all closed by default, opening one closes the rest.
 * - Vitals renders the shared VitalsGrid → ALL recorded vitals, each card clickable
 *   to its trend-history modal (same as everywhere else), plus an Edit action.
 */

const METRICS = [
  { key: 'bloodSugar', label: 'Blood sugar', color: '#2563eb' },
  { key: 'hba1c',      label: 'HbA1c',       color: '#16a34a' },
  { key: 'bp',         label: 'BP (sys)',    color: '#d97706' },
  { key: 'weight',     label: 'Weight',      color: '#7c3aed' },
];

const fmtShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};
const fmtDay = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Collapsible card shell (controlled) ──────────────────────────────────────
const CollapsibleCard = ({ icon, title, open, onToggle, headerAction, children }) => {
  const Icon = icon;
  // No overflow-hidden: dropdowns (e.g. the diagnosis autocomplete) must
  // be able to extend past the card — DRY §4c spirit.
  return (
  <div className="bg-white border border-gray-200 rounded-2xl">
    <div className="flex items-center">
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-2 px-4 py-3 text-left font-bold text-[13.5px] text-gray-700 hover:bg-blue-50 transition-colors rounded-t-2xl"
      >
        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="flex-1">{title}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {headerAction}
    </div>
    {open && <div className="px-4 pb-4">{children}</div>}
  </div>
  );
};

const ConsultationSummaryPanel = ({
  patient = null,
  vitals = null,
  onEditVitals = null,
  diagnoses = [],
  onAddDiagnosis = null,
  onResolveDiagnosis = () => {},
  onReactivateDiagnosis = () => {},
  visits = [],
  onOpenVisit = () => {},
  labDocs = [],
  onOpenPdf = () => {},
  chartData = [],
  selectedMetrics = ['bloodSugar', 'hba1c'],
  onToggleMetric = () => {},
  medications = [],
  onOpenMeds = () => {},
}) => {
  // Vitals is independent (open by default); the rest are a single-open accordion.
  const [vitalsOpen, setVitalsOpen] = useState(true);
  const [openCard, setOpenCard] = useState(null);
  const toggleCard = (id) => setOpenCard((prev) => (prev === id ? null : id));

  const [labTab, setLabTab] = useState('Laboratory');
  const shownDocs = labDocs.filter((d) => (d.category || 'Laboratory') === labTab);

  // Diagnoses card state — catalog-backed autocomplete, same behaviour as
  // DiagnosisInput in the treatment-plan section (select from clinic catalog,
  // or Enter to add exactly as typed).
  const [dxInput, setDxInput] = useState('');
  const [dxAdding, setDxAdding] = useState(false);
  const [dxError, setDxError] = useState(null);
  const { items: dxItems, loading: dxLoading } = useCatalogSearch('diagnosis', dxInput, { limit: 8 });
  const activeDx = diagnoses.filter((d) => d.status === 'active');
  const resolvedDx = diagnoses.filter((d) => d.status === 'resolved');

  const submitDiagnosis = async ({ diagnosis, code }) => {
    const text = String(diagnosis || '').trim();
    if (!text || !onAddDiagnosis) return;
    setDxError(null);
    try {
      await onAddDiagnosis({ diagnosis: text, code: code || '' });
      setDxInput('');
      setDxAdding(false);
    } catch (e) {
      // api.js interceptor rejects with a plain { message, status } object
      const status = e?.status ?? e?.response?.status;
      const msg = e?.message && e.message !== 'An error occurred' ? e.message : null;
      setDxError(
        msg ? `${msg}${status ? ` (${status})` : ''}`
          : status === 404 ? 'Endpoint not found (404) — the V2 backend isn\'t running (use run-V2-backend.sh).'
          : status ? `Server error (${status}) — has \`npm run migrate\` been run on the V2 backend?`
          : 'No response from server — is the backend running on :3000?'
      );
    }
  };

  return (
    <div className="flex flex-col gap-2.5">

      {/* Vitals — independent, open by default. Full shared grid: all vitals,
          click-through trend modals, Edit action for corrections/additions. */}
      <CollapsibleCard
        icon={Activity}
        title="Vitals"
        open={vitalsOpen}
        onToggle={() => setVitalsOpen((o) => !o)}
        headerAction={onEditVitals && (
          <button
            onClick={onEditVitals}
            title="Edit / add vitals"
            className="mr-3 p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      >
        {vitals ? (
          <div className="space-y-2">
            {vitals.recordedAt && (
              <p className="text-[10px] text-gray-400">
                Recorded: {new Date(vitals.recordedAt).toLocaleString()}
              </p>
            )}
            {vitals.chiefComplaint && (
              <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                <p className="text-[10px] font-semibold text-gray-600">Reason for Visit</p>
                <p className="text-xs text-gray-800">{vitals.chiefComplaint}</p>
              </div>
            )}
            <VitalsGrid vitals={vitals} patient={patient} variant="dense" gridClass="grid-cols-2 gap-1.5" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">No vitals recorded today.</p>
            {onEditVitals && (
              <button
                onClick={onEditVitals}
                className="text-[11px] font-semibold text-primary border border-primary rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors flex-shrink-0"
              >
                Record vitals
              </button>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* Diagnoses — active list + retired (resolved) below in green.
          Clinical record: "remove" retires with date + attribution, never deletes. */}
      <CollapsibleCard
        icon={ClipboardList}
        title="Diagnoses"
        open={openCard === 'diagnoses'}
        onToggle={() => toggleCard('diagnoses')}
        headerAction={onAddDiagnosis && (
          <button
            onClick={() => { setOpenCard('diagnoses'); setDxAdding(true); }}
            title="Add diagnosis"
            className="mr-3 p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      >
        {dxAdding && (
          <div className="mb-2 relative">
            <div className="flex gap-1.5">
              <input
                autoFocus
                type="text"
                value={dxInput}
                onChange={(e) => setDxInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); submitDiagnosis({ diagnosis: dxInput, code: '' }); }
                  if (e.key === 'Escape') setDxAdding(false);
                }}
                placeholder="Search catalog or type…"
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => submitDiagnosis({ diagnosis: dxInput, code: '' })}
                className="px-2.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-90"
              >
                Add
              </button>
            </div>

            {/* Catalog suggestions — same source as the treatment-plan DiagnosisInput */}
            {dxInput.trim() && (dxItems.length > 0 || dxLoading) && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {dxLoading && <p className="px-3 py-2 text-[11px] text-gray-400">Searching…</p>}
                {dxItems.map((item) => (
                  <button
                    key={item.id ?? item.name}
                    onClick={() => submitDiagnosis({ diagnosis: item.name, code: item.detail || '' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-semibold text-gray-800">{item.name}</span>
                    {item.detail && <span className="text-gray-400 ml-1.5">{item.detail}</span>}
                  </button>
                ))}
              </div>
            )}
            {dxError && <p className="text-[11px] text-red-600 mt-1">{dxError}</p>}
          </div>
        )}

        {activeDx.length === 0 && resolvedDx.length === 0 && !dxAdding ? (
          <p className="text-xs text-gray-400">No diagnoses recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {activeDx.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">
                    {d.code && <span className="text-blue-500 font-mono text-[11px] mr-1">{d.code}</span>}
                    {d.diagnosis}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {fmtDay(d.diagnosedAt)}{d.addedBy ? ` · ${d.addedBy}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => onResolveDiagnosis(d.id)}
                  title="Mark resolved (retires — kept in record)"
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {resolvedDx.length > 0 && (
              <>
                <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Resolved</p>
                {resolvedDx.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-gray-400 line-through truncate">
                        {d.code && <span className="font-mono text-[11px] mr-1">{d.code}</span>}
                        {d.diagnosis}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Diagnosed {fmtDay(d.diagnosedAt)} · Resolved {fmtDay(d.resolvedAt)}
                        {d.resolvedBy ? ` · ${d.resolvedBy}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => onReactivateDiagnosis(d.id)}
                      title="Restore as active"
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* Visit History */}
      <CollapsibleCard icon={Calendar} title="Visit History" open={openCard === 'visits'} onToggle={() => toggleCard('visits')}>
        {visits.length === 0 ? (
          <p className="text-xs text-gray-400">No previous visits.</p>
        ) : (
          <div className="space-y-1.5">
            {visits.map((v) => (
              <button
                key={v.id ?? v.date}
                onClick={() => onOpenVisit(v)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-lg text-[13px] hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                <span className="min-w-0 text-left">
                  <span className="block font-semibold text-gray-700">{fmtDay(v.date)}</span>
                  {v.doctors && (
                    <span className="block text-[11px] text-gray-400 truncate">👨‍⚕️ {v.doctors}</span>
                  )}
                </span>
                {v.count != null && <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">{v.count} records</span>}
                <ExternalLink className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Labs */}
      <CollapsibleCard icon={FlaskConical} title="Labs" open={openCard === 'labs'} onToggle={() => toggleCard('labs')}>
        <div className="inline-flex gap-1 bg-gray-100 p-1 rounded-lg mb-2">
          {['Laboratory', 'Imaging'].map((t) => (
            <button
              key={t}
              onClick={() => setLabTab(t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                labTab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {shownDocs.length === 0 ? (
          <p className="text-xs text-gray-400">No {labTab.toLowerCase()} uploads.</p>
        ) : (
          <div className="space-y-1.5">
            {shownDocs.map((d) => (
              <button
                key={d.id}
                onClick={() => onOpenPdf(d)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-lg text-[12.5px] hover:bg-blue-50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="truncate text-gray-700">{d.name}</span>
                <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">{fmtShort(d.date)}</span>
              </button>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Charts */}
      <CollapsibleCard icon={LineChartIcon} title="Charts" open={openCard === 'charts'} onToggle={() => toggleCard('charts')}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {METRICS.map((m) => {
            const on = selectedMetrics.includes(m.key);
            return (
              <button
                key={m.key}
                onClick={() => onToggleMetric(m.key)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  on ? 'text-white border-transparent' : 'text-gray-500 border-gray-300 hover:border-gray-400'
                }`}
                style={on ? { backgroundColor: m.color } : undefined}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        {chartData.length === 0 ? (
          <p className="text-xs text-gray-400">No chartable data yet.</p>
        ) : (
          <div className="h-40 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={fmtShort} minTickGap={20} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={28} />
                <Tooltip labelFormatter={fmtDay} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                {METRICS.filter((m) => selectedMetrics.includes(m.key)).map((m) => (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    name={m.label}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CollapsibleCard>

      {/* Current Medications */}
      <CollapsibleCard icon={Pill} title="Current Medications" open={openCard === 'meds'} onToggle={() => toggleCard('meds')}>
        {medications.length === 0 ? (
          <p className="text-xs text-gray-400">No current medications.</p>
        ) : (
          <div>
            {medications.map((m) => (
              <div key={m.id ?? m.name} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{m.name}</p>
                  {(m.dose || m.route || m.since) && (
                    <p className="text-[11px] text-gray-400">
                      {[m.dose, m.route, m.since && `since ${fmtShort(m.since)}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onOpenMeds} className="mt-2 text-[11.5px] font-semibold text-primary hover:underline">
          View full prescription history →
        </button>
      </CollapsibleCard>
    </div>
  );
};

export default ConsultationSummaryPanel;
