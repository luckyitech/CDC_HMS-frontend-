// Photos by body area (8 Oct 2026, Emu) — pure helpers shared by the skin record
// map (hover + timeline overlay) and the photo box beside the map.
//
// A photo attached to areas belongs to each of them. A photo with no area is
// an overview of its whole finding, so it belongs to every area of that finding.

/** { regionId → [photo…] } oldest first. `findings` = board findings (id, regions). */
export const photosByArea = (photos = [], findings = []) => {
  const regionsOf = new Map(findings.map((f) => [f.id, f.regions || []]));
  const out = {};
  for (const p of photos) {
    const areas = (p.regions && p.regions.length) ? p.regions : (regionsOf.get(p.findingId) || []);
    for (const r of areas) (out[r] = out[r] || []).push(p);
  }
  const when = (p) => `${p.visitDate || ''} ${p.createdAt || ''}`;
  for (const r of Object.keys(out)) out[r].sort((a, b) => (when(a) < when(b) ? -1 : when(a) > when(b) ? 1 : a.id - b.id));
  return out;
};

/** Short tag for a region label: "Left cheek" → "L cheek". */
export const shortArea = (label = '') => label.replace(/^Left /, 'L ').replace(/^Right /, 'R ');

/** "8 Oct 2026, 09:51" in the clinic's reading. */
export const stamp = (iso) => (iso
  ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '');
