import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import {
  Waves, Film, RefreshCw, Inbox, ChevronDown, ChevronRight, ChevronUp,
  ArrowDown, ArrowLeft, X, Undo2, FileDown, FileText, UserPlus, LayoutGrid, Trash2,
  Calendar, Clock, Archive, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from './Card';
import Button from './Button';
import Spinner from './Spinner';
import UltrasoundPreview from './UltrasoundPreview';
import AccordionPanel from './AccordionPanel';
import ReasonModal from './ReasonModal';
import AttachToPatientModal from './AttachToPatientModal';
import PdfPreviewModal from './PdfPreviewModal';
import { useUserContext } from '../../contexts/UserContext';
import { canAccessAdmin } from '../../utils/permissions';
import ultrasoundService from '../../services/ultrasoundService';
import documentService from '../../services/documentService';
import exportUltrasoundPdf from '../../utils/ultrasoundPdf';

/**
 * HMIS V4 — Ultrasound tab (patient chart). Approved design:
 *
 *  Zone 1 — Machine inbox TABLE (Name · DOB · Examination date · Images),
 *           sortable, rows persist until EXPLICITLY removed by the user.
 *  Zone 2 — Report workspace: selected images move here; layout picker,
 *           brightness / zoom / remove / arrange; Print · PDF · Save to record.
 *  Zone 3 — Images already attached to this patient (feed the workspace).
 */

const LAYOUTS = [
  { id: 'l32', label: '3 × 2 landscape', orientation: 'landscape', cols: 3, rows: 2 },
  { id: 'l23', label: '2 × 3 landscape', orientation: 'landscape', cols: 2, rows: 3 },
  { id: 'p23', label: '2 × 3 portrait', orientation: 'portrait', cols: 2, rows: 3 },
  { id: 'p32', label: '3 × 2 portrait', orientation: 'portrait', cols: 3, rows: 2 },
];

const DEFAULT_ADJ = { brightness: 1, scale: 1, offsetX: 0, offsetY: 0 };

const clampOff = (v) => Math.min(0.5, Math.max(-0.5, v));

// PDF page geometry (must mirror utils/ultrasoundPdf.js) — used so each
// workspace box shows the EXACT shape of its printed cell.
const cellRatioFor = (layout) => {
  const pageW = layout.orientation === 'landscape' ? 297 : 210;
  const pageH = layout.orientation === 'landscape' ? 210 : 297;
  const MARGIN = 12; const HEADER = 20; const GAP = 4;
  const cellW = (pageW - 2 * MARGIN - (layout.cols - 1) * GAP) / layout.cols;
  const cellH = (pageH - 2 * MARGIN - HEADER - (layout.rows - 1) * GAP) / layout.rows;
  return cellW / cellH;
};

// `patient` is optional. When set (patient file → Diagnostics → Radiology tab)
// the component scopes to that patient: the "image safe" (Zone 3) shows and the
// save UHID defaults to them. When null (Radiology Suite portal) it's the
// standalone worklist: inbox table + workspace, save UHID typed by the user.
const UltrasoundTab = ({ patient = null, source = 'inbox' }) => {
  // source: 'inbox' = every received study (Radiology Suite / patient tab);
  //         'unassigned' = only studies whose machine ID matched no patient.
  const unassignedOnly = source === 'unassigned';
  const { currentUser } = useUserContext();
  const isAdmin = canAccessAdmin(currentUser);

  // ---- data ----
  const [attached, setAttached] = useState([]);
  const [reports, setReports] = useState([]); // imaging-report PDFs filed to this patient
  const [inboxImages, setInboxImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blobUrls, setBlobUrls] = useState({});
  const blobUrlsRef = useRef({});

  // ---- inbox table state ----
  const [rowSelected, setRowSelected] = useState(new Set()); // image ids
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortCol, setSortCol] = useState('received');
  const [sortDir, setSortDir] = useState('desc');

  // ---- workspace state ----
  const [wsItems, setWsItems] = useState([]);       // ordered, with adjustments
  const [view, setView] = useState('list');         // 'list' worklist | 'workspace' — the workspace opens as its own screen
  const [wsRemoved, setWsRemoved] = useState([]);
  const [layoutId, setLayoutId] = useState('l32');
  const [applyAll, setApplyAll] = useState(false);
  const [attachedPatient, setAttachedPatient] = useState(patient); // report target (set by Attach to patient)
  const [attachOpen, setAttachOpen] = useState(false);
  const [savePending, setSavePending] = useState(false); // Save clicked in the preview before a patient was chosen
  const [pdf, setPdf] = useState(null); // { url, filename, blob } while the preview modal is open
  const [busy, setBusy] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [openSessions, setOpenSessions] = useState(() => new Set());
  const [archiveTarget, setArchiveTarget] = useState(null); // image pending admin archive
  const addMenuRef = useRef(null);

  const layout = LAYOUTS.find((l) => l.id === layoutId);
  const cellRatio = cellRatioFor(layout);
  // Each image always carries its own adjustments. "Apply to all" is a MODE that
  // writes an edit into every image at once (see updateWsItem); it never overlays
  // a separate global value, so turning it off keeps whatever was applied and you
  // can then fine-tune images one at a time.
  const getAdj = (it) => ({ brightness: it.brightness, scale: it.scale, offsetX: it.offsetX || 0, offsetY: it.offsetY || 0 });
  const dragRef = useRef(null);

  // ================= data loading =================
  const loadBlobs = useCallback(async (list) => {
    // Fetch only images we don't already have, into a local `fresh` map, then
    // MERGE into blobUrlsRef at write time. loadAttached() and loadInbox() call
    // this concurrently; snapshotting the ref before the awaits and overwriting
    // it after would let whichever finished last clobber the other's URLs (the
    // "Image unavailable" bug on the inbox grid). Merging keeps both sets.
    const fresh = {};
    await Promise.all(
      list.map(async (img) => {
        if (blobUrlsRef.current[img.id] || fresh[img.id]) return;
        try {
          const filename = ultrasoundService.filenameFromUrl(img.fileUrl);
          const res = await ultrasoundService.getFile(filename);
          fresh[img.id] = URL.createObjectURL(res.data ?? res);
        } catch {
          // placeholder shown
        }
      }),
    );
    if (!Object.keys(fresh).length) return;
    blobUrlsRef.current = { ...blobUrlsRef.current, ...fresh };
    setBlobUrls({ ...blobUrlsRef.current });
  }, []);

  const loadAttached = useCallback(async () => {
    if (!patient?.uhid) { setAttached([]); return; }
    try {
      const res = await ultrasoundService.getByPatient(patient.uhid);
      const list = res.data || [];
      setAttached(list);
      await loadBlobs(list);
    } catch (err) {
      console.error('Error loading attached ultrasound images:', err);
    }
  }, [patient?.uhid, loadBlobs]);

  // Imaging-report PDFs filed to this patient (shown in the Radiology tab as
  // well as in Medical Documents).
  const loadReports = useCallback(async () => {
    if (!patient?.uhid) { setReports([]); return; }
    try {
      const res = await documentService.getByPatient(patient.uhid, { category: 'Imaging Report' });
      const list = res.data?.documents || res.data || [];
      // Only the composed imaging-report PDFs (filed with this category) — not
      // other documents that merely share the Ultrasound test type.
      setReports(list.filter((d) => d.documentCategory === 'Imaging Report'));
    } catch (err) {
      console.error('Error loading radiology reports:', err);
    }
  }, [patient?.uhid]);

  const loadInbox = useCallback(async () => {
    // The inbox/worklist only exists in the Radiology Suite — the patient file
    // shows the image safe only, so there's nothing to fetch there.
    if (patient) { setInboxImages([]); return; }
    try {
      const res = unassignedOnly
        ? await ultrasoundService.getUnassigned()
        : await ultrasoundService.getInbox();
      const list = res.data || [];
      setInboxImages(list);
      await loadBlobs(list);
    } catch (err) {
      console.error('Error loading ultrasound list:', err);
    }
  }, [loadBlobs, unassignedOnly, patient]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      await Promise.all([loadAttached(), loadInbox(), loadReports()]);
      if (isMounted) setIsLoading(false);
    })();
    return () => { isMounted = false; };
  }, [loadAttached, loadInbox, loadReports]);

  useEffect(() => {
    const SSE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse`;
    const source = new EventSource(SSE_URL);
    source.addEventListener('ultrasound_received', async () => {
      await Promise.all([loadInbox(), loadAttached()]);
    });
    source.onerror = () => {};
    return () => source.close();
  }, [loadInbox, loadAttached]);

  useEffect(() => () => {
    Object.values(blobUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = {};
  }, []);

  // Close the "add to workspace" menu on outside click
  useEffect(() => {
    if (!addMenuOpen) return undefined;
    const onDown = (e) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [addMenuOpen]);

  // ================= inbox grouping / sorting =================
  const inboxStudies = useMemo(() => {
    const map = new Map();
    for (const img of inboxImages) {
      const key = img.studyInstanceUid || `${img.dicomPatientId}|${img.studyDate || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: img.dicomPatientName || null,
          machineId: img.dicomPatientId,
          dob: img.dicomBirthDate || null,
          examDate: img.studyDate || (img.receivedAt || '').slice(0, 10),
          receivedAt: img.receivedAt,
          linkedUhid: img.uhid || null,
          images: [],
        });
      }
      const s = map.get(key);
      s.images.push(img);
      if (!s.name && img.dicomPatientName) s.name = img.dicomPatientName;
      if (!s.dob && img.dicomBirthDate) s.dob = img.dicomBirthDate;
      if (!s.linkedUhid && img.uhid) s.linkedUhid = img.uhid;
    }
    const list = [...map.values()];
    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp = {
      received: (a, b) => (new Date(a.receivedAt) - new Date(b.receivedAt)) * dir,
      name: (a, b) => (a.name || 'zzz').localeCompare(b.name || 'zzz') * dir,
      dob: (a, b) => ((a.dob || '9999').localeCompare(b.dob || '9999')) * dir,
      exam: (a, b) => ((a.examDate || '').localeCompare(b.examDate || '')) * dir,
      images: (a, b) => (a.images.length - b.images.length) * dir,
    }[sortCol];
    return list.sort(cmp);
  }, [inboxImages, sortCol, sortDir]);

  // Attached-image archive: group by examination session (study), newest first.
  // Each session shows its date + time so follow-up scans over time stack up as
  // new dated entries.
  const attachedSessions = useMemo(() => {
    const map = new Map();
    for (const img of attached) {
      const key = img.studyInstanceUid || `${img.studyDate || ''}|${(img.receivedAt || '').slice(0, 13)}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          examDate: img.studyDate || (img.receivedAt || '').slice(0, 10),
          receivedAt: img.receivedAt,
          description: img.studyDescription || null,
          images: [],
        });
      }
      const s = map.get(key);
      s.images.push(img);
      // earliest receivedAt represents when the session arrived
      if (new Date(img.receivedAt) < new Date(s.receivedAt)) s.receivedAt = img.receivedAt;
    }
    return [...map.values()].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [attached]);

  // Associate each report PDF with an image-safe session by date, so the report
  // sits with the images from that examination. Reports that match no session
  // (e.g. saved before this tagging existed) surface at the top of the safe.
  const sessionDates = (s) => [s.examDate, (s.receivedAt || '').slice(0, 10)].filter(Boolean);
  const reportDateOf = (r) => r.testDate || (r.createdAt || '').slice(0, 10);
  const reportsForSession = (s) => reports.filter((r) => sessionDates(s).includes(reportDateOf(r)));
  const matchedReportIds = new Set(attachedSessions.flatMap((s) => reportsForSession(s).map((r) => r.id)));
  const unmatchedReports = reports.filter((r) => !matchedReportIds.has(r.id));

  // Open the newest session by default the first time sessions appear
  const sessionsInitRef = useRef(false);
  useEffect(() => {
    if (!sessionsInitRef.current && attachedSessions.length) {
      sessionsInitRef.current = true;
      setOpenSessions(new Set([attachedSessions[0].key]));
    }
  }, [attachedSessions]);

  const toggleSession = (key) => {
    setOpenSessions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir(col === 'name' ? 'asc' : 'desc'); }
  };

  const studyAllSelected = (s) => s.images.every((img) => rowSelected.has(img.id));
  const toggleStudySelected = (s) => {
    setRowSelected((prev) => {
      const next = new Set(prev);
      if (studyAllSelected(s)) s.images.forEach((img) => next.delete(img.id));
      else s.images.forEach((img) => next.add(img.id));
      return next;
    });
  };
  const toggleImageSelected = (id) => {
    setRowSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeStudyFromInbox = async (s) => {
    const label = s.name || s.machineId;
    if (!window.confirm(`Remove ${label} (${s.images.length} image${s.images.length > 1 ? 's' : ''}) from the inbox list?\n\nThe images themselves are kept — this only clears the row.`)) return;
    try {
      await ultrasoundService.dismissInbox(s.images.map((img) => img.id));
      toast.success(`${label} removed from the inbox list.`);
      setRowSelected((prev) => {
        const next = new Set(prev);
        s.images.forEach((img) => next.delete(img.id));
        return next;
      });
      await loadInbox();
    } catch {
      toast.error('Failed to remove from the inbox.');
    }
  };

  // ================= workspace =================
  const addToWorkspace = (imgs) => {
    const have = new Set([...wsItems.map((it) => it.id), ...wsRemoved.map((it) => it.id)]);
    const added = imgs.filter((img) => !have.has(img.id)).map((img) => ({ ...img, ...DEFAULT_ADJ }));
    if (!added.length) {
      toast('Already in the workspace.');
      return;
    }
    setWsItems((prev) => [...prev, ...added.filter((a) => !prev.some((p) => p.id === a.id))]);
    setView('workspace'); // opening images takes you straight into the workspace screen
    toast.success(`${added.length} image${added.length > 1 ? 's' : ''} added to the workspace.`);
  };

  const moveSelectedToWorkspace = () => {
    const imgs = inboxImages.filter((img) => rowSelected.has(img.id));
    if (!imgs.length) { toast.error('Tick at least one study or image first.'); return; }
    addToWorkspace(imgs);
    setRowSelected(new Set());
  };

  const updateWsItem = (id, patch) => {
    // applyAll writes the patch into every image; otherwise just the one.
    setWsItems((prev) => prev.map((it) => (applyAll || it.id === id ? { ...it, ...patch } : it)));
  };

  const moveWsItem = (index, dir) => {
    setWsItems((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  // Drag-to-reposition inside the printed cell (per image, or all when applyAll)
  const onPanStart = (it) => (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const adj = getAdj(it);
    dragRef.current = {
      id: it.id, startX: e.clientX, startY: e.clientY,
      ox: adj.offsetX || 0, oy: adj.offsetY || 0,
      w: rect.width, h: rect.height, moved: false,
    };
  };

  const onPanMove = (it) => (e) => {
    const d = dragRef.current;
    if (!d || d.id !== it.id) return;
    const dx = (e.clientX - d.startX) / d.w;
    const dy = (e.clientY - d.startY) / d.h;
    if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 4) d.moved = true;
    if (d.moved) {
      updateWsItem(it.id, { offsetX: clampOff(d.ox + dx), offsetY: clampOff(d.oy + dy) });
    }
  };

  const onPanEnd = (it) => () => {
    const d = dragRef.current;
    if (d && d.id === it.id && !d.moved) {
      // plain click = preview, navigable across the whole workspace set
      setPreviewImage({ images: wsItems, index: wsItems.findIndex((x) => x.id === it.id) });
    }
    dragRef.current = null;
  };

  const resetWsItem = (id) => {
    setWsItems((prev) => prev.map((it) => (applyAll || it.id === id ? { ...it, ...DEFAULT_ADJ } : it)));
  };

  const removeWsItem = (id) => {
    const it = wsItems.find((x) => x.id === id);
    if (!it) return;
    setWsItems((prev) => prev.filter((x) => x.id !== id));
    setWsRemoved((r) => (r.some((x) => x.id === id) ? r : [...r, it]));
  };

  const restoreWsItem = (id) => {
    const it = wsRemoved.find((x) => x.id === id);
    if (!it) return;
    setWsRemoved((prev) => prev.filter((x) => x.id !== id));
    setWsItems((list) => (list.some((x) => x.id === id) ? list : [...list, it]));
  };

  // ================= admin: remove from the safe =================
  const handleArchive = async (reason) => {
    const img = archiveTarget;
    if (!img) return;
    try {
      await ultrasoundService.archive(img.id, reason);
      toast.success('Image removed from the safe (archived).');
      setArchiveTarget(null);
      // Also drop it from the workspace if it happened to be there
      setWsItems((prev) => prev.filter((it) => it.id !== img.id));
      await Promise.all([loadAttached(), loadInbox()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive the image.');
    }
  };

  // ================= outputs =================
  const pdfImages = () => wsItems.filter((it) => blobUrls[it.id]).map((it) => {
    const adj = getAdj(it);
    return {
      src: blobUrls[it.id],
      brightness: adj.brightness,
      scale: adj.scale,
      offsetX: adj.offsetX || 0,
      offsetY: adj.offsetY || 0,
    };
  });

  const pdfMeta = () => ({
    patientName: attachedPatient?.name || null,
    uhid: attachedPatient?.uhid || '',
    studyDate: wsItems[0]?.studyDate || null,
  });

  const guard = () => {
    if (!wsItems.length) { toast.error('The workspace is empty — move some images in first.'); return false; }
    return true;
  };

  const layoutOpts = () => ({ orientation: layout.orientation, cols: layout.cols, rows: layout.rows });

  // Attach to patient — saves the workspace images into a patient's ultrasound
  // image safe (idempotent assign), and makes that patient the report target.
  const handleAttach = async (selected) => {
    if (!selected || !wsItems.length) return;
    setBusy('attach');
    try {
      await Promise.all(wsItems.map((it) => ultrasoundService.assign(it.id, selected.uhid)));
      setAttachedPatient(selected);
      toast.success(`${wsItems.length} image${wsItems.length > 1 ? 's' : ''} saved to ${selected.name || selected.uhid}'s image safe.`);
      setAttachOpen(false);
      await Promise.all([loadAttached(), loadInbox()]);
      // If the user hit "Save to Medical Documents" before choosing a patient,
      // finish that save now that we have one.
      if (savePending) { setSavePending(false); await filePdfTo(selected); }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to attach the images.');
    } finally { setBusy(null); }
  };

  // Preview PDF — build the report and open the preview modal (Download / Print /
  // Save to Medical Documents happen from there).
  const openPdfPreview = async () => {
    if (!guard()) return;
    setBusy('pdf');
    try {
      const { filename, blob } = await exportUltrasoundPdf(pdfImages(), pdfMeta(), { ...layoutOpts(), output: 'blob' });
      setPdf({ url: URL.createObjectURL(blob), filename, blob });
    } catch (err) { console.error(err); toast.error('Could not build the PDF preview.'); }
    finally { setBusy(null); }
  };

  const closePdf = () => {
    if (pdf?.url) URL.revokeObjectURL(pdf.url);
    setPdf(null);
  };

  const handlePdfDownload = () => {
    if (!pdf) return;
    const a = document.createElement('a');
    a.href = pdf.url;
    a.download = pdf.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(`Downloaded ${pdf.filename}`);
  };

  const handlePdfPrint = () => {
    if (!pdf) return;
    const win = window.open(pdf.url, '_blank');
    if (!win) toast.error('Popup blocked — allow popups for this site to print.');
  };

  // File the composed PDF into a patient's Medical Documents (their Diagnostics
  // file). Takes the target explicitly so it can run straight after an attach.
  const filePdfTo = async (targetPatient) => {
    if (!pdf || !targetPatient) return;
    setBusy('save');
    try {
      const formData = new FormData();
      formData.append('file', new File([pdf.blob], pdf.filename, { type: 'application/pdf' }));
      formData.append('uhid', targetPatient.uhid);
      formData.append('documentCategory', 'Imaging Report');
      formData.append('testType', 'Ultrasound');
      // Tag with the study date so the patient's Radiology tab can file the
      // report next to that examination's images.
      formData.append('testDate', pdfMeta().studyDate || '');
      formData.append('notes', `Ultrasound report — ${wsItems.length} image${wsItems.length > 1 ? 's' : ''}`);
      const res = await documentService.upload(formData);
      if (res.success === false) throw new Error(res.message);
      toast.success(`Report filed to ${targetPatient.uhid}'s Medical Documents.`);
      closePdf();
      await loadAttached();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to file the report.');
    } finally { setBusy(null); }
  };

  // Save from the preview modal. If no patient is attached yet, pick one first
  // (same attach flow — also files the images into their safe), then file.
  const handlePdfSaveToDocs = () => {
    if (!pdf) return;
    if (!attachedPatient) { setSavePending(true); setAttachOpen(true); return; }
    filePdfTo(attachedPatient);
  };

  // View / download a saved imaging-report PDF from the patient's Radiology tab.
  const reportFilename = (doc) => (doc.fileUrl || '').split('/').pop();

  const openReport = async (doc) => {
    if (!doc.fileUrl) return;
    try {
      const blob = await documentService.getFile(reportFilename(doc));
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error('Could not open the report.'); }
  };

  const downloadReport = async (doc) => {
    if (!doc.fileUrl) return;
    try {
      const blob = await documentService.getFile(reportFilename(doc));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || reportFilename(doc);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Could not download the report.'); }
  };

  // ================= render =================
  if (isLoading) {
    return <Card><div className="flex items-center justify-center py-16"><Spinner /></div></Card>;
  }

  const SortHeader = ({ col, children, className = '' }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 cursor-pointer select-none hover:text-blue-700 ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortCol === col && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {!patient && view === 'workspace' && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView('list')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to worklist
          </button>
          <span className="text-xs text-gray-500">{wsItems.length} image{wsItems.length !== 1 && 's'} in the report</span>
        </div>
      )}

      {/* ===== ZONE 1 — MACHINE INBOX — Radiology Suite only (hidden in the patient file) ===== */}
      {!patient && view === 'list' && (
      <Card className="!p-6 border-2 border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <Inbox className={`w-5 h-5 ${inboxStudies.length ? 'text-blue-600' : 'text-gray-400'}`} />
          <h3 className="font-bold text-gray-800">{unassignedOnly ? 'Unassigned images' : 'Machine inbox'}</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${inboxStudies.length ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            {inboxStudies.length}
          </span>
          <span className="text-xs text-gray-500 hidden sm:inline">
            — rows stay listed until you remove them with <Trash2 className="w-3 h-3 inline" />
          </span>
          <button
            onClick={() => { loadInbox(); loadAttached(); }}
            title="Refresh — pull any newly-arrived studies"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {wsItems.length > 0 && (
            <button
              onClick={() => setView('workspace')}
              title="Open the report workspace"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              <LayoutGrid className="w-4 h-4" /> Open workspace ({wsItems.length})
            </button>
          )}
        </div>

        {inboxStudies.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            {unassignedOnly
              ? 'No unassigned images — everything received has matched a patient.'
              : 'Nothing in the inbox — scans sent from the machine will appear here in real time.'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="w-9"></th>
                    <th className="w-8 px-2 py-2 text-left text-[11px] font-bold uppercase text-gray-500">#</th>
                    <SortHeader col="name">Name</SortHeader>
                    <SortHeader col="dob">Date of birth</SortHeader>
                    <SortHeader col="exam">Date of examination</SortHeader>
                    <SortHeader col="images" className="text-right">Images</SortHeader>
                    <th className="w-24"></th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {inboxStudies.map((s, idx) => {
                    const isExpanded = expandedRow === s.key;
                    const allPicked = studyAllSelected(s);
                    const picked = s.images.filter((img) => rowSelected.has(img.id)).length;
                    return (
                      <Fragment key={s.key}>
                        <tr className={`border-b border-gray-100 ${picked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-2 py-2.5">
                            <input
                              type="checkbox"
                              checked={allPicked}
                              onChange={() => toggleStudySelected(s)}
                              className="w-4 h-4 accent-blue-600"
                              title="Select every image in this study"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-gray-400 font-semibold">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-bold text-gray-800">{s.name || 'Unknown name'}</span>
                            <span className="ml-2 font-mono text-xs text-gray-400">{s.machineId}</span>
                            {s.linkedUhid && (
                              <span className="ml-2 text-[11px] font-semibold text-green-700">✓ {s.linkedUhid}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600">{s.dob || '—'}</td>
                          <td className="px-3 py-2.5 text-gray-600">{s.examDate || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-700">
                            {s.images.length}{picked > 0 && <span className="text-blue-600 font-normal"> · {picked} ✓</span>}
                          </td>
                          <td className="px-2 py-2.5">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : s.key)}
                              className="text-xs font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-0.5"
                            >
                              preview {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="px-2 py-2.5">
                            <button
                              onClick={() => removeStudyFromInbox(s)}
                              title="Remove this row from the inbox list (images are kept)"
                              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-gray-100 bg-gray-50/60">
                            <td colSpan={8} className="px-4 py-3">
                              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {s.images.map((img) => {
                                  const isPicked = rowSelected.has(img.id);
                                  return (
                                    <div
                                      key={img.id}
                                      onClick={() => toggleImageSelected(img.id)}
                                      className={`relative rounded-lg border-2 overflow-hidden cursor-pointer bg-black aspect-[4/3] flex items-center justify-center ${
                                        isPicked ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-blue-300'
                                      }`}
                                    >
                                      {blobUrls[img.id]
                                        ? <img src={blobUrls[img.id]} alt={img.fileName} className="max-w-full max-h-full object-contain" />
                                        : <span className="text-gray-500 text-[10px]">Image unavailable</span>}
                                      <input type="checkbox" readOnly checked={isPicked} className="absolute top-1 left-1 w-4 h-4 accent-blue-600 pointer-events-none" />
                                      {img.isMultiframe && (
                                        <span className="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1 py-0.5 rounded">CLIP</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={moveSelectedToWorkspace} disabled={rowSelected.size === 0} className="!px-5 !py-2.5 text-sm">
                <ArrowDown className="w-4 h-4" /> Move {rowSelected.size || ''} selected to workspace
              </Button>
            </div>
          </>
        )}
      </Card>
      )}

      {/* ================= ZONE 2 — REPORT WORKSPACE (its own screen) ================= */}
      {!patient && view === 'workspace' && (
      <Card className="!p-6 border-2 border-blue-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-blue-900">Report workspace</h3>
            <span className="text-xs text-gray-500">
              {wsItems.length} image{wsItems.length !== 1 && 's'} · {Math.max(1, Math.ceil(wsItems.length / (layout.cols * layout.rows)))} page{Math.ceil(wsItems.length / (layout.cols * layout.rows)) > 1 && 's'} · boxes show the exact printed cell — drag an image to reposition, zoom to fill
            </span>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            Apply adjustments to all
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayoutId(l.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                layoutId === l.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {applyAll && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg flex flex-wrap gap-6">
            <WsSlider label="Brightness (all)" min={0.2} max={2} step={0.05} value={wsItems[0]?.brightness ?? 1}
              display={`${(wsItems[0]?.brightness ?? 1).toFixed(2)}×`} onChange={(v) => updateWsItem(null, { brightness: v })} wide />
            <WsSlider label="Zoom / size (all)" min={0.25} max={1.5} step={0.05} value={wsItems[0]?.scale ?? 1}
              display={`${Math.round((wsItems[0]?.scale ?? 1) * 100)}%`} onChange={(v) => updateWsItem(null, { scale: v })} wide />
          </div>
        )}

        {wsItems.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl py-10 text-center text-gray-400">
            <ArrowDown className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-semibold">Workspace is empty</p>
            <p className="text-xs mt-1">Tick studies in the inbox above (or add from the attached images below) and move them here.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${layout.cols === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {wsItems.map((it, index) => {
              const adj = getAdj(it);
              return (
                <div key={it.id} className="rounded-lg border-2 border-blue-200 overflow-hidden bg-white">
                  {/* Box has the EXACT aspect ratio of the printed cell for this
                      layout — what fills this box fills the PDF cell. Drag the
                      image to reposition; plain click opens the large preview. */}
                  <div
                    className="relative bg-black flex items-center justify-center overflow-hidden cursor-move touch-none select-none"
                    style={{ aspectRatio: `${cellRatio}` }}
                    onPointerDown={onPanStart(it)}
                    onPointerMove={onPanMove(it)}
                    onPointerUp={onPanEnd(it)}
                  >
                    {blobUrls[it.id] ? (
                      /* Wrapper is exactly the box, so translate % = box size —
                         identical maths to the PDF cell compositor (WYSIWYG). */
                      <div
                        className="w-full h-full pointer-events-none"
                        style={{ transform: `translate(${(adj.offsetX || 0) * 100}%, ${(adj.offsetY || 0) * 100}%) scale(${adj.scale})` }}
                      >
                        <img
                          src={blobUrls[it.id]}
                          alt={it.fileName}
                          draggable={false}
                          className="w-full h-full object-contain"
                          style={{ filter: `brightness(${adj.brightness})` }}
                        />
                      </div>
                    ) : <span className="text-gray-500 text-xs">Loading…</span>}
                    <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{index + 1}</span>
                    {it.isMultiframe && (
                      <span className="absolute top-1.5 right-8 bg-purple-600 text-white text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5"><Film className="w-3 h-3" /> CLIP</span>
                    )}
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); removeWsItem(it.id); }}
                      title="Remove from layout"
                      className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); resetWsItem(it.id); }}
                      title="Reset zoom, position and brightness"
                      className="absolute bottom-1.5 right-1.5 bg-gray-700/80 hover:bg-gray-600 text-white w-5 h-5 rounded-full flex items-center justify-center"
                    >
                      <Undo2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    {!applyAll && (
                      <>
                        <WsSlider label="Brightness" min={0.2} max={2} step={0.05} value={it.brightness}
                          display={`${it.brightness.toFixed(2)}×`} onChange={(v) => updateWsItem(it.id, { brightness: v })} />
                        <WsSlider label="Zoom / size" min={0.25} max={1.5} step={0.05} value={it.scale}
                          display={`${Math.round(it.scale * 100)}%`} onChange={(v) => updateWsItem(it.id, { scale: v })} />
                      </>
                    )}
                    <div className="flex justify-between items-center pt-0.5">
                      <button onClick={() => moveWsItem(index, -1)} disabled={index === 0}
                        className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Move earlier">
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </button>
                      <span className="text-[10px] text-gray-400 truncate px-1">{it.dicomPatientName || it.studyDescription || it.fileName}</span>
                      <button onClick={() => moveWsItem(index, 1)} disabled={index === wsItems.length - 1}
                        className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Move later">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {wsRemoved.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs font-semibold text-gray-600 mb-2">Removed from layout — click to restore</p>
            <div className="flex flex-wrap gap-2">
              {wsRemoved.map((it) => (
                <button key={it.id} onClick={() => restoreWsItem(it.id)} title="Restore"
                  className="relative w-20 aspect-[4/3] bg-black rounded overflow-hidden border-2 border-gray-300 hover:border-blue-500 group">
                  {blobUrls[it.id] && <img src={blobUrls[it.id]} alt="" className="w-full h-full object-contain opacity-60 group-hover:opacity-100" />}
                  <Undo2 className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {attachedPatient
              ? <>Attached to <span className="font-semibold text-gray-700">{attachedPatient.name || attachedPatient.uhid}</span> · images saved to their safe</>
              : 'Attach the images to a patient to save them into the record.'}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => { if (!guard()) return; setAttachOpen(true); }}
              disabled={!!busy}
              variant="outline"
              className="!px-4 !py-2 text-sm"
            >
              {busy === 'attach' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Attach to patient
            </Button>
            <Button onClick={openPdfPreview} disabled={!!busy} className="!px-4 !py-2 text-sm">
              {busy === 'pdf' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Preview PDF
            </Button>
          </div>
        </div>
      </Card>
      )}

      {/* ===== ZONE 3 — IMAGE SAFE — patient file (view-only): each date's images + its report ===== */}
      {patient && (
      <Card className="!p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-800">Image safe — {patient.name}</h3>
            <span className="text-xs text-gray-500">
              {attached.length} image{attached.length !== 1 && 's'} · {attachedSessions.length} session{attachedSessions.length !== 1 && 's'}
            </span>
            <span className="hidden md:inline text-[11px] text-gray-400 italic">
              — permanent record; images are attached from the Radiology Suite, and only an admin can remove one.
            </span>
          </div>
        </div>

        {unmatchedReports.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Reports</p>
            {unmatchedReports.map((doc) => (
              <ReportItem key={doc.id} doc={doc} onView={openReport} onDownload={downloadReport} />
            ))}
          </div>
        )}

        {attached.length === 0 ? (
          <p className="text-sm text-gray-500">
            No images stored yet. Scans made with UHID <span className="font-mono font-semibold">{patient.uhid}</span> are archived here automatically; others can be attached from the Radiology Suite. Each examination is kept as a dated entry so follow-up scans stack up over time.
          </p>
        ) : (
          <div className="space-y-3">
            {attachedSessions.map((session) => {
              const dt = new Date(session.receivedAt);
              const label = dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
              const sessionReports = reportsForSession(session);
              const badge = (
                <span className="inline-flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-semibold text-gray-600">{session.images.length} image{session.images.length !== 1 && 's'}</span>
                  {sessionReports.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                      <FileText className="w-3.5 h-3.5" />{sessionReports.length} report{sessionReports.length !== 1 && 's'}
                    </span>
                  )}
                  {session.description && <span className="hidden sm:inline">· {session.description}</span>}
                </span>
              );
              return (
                <AccordionPanel
                  key={session.key}
                  icon={Calendar}
                  label={label}
                  badge={badge}
                  isOpen={openSessions.has(session.key)}
                  onToggle={() => toggleSession(session.key)}
                  padding="p-4"
                >
                  {sessionReports.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {sessionReports.map((doc) => (
                        <ReportItem key={doc.id} doc={doc} onView={openReport} onDownload={downloadReport} />
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {session.images.map((img, imgIdx) => (
                      <div key={img.id} className="group rounded-lg border-2 border-gray-200 overflow-hidden bg-white">
                        <div
                          className="relative bg-black aspect-[4/3] flex items-center justify-center cursor-pointer"
                          onClick={() => setPreviewImage({ images: session.images, index: imgIdx })}
                        >
                          {blobUrls[img.id]
                            ? <img src={blobUrls[img.id]} alt={img.fileName} className="max-w-full max-h-full object-contain" />
                            : <span className="text-gray-500 text-[10px]">Image unavailable</span>}
                          {img.isMultiframe && (
                            <span className="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1 py-0.5 rounded">CLIP</span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setArchiveTarget(img); }}
                              title="Admin: remove this image from the safe"
                              className="absolute top-1 left-1 bg-red-600/90 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionPanel>
              );
            })}
          </div>
        )}
      </Card>
      )}

      <ReasonModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Remove image from the safe"
        message="This archives the image (admin only). It is hidden from the patient's record but never deleted from storage, and can be restored. A reason is required for the audit trail."
        confirmLabel="Archive image"
        destructive
        placeholder="Reason for removing this image…"
        onConfirm={handleArchive}
      />

      {previewImage && (
        <UltrasoundPreview
          images={previewImage.images}
          startIndex={previewImage.index}
          blobUrls={blobUrls}
          onClose={() => setPreviewImage(null)}
        />
      )}

      <PdfPreviewModal
        isOpen={!!pdf}
        onClose={closePdf}
        pdfUrl={pdf?.url}
        patient={attachedPatient}
        busy={busy}
        onDownload={handlePdfDownload}
        onPrint={handlePdfPrint}
        onSaveToDocs={handlePdfSaveToDocs}
      />

      {/* Rendered after the preview so the picker stacks on top when Save opens it. */}
      <AttachToPatientModal
        isOpen={attachOpen}
        onClose={() => { setAttachOpen(false); setSavePending(false); }}
        fixedPatient={patient}
        imageCount={wsItems.length}
        busy={busy === 'attach'}
        onConfirm={handleAttach}
      />
    </div>
  );
};

// A saved imaging-report PDF row shown inside the image safe (view / download).
const ReportItem = ({ doc, onView, onDownload }) => (
  <div className="flex items-center justify-between px-3 py-2 bg-red-50/50 border border-red-100 rounded-lg">
    <div className="flex items-center gap-2.5 min-w-0">
      <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{doc.fileName || 'Ultrasound report'}</p>
        <p className="text-[11px] text-gray-500 truncate">
          {(doc.testDate || doc.createdAt || '').slice(0, 10)}{doc.notes ? ` · ${doc.notes}` : ''}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button onClick={() => onView(doc)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 px-2 py-1">
        <FileText className="w-3.5 h-3.5" /> View
      </button>
      <button onClick={() => onDownload(doc)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 px-2 py-1">
        <Download className="w-3.5 h-3.5" /> Download
      </button>
    </div>
  </div>
);

const WsSlider = ({ label, min, max, step, value, display, onChange, wide = false }) => (
  <div className={wide ? 'min-w-[220px]' : ''}>
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

export default UltrasoundTab;
