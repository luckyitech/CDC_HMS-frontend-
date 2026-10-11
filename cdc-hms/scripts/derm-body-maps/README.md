# Dermatology body maps — how `src/constants/dermBodyMaps.js` is made

Generated on 8 Oct 2026 from the clinic's figure drawings (AI-generated, supplied by Dr Ebrahim):
`src/assets/derm/body-female.svg`, `body-male.svg`, and the child figure (its source SVG embeds a
raster; `body-child.webp` is that figure with a transparent background).

Each picture holds a front and a back figure side by side on an 810 × 810 canvas.

1. Render each source at 1620 × 1620 on white (e.g. Playwright) as `p_a64.png` (female),
   `p_a65.png` (male), `p_child.png` (child).
2. `python3 extract.py` (numpy, Pillow, scipy) traces the body row by row, finds the landmarks
   (neck, shoulder, axilla, crotch, arm ends) and cuts the 44 regions of
   `src/constants/dermRegions.js` along the body's own outline. It writes `bm/maps.json`;
   wrap that as `export const DERM_BODY_MAPS = …` in `src/constants/dermBodyMaps.js`.
3. Check the overlay by eye before shipping. Region ids must never change (they are stored on
   the record); `backend/tests/dermatology.test.js` checks every figure draws every id.

Python is only for regenerating — the app itself has no new dependency.
