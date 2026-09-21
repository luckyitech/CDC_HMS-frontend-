import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox, RefreshCw, Search, FileText, Eye, Zap, ChevronUp, Loader2,
  CheckCircle2, Trash2, AlertTriangle, Settings,
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import StatusBadge from '../../components/shared/StatusBadge';
import Spinner from '../../components/shared/Spinner';
import LabInboxPairForm from '../../components/shared/LabInboxPairForm';
import LabInboxPreviewModal from '../../components/shared/LabInboxPreviewModal';
import labInboxService from '../../services/labInboxService';
import { useUserContext } from '../../contexts/UserContext';
import NoAccess from '../../components/shared/NoAccess';
import { PERMISSIONS, hasPermission, isWithdrawn } from '../../utils/permissions';
import { notify } from '../../utils/notify';
import { formatDateTime } from '../../utils/dateUtils';
import {
  confidenceTone, confidenceLabel, suggestionWhy, patientDisplayName, patientInitials, timeAgo,
} from '../../utils/labInboxHelpers';

const TABS = [
  { id: 'New',       label: 'New' },
  { id: 'Matched',   label: 'Paired' },
  { id: 'Discarded', label: 'Discarded' },
  { id: 'All',       label: 'All' },
];

/**
 * Lab Inbox — external lab-report PDFs pulled from the clinic mailbox, each
 * waiting to be paired to a patient. Two ways to pair: "Preview & pair"
 * (the PDF beside the form) or "Quick pair" inline on the row. Pairing files
 * the report into the patient's Diagnostics as "Lab Report - External",
 * status "Pending Review", and notifies the doctor — the same path a manual
 * upload takes. A wrong pull is Discarded, never deleted.
 */
