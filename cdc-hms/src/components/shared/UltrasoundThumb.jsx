import { useEffect, useRef } from 'react';

/**
 * UltrasoundThumb — a grid thumbnail that asks for its file only when it comes
 * near the screen (lazy), using useUltrasoundBlobs' loadBlobs. Shows the image,
 * or `placeholder` until it loads, or "Image unavailable" once it has failed.
 *
 * @param image       the ultrasound image row ({ id, fileUrl, fileName })
 * @param src         blobUrls[image.id] from useUltrasoundBlobs
 * @param load        loadBlobs from useUltrasoundBlobs
 */
const UltrasoundThumb = ({ image, src, load, alt = image?.fileName || '', className = 'max-w-full max-h-full object-contain', placeholder = null, unavailableClass = 'text-gray-500 text-[10px]' }) => {
  const ref = useRef(null);
  const asked = src !== undefined;

  useEffect(() => {
    if (asked || !image || !ref.current) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); load([image]); }
    }, { rootMargin: '300px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [asked, image, load]);

  if (src) return <img src={src} alt={alt} className={className} />;
  if (src === null) return <span className={unavailableClass}>Image unavailable</span>;
  // A real box (not `contents`) so the observer can see it.
  return <span ref={ref} className="flex w-full h-full items-center justify-center">{placeholder}</span>;
};

export default UltrasoundThumb;
