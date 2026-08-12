# Record files — architecture & DRY convention

The system has exactly **two record files**. Everything that concerns a person is
done inside their file. This document is the standing convention: future builds
and updates must follow it.

## The two files

| File | For | Component |
|---|---|---|
| **Staff File** | Everyone who *works* in the clinic — doctors, front-desk staff, lab technicians, nurses, and admins (every non-patient account) | `src/pages/admin/StaffFile.jsx` |
| **Patient File** | Patients | `src/pages/shared/PatientFile.jsx` |

There is no third variant. A doctor is a Staff File; a patient is a Patient File.
If a new cadre is added (e.g. radiographer, billing clerk) it is a **role inside
the Staff File**, not a new file.

## Opened the same way everywhere

- **Manage Users** (`src/pages/admin/ManageUsers.jsx`) is a *list only*. It holds
  no actions. Clicking a name opens that person's file via one helper,
  `fileHref(user)`: staff-type roles → `/admin/staff/:id`, patients →
  `/…/patient-profile/:uhid` (the same Patient File every portal uses).
- The **Patient File follows the portal (URL), not the account role** — a doctor
  with admin access viewing `/admin/...` gets the admin experience. Gate on the
  URL prefix, never on `currentUser.role`.

## Shared building blocks — reuse, never duplicate

- `components/shared/ProfileTabBar.jsx` — the tab strip.
- `hooks/useCollapsibleOverview.js` — the overview opens expanded and collapses
  when any tab is selected; the name bar still toggles it manually.
- The collapsible **name-bar header + sliding overview panel** — identical markup
  pattern in both files.
- `Card`, `Button`, `PageHeader`, `StatusBadge`, `StatCard` — shared primitives.

## Where things live (rules for future work)

- **Overview tabs are read-only display.** No editing there.
- **Every action on a person** — edit profile/details, permissions, reset
  password, activate/deactivate, delete, and anything added later — lives in that
  file's **User Management** tab. Never in the list, never scattered across
  headers.
- **Permissions** gate by role (`PERMISSIBLE_ROLES`); a real `admin` account holds
  every permission implicitly, so the toggle list is hidden for them. **Account
  actions** (reset/deactivate/delete) are available for all staff.
- A **new capability** is one string in `backend/constants/permissions.js` and
  `frontend/…/utils/permissions.js` — no migration, no bespoke handler.

## Adding to a file

- **New tab:** add it to that file's tab list and render its component. Reuse
  `ProfileTabBar` and `useCollapsibleOverview` — do not re-implement the header,
  tabs, or collapse behaviour.
- **New person-action:** put it in the **User Management** tab.
- **New staff-scoped data** (e.g. documents): a full vertical slice
  (`model → association in models/index.js → guarded migration → route →
  controller`), soft-deleted via a status field, admin-only.

## UI conventions

- **Hover on white-background actions is `hover:bg-blue-50`** — one token
  everywhere (buttons, menu items, list rows on white/light cards). Gray *buttons*
  (an element that is itself `bg-gray-*`) keep their darker-gray hover; only
  white-bg actions go blue.

## Non-negotiables

- **No dead or orphaned code.** When you move or replace something, delete the old
  path and its now-unused imports in the same change.
- **Always DRY and surgical.**
- Never break the live clinical system. Mock up before touching the doctor's
  consultation screen. Work on a branch, show the diff, let the owner push.
