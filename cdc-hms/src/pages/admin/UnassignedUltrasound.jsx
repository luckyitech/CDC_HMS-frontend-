import { useState, useEffect, useRef, useCallback } from 'react';
import { Waves, Link2, RefreshCw, Film } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import ultrasoundService from '../../services/ultrasoundService';

/**
 * HMIS V4 — Unassigned ultrasound queue.
 *
 * Images whose DICOM patient ID (typed on the HS70A) matched no UHID land
 * here. Staff link each image to the correct patient by entering the UHID.
 */
const UnassignedUltrasound = () => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blobUrls, setBlobUrls] = useState({});
  const [uhidInputs, setUhidInputs] = useState({});   // id -> typed uhid
  const [assigning, setAssigning] = useState(null);   // id being assigned
  const blobUrlsRef = useRef({});

  const load = useCallback(async () => {
    try {
      const res = await ultrasoundService.getUnassigned();
      const list = res.data || [];
      setImages(list);

      const urls = { ...blobUrlsRef.current };
      await Promise.all(
        list.map(async (img) => {
          if (urls[img.id]) return;
          try {
            const filename = ultrasoundService.filenameFromUrl(img.fileUrl);
            const fileRes = await ultrasoundService.getFile(filename);
            urls[img.id] = URL.createObjectURL(fileRes.data ?? fileRes);
          } catch {
            // placeholder shown
          }
        }),
      );
      blobUrlsRef.current = urls;
      setBlobUrls({ ...urls });
    } catch (err) {
      console.error('Error loading unassigned ultrasound images:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      await load();
      if (isMounted) setIsLoading(false);
    })();
    return () => { isMounted = false; };
  }, [load]);

  // Live refresh when the bridge ingests a new (possibly unmatched) image
  useEffect(() => {
    const SSE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sse`;
    const source = new EventSource(SSE_URL);
    source.addEventListener('ultrasound_received', () => load());
    source.onerror = () => {};
    return () => source.close();
  }, [load]);

  // Revoke object URLs on unmount
  useEffect(() => () => {
    Object.values(blobUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = {};
  }, []);

  const handleAssign = async (img) => {
    const uhid = (uhidInputs[img.id] || '').trim();
    if (!uhid) {
      toast.error('Enter a UHID first.');
      return;
    }
    setAssigning(img.id);
    try {
      await ultrasoundService.assign(img.id, uhid);
      toast.success(`Image linked to ${uhid}`);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to assign image.';
      toast.error(msg);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Unassigned Ultrasound Images"
        subtitle="Images from the ultrasound machine whose patient ID matched no UHID. Link each to the correct patient."
      />

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Waves className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold">No unassigned images</p>
            <p className="text-sm mt-1">Every received ultrasound image is linked to a patient.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {images.map((img) => (
              <div key={img.id} className="rounded-lg border-2 border-amber-300 overflow-hidden">
                <div className="bg-black aspect-[4/3] flex items-center justify-center relative">
                  {blobUrls[img.id] ? (
                    <img
                      src={blobUrls[img.id]}
                      alt={img.fileName}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-500 text-xs">Image unavailable</span>
                  )}
                  {img.isMultiframe && (
                    <span className="absolute top-1.5 right-1.5 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Film className="w-3 h-3" /> CLIP
                    </span>
                  )}
                </div>
                <div className="p-3 bg-white space-y-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {img.studyDescription || img.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Typed on machine: <span className="font-mono font-bold text-amber-700">{img.dicomPatientId}</span>
                    {' · '}
                    {img.studyDate || new Date(img.receivedAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Correct UHID…"
                      value={uhidInputs[img.id] || ''}
                      onChange={(e) => setUhidInputs((p) => ({ ...p, [img.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAssign(img)}
                      className="flex-1 min-w-0 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"
                    />
                    <Button
                      onClick={() => handleAssign(img)}
                      disabled={assigning === img.id}
                      className="!px-4 !py-2 text-sm"
                    >
                      {assigning === img.id
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : (<><Link2 className="w-4 h-4" /> Link</>)}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default UnassignedUltrasound;
