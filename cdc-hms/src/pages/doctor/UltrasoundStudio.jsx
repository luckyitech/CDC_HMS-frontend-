import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Waves, ArrowLeft, FileDown, Printer, Save, RefreshCw, Film, Search,
  ChevronLeft, ChevronRight, X, Undo2, User, Calendar, Cake, LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import ultrasoundService from '../../services/ultrasoundService';
import documentService from '../../services/documentService';
import exportUltrasoundPdf from '../../utils/ultrasoundPdf';

/**
 * HMIS V4 — Ultrasound Studio.
 *
 * Worklist of every study received from the ultrasound machine (sortable by
 * name / scan date / date of birth), opening into a report editor: pick a
 * layout (2×3 / 3×2, portrait / landscape), adjust brightness & zoom, remove
 * and rearrange images, then print, download as PDF, or save the PDF into the
 * patient's HMS record.
 */

const SORTS = [
  { id: 'received', label: 'Newest first' },
  { id: 'name', label: 'Name' },
  { id: 'date', label: 'Scan date' },
  { id: 'dob', label: 'Date of birth' },
];

const LAYOUTS = [
  { id: 'l32', label: '3 × 2 landscape', orientation: 'landscape', cols: 3, rows: 2 },
  { id: 'l23', label: '2 × 3 landscape', orientation: 'landscape', cols: 2, rows: 3 },
  { id: 'p23', label: '2 × 3 portrait', orientation: 'portrait', cols: 2, rows: 3 },
  { id: 'p32', label: '3 × 2 portrait', orientation: 'portrait', cols: 3, rows: 2 },
];

