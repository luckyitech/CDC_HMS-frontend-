/**
 * Skin photos — make the picture safe and small BEFORE it leaves the device
 * (Dermatology Phase 2, 7 Oct 2026).
 *
 * The camera's file carries metadata (GPS position, device, time). Drawing it
 * onto a canvas and re-encoding as JPEG keeps only the pixels, already turned
 * the right way up, and caps the long side at 2000 px (≈ 0.5–1 MB) so photos
 * upload quickly on the clinic Wi-Fi. The server strips metadata again — this
 * is the first of two guards, not the only one.
 *
 * @returns {Promise<{ blob: Blob, width: number, height: number, url: string }>}
 */
export const toCleanJpeg = async (file, { maxSide = 2000, quality = 0.88 } = {}) => {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('This file is not a picture the browser can read'));
      img.src = URL.createObjectURL(file);
    });
  }
  const w0 = source.width || source.naturalWidth;
  const h0 = source.height || source.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const width = Math.round(w0 * scale);
  const height = Math.round(h0 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(source, 0, 0, width, height);
  if (source.close) source.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not prepare the photo'))), 'image/jpeg', quality));
  return { blob, width, height, url: URL.createObjectURL(blob) };
};