const LabInbox = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const isAdmin = currentUser?.role === 'admin';
  // Mirrors routes/labInbox.js: staff + lab (+ admin) by role, a doctor/nurse when
  // granted; either capability can be withdrawn by an admin. The server enforces
  // this too — the checks here only decide what to draw.
  const byRole = ['staff', 'lab', 'admin'].includes(currentUser?.role);
  const canView = !isWithdrawn(currentUser, PERMISSIONS.LABINBOX_VIEW)
    && (byRole || hasPermission(currentUser, PERMISSIONS.LABINBOX_VIEW));
  const canWrite = canView && !isWithdrawn(currentUser, PERMISSIONS.LABINBOX_WRITE)
    && (byRole || hasPermission(currentUser, PERMISSIONS.LABINBOX_WRITE));

  const [tab, setTab] = useState('New');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);     // { count, lastPoll, isConfigured, autoImport }
  const [query, setQuery] = useState('');
  const [polling, setPolling] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  const load = useCallback(async (which = tab) => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([labInboxService.list(which), labInboxService.count()]);
      setItems(list.data.items || []);
      setStatus(count.data);
    } catch (err) {
      notify('error', err?.message || 'Could not load the lab inbox.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(tab); }, [tab, load]);

  // Live: when the poller imports something, refresh the New list.
  useEffect(() => {
    const SSE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse`;
    const source = new EventSource(SSE_URL);
    const onNew = () => { if (tab === 'New' || tab === 'All') load(tab); else labInboxService.count().then((r) => setStatus(r.data)).catch(() => {}); };
    source.addEventListener('lab_inbox_new', onNew);
    return () => { source.removeEventListener('lab_inbox_new', onNew); source.close(); };
  }, [tab, load]);

  const pullNow = async () => {
    setPolling(true);
    try {
      const res = await labInboxService.poll();
      const s = res.data || {};
      if (s.skipped) notify('info', s.reason || 'A check is already running.');
      else notify(s.imported ? 'success' : 'info', `Checked ${s.checked ?? 0} email${s.checked === 1 ? '' : 's'} — ${s.imported ?? 0} new report${s.imported === 1 ? '' : 's'}${s.errors?.length ? `, ${s.errors.length} error(s)` : ''}.`);
      await load(tab);
      announce();
    } catch (err) {
      notify('error', err?.message || 'Mailbox check failed.');
    } finally {
      setPolling(false);
    }
  };

  // Tell the layout the count changed (the sidebar badge listens) — pairing or
  // discarding here doesn't cause a route change or an SSE import event.
  const announce = () => window.dispatchEvent(new CustomEvent('lab-inbox:changed'));
  const afterChange = () => { setExpandedId(null); setPreviewItem(null); load(tab); announce(); };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => [
      it.fileName, it.senderName, it.senderEmail, it.subject,
      patientDisplayName(it.suggestion?.patient), it.suggestion?.patient?.uhid,
      patientDisplayName(it.matched?.patient), it.matched?.patient?.uhid,
    ].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [items, query]);

  if (!canView) {
    return <NoAccess message="You don't have access to the Lab Inbox. Ask an administrator if you need it." />;
  }

  const newCount = status?.count ?? 0;
  const lastPoll = status?.lastPoll;
  const notConfigured = status && status.isConfigured === false;

  // Sync-status pill + Pull now — shown in the PageHeader on the standalone page,
  // and in a slim right-aligned row when embedded as the Inbox "Lab reports" tab
  // (where the Inbox already provides the heading, so the title would be redundant).
  const syncControls = (
    <div className="flex items-center gap-2">
      <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
        lastPoll?.ok === false ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${lastPoll ? (lastPoll.ok ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-300'}`} />
        {lastPoll ? (lastPoll.ok ? `Synced ${timeAgo(lastPoll.at)}` : `Last check failed ${timeAgo(lastPoll.at)}`) : 'Never synced'}
      </span>
      {canWrite && (
      <button
        type="button"
        onClick={pullNow}
        disabled={polling || notConfigured}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {polling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Pull now
      </button>
      )}
    </div>
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex justify-end">{syncControls}</div>
      ) : (
        <PageHeader
          title="Lab Inbox"
          subtitle="External lab reports pulled from the clinic mailbox. Pair each one to a patient — it files into their Diagnostics as Pending Review."
          actions={syncControls}
        />
      )}

      {notConfigured && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">The lab mailbox is not set up yet.</p>
            <p>An administrator needs to connect the clinic mailbox and add the labs' email addresses under System Settings → Lab Inbox.</p>
          </div>
          {isAdmin && (
            <button type="button" onClick={() => navigate('/admin/settings')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline flex-shrink-0">
              <Settings className="w-4 h-4" /> Open settings
            </button>
          )}
        </div>
      )}
      {lastPoll?.ok === false && !notConfigured && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p><span className="font-semibold">Last mailbox check failed:</span> {lastPoll.error || 'unknown error'}. Try “Pull now”; if it keeps failing, ask an administrator to check the connection in System Settings.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SwitcherTabs
          tabs={TABS.map((t) => (t.id === 'New' ? { ...t, count: newCount } : t))}
          active={tab}
          onChange={(id) => { setExpandedId(null); setTab(id); }}
        />
        <div className="relative sm:ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sender, subject, file, patient…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <Inbox className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700">
            {query ? 'Nothing matches your search.' : tab === 'New' ? 'No new reports — the inbox is clear.' : `No ${tab === 'Matched' ? 'paired' : tab.toLowerCase()} reports.`}
          </p>
          {tab === 'New' && !query && !notConfigured && (
            <p className="text-sm text-gray-500 mt-1">New reports appear here automatically{status?.autoImport ? ` (checked every ${status.pollIntervalMin} min)` : ''}, or press “Pull now”.</p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {visible.map((it) => {
            const sug = it.suggestion || {};
            const sp = sug.patient;
            const expanded = expandedId === it.id;
            const isNew = it.status === 'New';
            return (
              <div key={it.id}>
                <div className="flex flex-col md:flex-row md:items-center gap-4 px-4 py-3.5 hover:bg-slate-50/60">
                  {/* file */}
                  <div className="flex items-start gap-3 md:w-[38%] min-w-0">
                    <div className="w-10 h-12 rounded-md bg-red-50 border border-red-100 flex flex-col items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-500" />
                      <span className="text-[8px] font-extrabold text-red-500 tracking-wider">PDF</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate" title={it.fileName}>{it.fileName}</p>
                      <p className="text-xs text-gray-500 truncate">{it.senderName || it.senderEmail}{it.senderName && it.senderEmail ? ` · ${it.senderEmail}` : ''}</p>
                      {it.subject && <p className="text-xs text-gray-600 truncate" title={it.subject}>{it.subject}</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(it.emailDate || it.receivedAt)}{it.fileSize ? ` · ${it.fileSize}` : ''}</p>
                    </div>
                  </div>

                  {/* suggestion / outcome */}
                  <div className="flex-1 min-w-0">
                    {isNew ? (
                      <>
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1">Suggested patient</p>
                        {sp ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{patientInitials(sp)}</span>
                            <span className="font-semibold text-gray-800 text-sm">{patientDisplayName(sp)}</span>
                            <span className="text-xs text-gray-500">{sp.uhid}</span>
                            <StatusBadge tone={confidenceTone(sug.confidence)} size="xs">
                              {sug.score != null ? `${sug.score}% · ` : ''}{confidenceLabel(sug.confidence)}
                            </StatusBadge>
                          </div>
                        ) : (
                          <StatusBadge tone="neutral" size="xs">No confident match — search & pair</StatusBadge>
                        )}
                        <p className="text-[11px] text-gray-500 mt-1 truncate" title={suggestionWhy(sug)}>{suggestionWhy(sug)}</p>
                      </>
                    ) : it.status === 'Matched' ? (
                      <div className="text-sm">
                        <p className="flex items-center gap-1.5 text-green-700 font-semibold"><CheckCircle2 className="w-4 h-4" /> Paired to {patientDisplayName(it.matched?.patient)} <span className="text-gray-500 font-normal">{it.matched?.patient?.uhid}</span></p>
                        <p className="text-xs text-gray-500 mt-0.5">by {it.matched?.by || '—'} · {formatDateTime(it.matched?.at)}</p>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="flex items-center gap-1.5 text-gray-600 font-semibold"><Trash2 className="w-4 h-4" /> Discarded{it.discarded?.reason ? ` — ${it.discarded.reason}` : ''}</p>
                        <p className="text-xs text-gray-500 mt-0.5">by {it.discarded?.by || '—'} · {formatDateTime(it.discarded?.at)}</p>
                      </div>
                    )}
                  </div>

                  {/* actions */}
                  <div className="flex md:flex-col gap-2 md:w-40 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(it)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-blue-700"
                    >
                      <Eye className="w-3.5 h-3.5" /> {isNew && canWrite ? 'Preview & pair' : 'View'}
                    </button>
                    {isNew && canWrite && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : it.id)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold ${expanded ? 'border-primary text-primary bg-blue-50' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                      >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />} {expanded ? 'Close' : 'Quick pair'}
                      </button>
                    )}
                    {it.status === 'Matched' && it.matched?.patient?.uhid && (
                      <button
                        type="button"
                        onClick={() => navigate(`/${(currentUser?.role || 'staff').toLowerCase()}/patient-profile/${it.matched.patient.uhid}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Open patient
                      </button>
                    )}
                  </div>
                </div>

                {expanded && isNew && (
                  <div className="bg-slate-50 border-t border-gray-100 px-4 py-4 md:pl-[4.25rem]">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-3">Quick pair — no preview</p>
                    <LabInboxPairForm key={it.id} item={it} compact onPaired={afterChange} onDiscarded={afterChange} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'New' && !loading && visible.length > 0 && (
        <p className="text-xs text-gray-500 mt-3">
          <span className="font-semibold text-green-700">Strong</span> = name plus phone, ID or date of birth found in the report. <span className="font-semibold text-amber-700">Confirm</span> = name only, or more than one patient shares it. Nothing is filed until you pair it; a wrong pull is discarded, never deleted.
        </p>
      )}

      <LabInboxPreviewModal
        isOpen={!!previewItem}
        item={previewItem}
        readOnly={!canWrite}
        onClose={() => setPreviewItem(null)}
        onPaired={afterChange}
        onDiscarded={afterChange}
      />
    </div>
  );
};

export default LabInbox;