const UltrasoundStudio = () => {
  const [studies, setStudies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('received');
  const [search, setSearch] = useState('');
  const [blobUrls, setBlobUrls] = useState({});
  const blobUrlsRef = useRef({});

  // Editor state
  const [study, setStudy] = useState(null);        // opened study
  const [items, setItems] = useState([]);          // ordered images w/ adjustments
  const [removed, setRemoved] = useState([]);      // removed from layout (re-addable)
  const [layoutId, setLayoutId] = useState('l32');
  const [busy, setBusy] = useState(null);          // 'pdf' | 'print' | 'save'
  const [saveUhid, setSaveUhid] = useState('');

  const layout = LAYOUTS.find((l) => l.id === layoutId);

  // ---------------- data ----------------
  const loadBlobs = useCallback(async (images) => {
    const urls = { ...blobUrlsRef.current };
    await Promise.all(
      images.map(async (img) => {
        if (urls[img.id]) return;
        try {
          const filename = ultrasoundService.filenameFromUrl(img.fileUrl);
          const res = await ultrasoundService.getFile(filename);
          urls[img.id] = URL.createObjectURL(res.data ?? res);
        } catch {
          // placeholder shown
        }
      }),
    );
    blobUrlsRef.current = urls;
    setBlobUrls({ ...urls });
  }, []);

  const loadStudies = useCallback(async () => {
    try {
      const res = await ultrasoundService.getStudies();
      const list = res.data || [];
      setStudies(list);
      // Thumbnails: first image of each study
      await loadBlobs(list.map((s) => s.images[0]).filter(Boolean));
    } catch (err) {
      console.error('Error loading studies:', err);
    }
  }, [loadBlobs]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      await loadStudies();
      if (isMounted) setIsLoading(false);
    })();
    return () => { isMounted = false; };
  }, [loadStudies]);

  // Live updates
  useEffect(() => {
    const SSE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse`;
    const source = new EventSource(SSE_URL);
    source.addEventListener('ultrasound_received', () => loadStudies());
    source.onerror = () => {};
    return () => source.close();
  }, [loadStudies]);

  // Revoke object URLs on unmount
  useEffect(() => () => {
    Object.values(blobUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = {};
  }, []);

  // ---------------- worklist sorting / search ----------------
  const visibleStudies = useMemo(() => {
    let list = [...studies];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        (s.patientName || '').toLowerCase().includes(q) ||
        (s.hmsPatientName || '').toLowerCase().includes(q) ||
        (s.dicomPatientId || '').toLowerCase().includes(q) ||
        (s.uhid || '').toLowerCase().includes(q));
    }
    const cmp = {
      received: (a, b) => new Date(b.lastReceivedAt) - new Date(a.lastReceivedAt),
      name: (a, b) => (a.patientName || a.hmsPatientName || 'zzz').localeCompare(b.patientName || b.hmsPatientName || 'zzz'),
      date: (a, b) => (b.studyDate || '').localeCompare(a.studyDate || ''),
      dob: (a, b) => (a.patientBirthDate || '9999').localeCompare(b.patientBirthDate || '9999'),
    }[sortBy];
    return list.sort(cmp);
  }, [studies, sortBy, search]);

  // ---------------- editor ----------------
  const openStudy = async (s) => {
    setStudy(s);
    setItems(s.images.map((img) => ({ ...img, brightness: 1, scale: 1 })));
    setRemoved([]);
    setSaveUhid(s.uhid || '');
    await loadBlobs(s.images);
  };

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const moveItem = (index, dir) => {
    setItems((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) setRemoved((r) => [...r, it]);
      return prev.filter((x) => x.id !== id);
    });
  };

  const restoreItem = (id) => {
    setRemoved((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) setItems((list) => [...list, it]);
      return prev.filter((x) => x.id !== id);
    });
  };

  const pdfMeta = () => ({
    patientName: study.hmsPatientName || study.patientName || null,
    uhid: study.uhid || study.dicomPatientId,
    studyDate: study.studyDate,
  });

  const pdfImages = () =>
    items.filter((it) => blobUrls[it.id]).map((it) => ({
      src: blobUrls[it.id],
      brightness: it.brightness,
      scale: it.scale,
    }));

  const guardImages = () => {
    if (!items.length) {
      toast.error('The layout is empty — add at least one image.');
      return false;
    }
    return true;
  };

  const handleDownload = async () => {
    if (!guardImages()) return;
    setBusy('pdf');
    try {
      const { filename } = await exportUltrasoundPdf(pdfImages(), pdfMeta(), {
        orientation: layout.orientation, cols: layout.cols, rows: layout.rows,
      });
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed.');
    } finally { setBusy(null); }
  };

  const handlePrint = async () => {
    if (!guardImages()) return;
    setBusy('print');
    try {
      const { blob } = await exportUltrasoundPdf(pdfImages(), pdfMeta(), {
        orientation: layout.orientation, cols: layout.cols, rows: layout.rows, output: 'blob',
      });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) toast.error('Popup blocked — allow popups for this site to print.');
      // Give the tab time to load before revoking
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      toast.error('Could not open the print view.');
    } finally { setBusy(null); }
  };

  const handleSaveToHms = async () => {
    if (!guardImages()) return;
    const uhid = saveUhid.trim();
    if (!uhid) {
      toast.error('Enter the patient\'s UHID to save into their record.');
      return;
    }
    setBusy('save');
    try {
      // If the study isn't linked yet, link its images to this patient first
      if (!study.uhid || study.uhid !== uhid) {
        await Promise.all(items.map((it) => ultrasoundService.assign(it.id, uhid)));
      }
      const { filename, blob } = await exportUltrasoundPdf(pdfImages(), { ...pdfMeta(), uhid }, {
        orientation: layout.orientation, cols: layout.cols, rows: layout.rows, output: 'blob',
      });
      const formData = new FormData();
      formData.append('file', new File([blob], filename, { type: 'application/pdf' }));
      formData.append('uhid', uhid);
      formData.append('documentCategory', 'Imaging Report');
      formData.append('testType', 'Ultrasound');
      formData.append('notes', `Ultrasound report (${items.length} image${items.length > 1 ? 's' : ''})${study.studyDescription ? ` — ${study.studyDescription}` : ''}`);
      const res = await documentService.upload(formData);
      if (res.success === false) throw new Error(res.message);
      toast.success(`Report saved to ${uhid}'s Medical Documents.`);
      await loadStudies();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save the report to the record.');
    } finally { setBusy(null); }
  };

  // ---------------- render ----------------
  if (isLoading) {
    return (
      <div>
        <PageHeader title="Ultrasound Studio" subtitle="Studies received from the ultrasound machine" />
        <Card><div className="flex items-center justify-center py-16"><Spinner /></div></Card>
      </div>
    );
  }

  // ============ EDITOR VIEW ============
  if (study) {
    return (
      <div>
        <PageHeader
          title="Ultrasound Studio — Report"
          subtitle={`${study.patientName || study.hmsPatientName || 'Unknown patient'} · ID ${study.dicomPatientId} · ${study.studyDate || 'no date'}`}
        />
        <Card>
          {/* Editor toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <button
              onClick={() => setStudy(null)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back to studies
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-gray-500" />
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayoutId(l.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                    layoutId === l.id
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handlePrint} disabled={!!busy} variant="outline" className="!px-4 !py-2 text-sm">
                {busy === 'print' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Print
              </Button>
              <Button onClick={handleDownload} disabled={!!busy} variant="outline" className="!px-4 !py-2 text-sm">
                {busy === 'pdf' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} PDF
              </Button>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="UHID…"
                  value={saveUhid}
                  onChange={(e) => setSaveUhid(e.target.value)}
                  className="w-28 px-2.5 py-2 border-2 border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"
                />
                <Button onClick={handleSaveToHms} disabled={!!busy} className="!px-4 !py-2 text-sm">
                  {busy === 'save' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save to record
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            {items.length} image{items.length !== 1 && 's'} in the report ·{' '}
            {Math.ceil(items.length / (layout.cols * layout.rows)) || 0} page{Math.ceil(items.length / (layout.cols * layout.rows)) !== 1 && 's'} ·
            order shown is print order (◀ ▶ to rearrange)
          </p>

          {/* Layout grid — columns mirror the printed page */}
          <div className={`grid gap-4 ${layout.cols === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {items.map((it, index) => (
              <div key={it.id} className="rounded-lg border-2 border-blue-200 overflow-hidden bg-white">
                <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
                  {blobUrls[it.id] ? (
                    <img
                      src={blobUrls[it.id]}
                      alt={it.fileName}
                      className="max-w-full max-h-full object-contain transition-transform"
                      style={{ filter: `brightness(${it.brightness})`, transform: `scale(${it.scale})` }}
                    />
                  ) : (
                    <span className="text-gray-500 text-xs">Loading…</span>
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  {it.isMultiframe && (
                    <span className="absolute top-1.5 right-8 bg-purple-600 text-white text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                      <Film className="w-3 h-3" /> CLIP
                    </span>
                  )}
                  <button
                    onClick={() => removeItem(it.id)}
                    title="Remove from layout"
                    className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-2.5 space-y-1.5">
                  <MiniSlider
                    label="Brightness" min={0.2} max={2} step={0.05}
                    value={it.brightness} display={`${it.brightness.toFixed(2)}×`}
                    onChange={(v) => updateItem(it.id, { brightness: v })}
                  />
                  <MiniSlider
                    label="Zoom / size" min={0.25} max={1.5} step={0.05}
                    value={it.scale} display={`${Math.round(it.scale * 100)}%`}
                    onChange={(v) => updateItem(it.id, { scale: v })}
                  />
                  <div className="flex justify-between items-center pt-0.5">
                    <button
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Move earlier"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-gray-400">{it.studyDescription || it.fileName}</span>
                    <button
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Move later"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <p className="text-center text-gray-500 py-10">All images removed — restore some below.</p>
          )}

          {/* Removed images — restorable */}
          {removed.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-semibold text-gray-600 mb-2">Removed from layout</p>
              <div className="flex flex-wrap gap-2">
                {removed.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => restoreItem(it.id)}
                    title="Restore to layout"
                    className="relative w-24 aspect-[4/3] bg-black rounded overflow-hidden border-2 border-gray-300 hover:border-blue-500 group"
                  >
                    {blobUrls[it.id] && (
                      <img src={blobUrls[it.id]} alt="" className="w-full h-full object-contain opacity-60 group-hover:opacity-100" />
                    )}
                    <Undo2 className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ============ WORKLIST VIEW ============
  return (
    <div>
      <PageHeader
        title="Ultrasound Studio"
        subtitle="Every study received from the ultrasound machine — open one to build and save a report"
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by</span>
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                  sortBy === s.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {visibleStudies.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Waves className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold">No studies yet</p>
            <p className="text-sm mt-1">Scans sent from the ultrasound machine will appear here in real time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleStudies.map((s) => (
              <button
                key={s.key}
                onClick={() => openStudy(s)}
                className="text-left rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-md overflow-hidden transition-all bg-white"
              >
                <div className="flex">
                  <div className="w-32 bg-black aspect-[4/3] flex-shrink-0 flex items-center justify-center">
                    {s.images[0] && blobUrls[s.images[0].id] ? (
                      <img src={blobUrls[s.images[0].id]} alt="" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Waves className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div className="p-3 min-w-0">
                    <p className="font-bold text-gray-800 truncate flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {s.patientName || s.hmsPatientName || 'Unknown patient'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      Scan: {s.studyDate || '—'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <Cake className="w-3.5 h-3.5 flex-shrink-0" />
                      DOB: {s.patientBirthDate || '—'}
                    </p>
                    <p className="text-xs mt-1.5">
                      <span className="font-mono text-gray-600">{s.dicomPatientId}</span>
                      {' · '}{s.images.length} image{s.images.length !== 1 && 's'}
                      {s.uhid
                        ? <span className="ml-1.5 text-green-700 font-semibold">✓ {s.uhid}</span>
                        : <span className="ml-1.5 text-amber-600 font-semibold">unlinked</span>}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const MiniSlider = ({ label, min, max, step, value, display, onChange }) => (
  <div>
    <div className="flex justify-between items-center">
      <span className="text-[11px] font-semibold text-gray-600">{label}</span>
      <span className="text-[11px] text-gray-500 font-mono">{display}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-blue-600"
    />
  </div>
);

export default UltrasoundStudio;
