# CDC HMS — DRY guidelines (frontend)

Written 11 Oct 2026 after the design audit (`claude/hms-design-audit.html` in the project). Code comments already pointed here (§4c, §4e, §4f) but the file had never been written; this is it. When you build a screen, reuse what is listed here instead of hand-rolling it. `npm run check:ui` catches the five most common slips.

## 1. Why this file exists

The HMS drifted because nothing written down said what a box or a page looks like. Two shared box components disagreed (a raised `Card`, a flat HR `Section`), about 270 boxes were hand-built, and 17 pages set their own width. Every rule below removes a choice that each new screen used to make on its own.

## 2. Pages

- **The layout is the frame.** `layouts/MainLayout.jsx` gives every page the full width beside the sidebar and the page padding. A page never sets its own outer padding, `max-w-*` or `mx-auto`.
- **Every page title is `PageHeader`** (`components/shared/PageHeader.jsx`): title, optional subtitle, optional `actions` on the right. No hand-built `<h1>`/`<h2>` page titles.
- **Short forms use the width:** fields sit side by side in a grid (`md:grid-cols-2/3`, `lg:grid-cols-4`) rather than in a narrow centred column. A paragraph of prose may keep a readable measure (`max-w-prose`); a layout may not.
- **Grouped pages share one tab strip:** `PageTabs` (route tabs) or `SwitcherTabs` (in-page tabs). The active tab is CDC blue (`bg-primary`, flat); counts use the one badge. `size="sm"` gives the compact strip for side panels. Never hand-build a tab strip, filter row or toggle: HR's underline tabs, the patient/staff file tabs (`ProfileTabBar` is now a thin wrapper around `SwitcherTabs`), My profile, filter rows and unit toggles all use it (11 Oct 2026).
- **One count badge:** `.ui-badge` (`--ui-badge` / `--ui-badge-text` in `ui.css`), the cyan of the sidebar's Inbox badge. The sidebar reads the same tokens.
- **One hover:** the `ui-hover` class on a row or list item (`--ui-hover`, blue-50); the sidebar reads the same token. Don't write `hover:bg-blue-50`.

## 3. Boxes, tiles, tables

- **One box: `Card`** (`components/shared/Card.jsx`), which is flat: white, hairline grey border, 12 px corners, `p-4 sm:p-6`, **no shadow**. Its `title` is 16 px semibold, always smaller than the page title, and `actions` sits at the right of the title row. HR's `Section` *is* `Card`. When a box can't be a `Card` (a list row, a drawer body), use the `ui-surface` class rather than spelling out `bg-white border … rounded-…` (96 hand-built boxes moved to it on 11 Oct 2026; coloured or dashed borders stay as they are).
- **Shadows only on things that float above the page:** `Modal`, menus and popovers, tooltips, the sidebar, the profile menu. A box on the page never gets a shadow.
- **One number tile: `StatCard`** (`components/shared/StatCard.jsx`), a coloured gradient tile with no shadow. Pass `gradient`, `title`, `value`, optional `sub`, `icon` and `onClick`. Local `Tile` components are thin wrappers around it, never a new design.
- **Tables:** put `ui-thead` on `<thead>`. Header cells then get the one style (small, semibold, uppercase, grey on light grey). Keep padding and alignment on each `<th>` so headers line up with that table's cells. Clinical grids (GMC chart, Kardexes, neuropathy grid, vitals grid) keep their own headers on purpose.
- The tokens live in `src/styles/ui.css`, which is loaded before Tailwind's utilities, so a utility on the same element (a red border on an alert card, a different padding) still wins.

## 4. Building blocks

- **4a · Status colours:** `StatusBadge` and `Tag`, never ad-hoc pills.
- **4b · Buttons:** `Button`.
- **4b′ · Paging:** `Pagination` (`components/shared/Pagination.jsx`). Pass `summary` ("Showing 1–20 of 1676 patients") for a footer bar: the text sits above the buttons on phones and to their left from `sm` up. Never hand-build Prev/Next buttons.
- **4b″ · Filter, sort and view dropdowns:** `SelectMenu` (`components/shared/SelectMenu.jsx`), a drop-in for `<select>` (same `value`, `onChange`, `className`, `<option>` children; `onChange` gets `{ target: { value } }` as a string). Its list opens directly below the box, at least as wide, portalled on `POPOVER_Z`. Form fields keep the native `<select>` (the phone's own picker suits data entry).
- **4c · Scroll areas and overlays:** the app has one scroll container (`<main>`). Independent scroll areas use `overscroll-contain` and, where the design hides the bar, `no-scrollbar`. Dialogs go through `Modal` (title bar + body) or, for a dialog with its own header and footer, `ModalOverlay` (the backdrop alone; same file). Both are portalled to `document.body`, so the floating sidebar or a drawer can never clip them, and sit on `MODAL_Z` (`constants/layers.js`). `onClose` on `ModalOverlay` closes on a click on the backdrop itself; `align="top"` for tall forms that scroll. Don't hand-roll a `fixed inset-0` backdrop. The only deliberate exceptions are the image viewers (z-[100]), the session-timeout screen, drawer scrims and `DermOverlay` (already portalled on `MODAL_Z`), each marked `ui-allow`. Printing hides every child of `<body>` except the print clone, so a print started from a dialog prints only the document.
- **4d · Forms in HR settings:** `Field`, `inputCls` and `SwitchRow` from `components/hr/hrUi.jsx`.
- **4e · Printing:** every printed document goes through `PrintRoot` and `PrintLetterhead`. Never hand-roll a hospital header in a print root.
- **4f · Dropdown groups:** single-open accordion. Opening one nav group or dropdown closes the others (`MainLayout` `toggleGroup`).

## 5. Sidebar

Colours live only in `layouts/sidebar.css`. Themes `sb-white` (active) and `sb-blue` set the `--sb-*` tokens, and the markup uses only the semantic `sb-*` classes. Switching theme means changing one class on the `<aside>`. What is current — the portal in the switcher pill and the selected menu item — wears the one "on" disc (`.sb-disc-on`, CDC blue `--ui-primary` with a white icon) on a white lens pill; the selected item gets it from CSS alone (`.sb-active > .sb-icon`).

## 6. The check

`npm run check:ui` (`scripts/check-ui.mjs`, no dependencies) flags:
1. a shadow on an in-page box;
2. a page that caps its own width;
3. a hand-built page `<h1>`;
4. a hand-rolled dialog backdrop (`fixed inset-0` + `bg-black…`);
5. `hover:bg-blue-50` spelled out instead of `ui-hover`.

For a deliberate exception, put `ui-allow` in a comment on the line or the line above, or, for a file that floats by nature, add it to `ALLOW` in the script with the reason.
