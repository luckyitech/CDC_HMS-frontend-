import { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize2, Sun, ZoomIn, RotateCcw, Save, Check } from 'lucide-react';
import { ultrasoundService } from '../../../services/ultrasoundService';
import UltrasoundPreview from '../../shared/UltrasoundPreview';

const DEFAULT_EDIT = { brightness: 1, scale: 1, offsetX: 0, offsetY: 0 };

/**
 * Image review + light editor for the thyroid reporting workspace. The reporting
 * clinician reviews this patient's machine images while reporting, and can adjust
 * brightness / zoom / position, save an edited copy into the image safe, and tick
 * an image to append it to the report. DRY: reuses ultrasoundService (feed +
 * saveEdited) and the shared UltrasoundPreview.
 */
export default function ImageReviewPane({ patient, reportImages = [], onSetImages, disabled }) {
  const [images, setImages] = useState([]);
  const [blobUrls, setBlobUrls] = useState({});
  const [sel, setSel] = useState(0);
  const [enlarge, setEnlarge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState({});          // imageId -> { brightness, scale, offsetX, offsetY }
  const [panel, setPanel] = useState(null);        // null | 'brightness' | 'zoom'
  const [saving, setSaving] = useState(false);
  const viewerRef = useRef(null);
  const drag = useRef(null);
  const blobRef = useRef({});

  // When the report already has attached images (seeded from the imaging
  // workspace), show ONLY those — not the patient's whole image safe. Fall back
  // to the full safe only when the report has no images yet.
  const scoped = reportImages.length > 0;
  const reportKey = reportImages.map((l) => l.UltrasoundImageId).join(',');

  const load = useCallback(async () => {
    let list = [];
    if (scoped) {
      list = reportImages.map((l) => l.UltrasoundImage).filter(Boolean);
    } else if (patient?.uhid) {
      setLoading(true);
      try {
        const body = await ultrasoundService.getByPatient(patient.uhid);
        list = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
      } catch { list = []; }
    }
    setImages(list);
    setLoading(false);
    await Promise.all(list.map(async (img) => {
      if (blobRef.current[img.id]) return;
      try {
        const res = await ultrasoundService.getFile(ultrasoundService.filenameFromUrl(img.fileUrl));
        const url = URL.createObjectURL(res.data ?? res);
        blobRef.current[img.id] = url;
        setBlobUrls((u) => ({ ...u, [img.id]: url }));
      } catch { /* image unavailable */ }
    }));
  }, [patient, scoped, reportKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (!images.length) {
    return (
      <div className="h-full grid place-items-center text-center p-6 text-sm text-gray-400">
        {loading ? 'Loading images…' : 'No ultrasound images received for this patient yet. They appear here once the machine sends them.'}
      </div>
    );
  }

  const current = images[Math.min(sel, images.length - 1)];
  const edit = edits[current.id] || DEFAULT_EDIT;
  const setEdit = (patch) => setEdits((e) => ({ ...e, [current.id]: { ...(e[current.id] || DEFAULT_EDIT), ...patch } }));
  const inReport = reportImages.some((im) => im.UltrasoundImageId === current.id);

  // drag to reposition
  const onDown = (e) => {
    if (disabled) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: edit.offsetX, oy: edit.offsetY };
    const onMove = (ev) => {
      if (!drag.current) return;
      setEdit({ offsetX: drag.current.ox + (ev.clientX - drag.current.x), offsetY: drag.current.oy + (ev.clientY - drag.current.y) });
    };
    const onUp = () => { drag.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const toggleReport = () => {
    if (disabled || !onSetImages) return;
    let next;
    if (inReport) {
      next = reportImages.filter((im) => im.UltrasoundImageId !== current.id);
    } else {
      next = [...reportImages, { UltrasoundImageId: current.id, brightness: edit.brightness, scale: edit.scale, offsetX: 0, offsetY: 0 }];
    }
    onSetImages(next.map((im, i) => ({ ...im, orderIndex: i })));
  };

  // bake the on-screen edit into a PNG and save as a new image in the safe
  const saveEdited = async () => {
    if (disabled) return;
    const box = viewerRef.current;
    const imgEl = box?.querySelector('img');
    if (!imgEl) return;
    setSaving(true);
    try {
      const W = box.clientWidth, H = box.clientHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const c = canvas.getContext('2d');
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      c.filter = `brightness(${edit.brightness})`;
      const fit = Math.min(W / imgEl.naturalWidth, H / imgEl.naturalHeight);
      const dw = imgEl.naturalWidth * fit * edit.scale;
      const dh = imgEl.naturalHeight * fit * edit.scale;
      const dx = (W - dw) / 2 + edit.offsetX;
      const dy = (H - dh) / 2 + edit.offsetY;
      c.drawImage(imgEl, dx, dy, dw, dh);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      await ultrasoundService.saveEdited(patient.uhid, blob, current.studyDescription || current.fileName);
      await load();   // the edited copy now appears in the safe
    } catch { /* surfaced by a toast elsewhere; keep quiet here */ } finally { setSaving(false); }
  };

  const Tool = ({ active, onClick, icon: Icon, title }) => (
    <button type="button" title={title} onClick={onClick}
      className={`w-8 h-8 grid place-items-center rounded-md border ${active ? 'bg-blue-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center justify-between">
        <span>Images ({images.length})</span>
        <button onClick={() => setEnlarge(true)} className="inline-flex items-center gap-1 text-primary hover:underline normal-case font-medium"><Maximize2 className="w-3.5 h-3.5" /> Enlarge</button>
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-1.5 mb-2">
        <Tool active={panel === 'brightness'} onClick={() => setPanel(panel === 'brightness' ? null : 'brightness')} icon={Sun} title="Brightness" />
        <Tool active={panel === 'zoom'} onClick={() => setPanel(panel === 'zoom' ? null : 'zoom')} icon={ZoomIn} title="Zoom" />
        <Tool onClick={() => setEdit({ ...DEFAULT_EDIT })} icon={RotateCcw} title="Reset" />
        <div className="flex-1" />
        <button type="button" disabled={disabled || saving} onClick={saveEdited}
          className="inline-flex items-center gap-1.5 text-xs bg-primary hover:bg-blue-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-md">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save edited'}
        </button>
      </div>

      {/* slider panel */}
      {panel === 'brightness' && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
          <Sun className="w-3.5 h-3.5" />
          <input type="range" min="0.3" max="2.5" step="0.05" value={edit.brightness} disabled={disabled} onChange={(e) => setEdit({ brightness: Number(e.target.value) })} className="flex-1" />
          <span className="w-10 text-right">{edit.brightness.toFixed(2)}×</span>
        </div>
      )}
      {panel === 'zoom' && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
          <ZoomIn className="w-3.5 h-3.5" />
          <input type="range" min="1" max="4" step="0.05" value={edit.scale} disabled={disabled} onChange={(e) => setEdit({ scale: Number(e.target.value) })} className="flex-1" />
          <span className="w-10 text-right">{edit.scale.toFixed(2)}×</span>
        </div>
      )}

      {/* main viewer (drag to reposition) */}
      <div ref={viewerRef} onMouseDown={onDown}
        className={`relative bg-black rounded-lg overflow-hidden flex-1 min-h-[240px] grid place-items-center ${edit.scale > 1 ? 'cursor-move' : ''}`}>
        {blobUrls[current.id]
          ? <img src={blobUrls[current.id]} alt={current.fileName} draggable={false}
              style={{ filter: `brightness(${edit.brightness})`, transform: `translate(${edit.offsetX}px, ${edit.offsetY}px) scale(${edit.scale})` }}
              className="max-w-full max-h-full object-contain select-none" />
          : <span className="text-[11px] text-gray-500">image unavailable</span>}
        <span className="absolute bottom-1 left-2 text-[10px] text-white/80 bg-black/40 px-1.5 rounded">{current.studyDescription || current.fileName}</span>
      </div>

      {/* add-to-report */}
      <label className={`flex items-center gap-2 mt-2 text-sm ${disabled ? 'text-gray-400' : 'text-gray-700 cursor-pointer'}`}>
        <input type="checkbox" checked={inReport} disabled={disabled} onChange={toggleReport} />
        <span className="inline-flex items-center gap-1">{inReport && <Check className="w-3.5 h-3.5 text-emerald-600" />} Add this image to the end of the report</span>
      </label>

      {/* thumbnail strip */}
      <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button key={img.id} onClick={() => setSel(i)} className={`relative flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 bg-black ${i === sel ? 'border-primary' : 'border-gray-200'}`}>
            {blobUrls[img.id]
              ? <img src={blobUrls[img.id]} alt={img.fileName} className="w-full h-full object-cover" />
              : <span className="text-[8px] text-gray-500 grid place-items-center h-full">n/a</span>}
            {reportImages.some((im) => im.UltrasoundImageId === img.id) && <span className="absolute top-0.5 right-0.5 bg-emerald-500 text-white rounded-full w-3.5 h-3.5 grid place-items-center text-[8px]">✓</span>}
          </button>
        ))}
      </div>

      {enlarge && <UltrasoundPreview images={images} startIndex={sel} blobUrls={blobUrls} onClose={() => setEnlarge(false)} />}
    </div>
  );
}
