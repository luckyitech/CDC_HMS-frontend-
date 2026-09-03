import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, FileText, Ban, Loader2, Search, Download } from 'lucide-react';
import neuropathyService from '../../services/neuropathyService';
import { useUserContext } from '../../contexts/UserContext';
import { canAccessAdmin } from '../../utils/permissions';
import { notify } from '../../utils/notify';
import NeuropathyReport from './NeuropathyReport';
import { GRADE_CLASSES } from '../../constants/neuropathy';

// Neuropathy Studio — the studies list. One component, two homes (DRY, the
// UltrasoundTab pattern): `patient` set → that patient's studies inside their
// file (Diagnostics → Neuropathy); `patient` null → the Studio's recent
// worklist across patients.

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const Chip = ({ grade, children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${GRADE_CLASSES[grade] || GRADE_CLASSES.pending}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />{children}
  </span>
);

const worst = (a, b) => {
  const order = ['Normal', 'Mild', 'Moderate', 'Severe'];
  const ia = order.indexOf(a), ib = order.indexOf(b);
  if (ia < 0) return b; if (ib < 0) return a;
  return order[Math.max(ia, ib)];
};

const NeuropathyStudyList = ({ patient = null, refreshKey = 0 }) => {
  const { currentUser } = useUserContext();
  const canCancel = currentUser?.role === 'doctor' || canAccessAdmin(currentUser);

  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);      // full study for the report modal
  const [opening, setOpening] = useState(null);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const req = patient ? neuropathyService.getByPatient(patient.uhid) : neuropathyService.getRecent(100);
    req.then((res) => setStudies(res.data.data || res.data || []))
      .catch(() => setStudies([]))
      .finally(() => setLoading(false));
  }, [patient]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const openStudy = async (id) => {
    setOpening(id);
    try {
      const res = await neuropathyService.getById(id);
      setOpen(res.data.data || res.data);
    } catch { notify('error', 'Could not open the study.'); } finally { setOpening(null); }
  };

  const cancelStudy = async (s) => {
    // Soft-delete with attribution — never destroy.
    const reason = window.prompt(`Withdraw the ${fmtDay(s.studyDate)} study for ${s.patientName}? Enter a reason:`);
    if (reason === null) return;
    try {
      await neuropathyService.cancel(s.id, reason || undefined);
      notify('success', 'Study withdrawn.');
      load();
    } catch (err) { notify('error', err.response?.data?.message || 'Could not withdraw the study.'); }
  };

  const completed = studies.filter((s) => s.status !== 'Cancelled');

  // Client-side search (name / UHID) + inclusive date range over the loaded list.
  const filtered = useMemo(() => completed.filter((s) => {
    const d = s.studyDate ? String(s.studyDate).slice(0, 10) : '';
    if (fromDate && (!d || d < fromDate)) return false;
    if (toDate && (!d || d > toDate)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!`${s.patientName || ''} ${s.uhid || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [completed, fromDate, toDate, search]);

  const gradeCell = (s, k) => worst(s.summary?.right?.[k]?.grade, s.summary?.left?.[k]?.grade) || 'Not tested';
  const monoCell = (s) => {
    const r = s.summary?.right?.mono || {}, l = s.summary?.left?.mono || {};
    const lost = (r.insensate || 0) + (l.insensate || 0), tested = (r.tested || 0) + (l.tested || 0);
    return tested ? (lost ? `${lost}/${tested} insensate` : 'Intact') : 'Not tested';
  };
  // Export the CURRENTLY FILTERED rows as CSV (opens in Excel). BOM + CRLF, the
  // app's existing export convention.
  const exportCsv = () => {
    if (!filtered.length) { notify('error', 'No studies to export for the current filters.'); return; }
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Patient', 'UHID', 'Date', 'VPT', 'Hot', 'Cold', 'Monofilament', 'Status'];
    const rows = filtered.map((s) => [s.patientName || '', s.uhid || '', fmtDay(s.studyDate), gradeCell(s, 'vpt'), gradeCell(s, 'hot'), gradeCell(s, 'cold'), monoCell(s), s.status]);
    const csv = '\ufeff' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    const range = (fromDate || toDate) ? `_${fromDate || 'start'}-to-${toDate || 'end'}` : '';
    a.href = url; a.download = `neuropathy-studies${range}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-gray-800">
          {patient ? 'Neuropathy studies' : 'Recent neuropathy studies'}
          <span className="ml-2 text-xs font-semibold bg-blue-50 text-primary rounded-full px-2 py-0.5">{filtered.length}</span>
        </h3>
        <button type="button" onClick={load} className="ml-auto text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* search / date filter / export */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        {!patient && (
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or UHID" className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        )}
        <label className="text-xs text-gray-500 inline-flex items-center gap-1.5">From
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <label className="text-xs text-gray-500 inline-flex items-center gap-1.5">To
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </label>
        {(search || fromDate || toDate) && (
          <button type="button" onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1.5">Clear</button>
        )}
        <button type="button" onClick={exportCsv} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-blue-700">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {loading && studies.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">{(search || fromDate || toDate) ? 'No studies match the current filters.' : (patient ? 'No neuropathy studies on file for this patient yet.' : 'No studies yet — start one from the New exam tab.')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wider text-gray-400">
                {!patient && <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">Patient</th>}
                <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">Date</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">VPT</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">Hot</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">Cold</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">Monofilament</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">Status</th>
                <th className="px-4 py-2 border-b border-gray-200" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const r = s.summary?.right || {}, l = s.summary?.left || {};
                const g = (k) => worst(r[k]?.grade, l[k]?.grade);
                const monoLost = (r.mono?.insensate || 0) + (l.mono?.insensate || 0);
                const monoTested = (r.mono?.tested || 0) + (l.mono?.tested || 0);
                return (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => openStudy(s.id)}>
                    {!patient && (
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-gray-800">{s.patientName}</p>
                        <p className="text-xs font-mono text-gray-500">{s.uhid}</p>
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-mono text-gray-700">{fmtDay(s.studyDate)}</td>
                    <td className="px-4 py-2.5"><Chip grade={g('vpt')}>{g('vpt') || 'Not tested'}</Chip></td>
                    <td className="px-4 py-2.5"><Chip grade={g('hot')}>{g('hot') || 'Not tested'}</Chip></td>
                    <td className="px-4 py-2.5"><Chip grade={g('cold')}>{g('cold') || 'Not tested'}</Chip></td>
                    <td className="px-4 py-2.5">
                      {monoTested ? <Chip grade={monoLost ? 'Severe' : 'Normal'}>{monoLost ? `${monoLost}/${monoTested} insensate` : 'Intact'}</Chip> : <Chip>Not tested</Chip>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${s.status === 'Completed' ? 'bg-blue-50 text-primary' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => openStudy(s.id)} className="text-xs font-semibold text-primary hover:underline mr-3">
                        {opening === s.id ? 'opening…' : 'open'}
                      </button>
                      {canCancel && (
                        <button type="button" onClick={() => cancelStudy(s)} title="Withdraw study" className="text-gray-400 hover:text-red-600 align-middle">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && <NeuropathyReport study={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default NeuropathyStudyList;
