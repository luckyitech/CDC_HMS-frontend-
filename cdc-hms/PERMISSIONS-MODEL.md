# Permissions — target RBAC model (build slowly)

This is the **direction of travel** for access control, adopted incrementally on a
live clinical system — never as a big-bang rewrite. Source: "Staff Descriptions"
review, Aug 2026. Pairs with `RECORD-FILES.md`.

## Target model

```
USER
 ├── DOMAIN        Doctor · Staff · Admin          (the three top-level buttons)
 ├── PROFESSION    Physician · Nurse · Pharmacist · Laboratory · Radiology ·
 │                 Allied Health · Administration
 ├── ROLE          Consultant · Medical Officer · Registered Nurse ·
 │                 Pharmacist · Receptionist · Billing Officer · …
 ├── DEPARTMENT    Internal Medicine · Surgery · Emergency · ICU · Outpatient · …
 ├── ACCESS SCOPE  L1 own patients · L2 department · L3 ward/unit · L4 facility ·
 │                 L5 system administration
 └── PERMISSIONS   View · Create · Edit · Sign · Approve · Delete · Dispense ·
                   Bill · Administer · …
```

Guiding line: **title → role → permissions; department → where those permissions
apply.** Keep the three domain buttons (Doctor / Staff / Admin); clicking one
opens a structured role selector rather than granting a flat account.

Workflow separations to preserve as we get there:
- Lab: **result entry ≠ result validation** (technician enters, scientist/pathologist validates).
- Radiology: **acquisition ≠ interpretation ≠ report sign-off**.
- IT: **technical access ≠ clinical authority**.

## What already exists (the seam to grow)

- `role` ENUM + a per-user `permissions` list — capabilities are data, so **adding
  one is a string, not a migration**. This is the RBAC seam; it just holds two
  capabilities today (`admin.access`, `stock.manage`).
- `StaffProfile` carries `position` and `department`.
- A `nurse` role and the inpatient module — nursing is already becoming
  first-class, as the review recommends.

## Missing (in priority order — build cheapest-first)

1. **Grow the permission catalogue** in `backend/constants/permissions.js`
   (mirror in `frontend/src/utils/permissions.js`) as features need it — e.g.
   `prescribe`, `sign.discharge`, `lab.validate`, `dispense`. No migration.
2. **Access Scope** — one field on the profile + one check near the merge-aware
   patient reads. Highest-value single addition; contained.
3. **Profession** as its own layer, split from `role`, when the role selector
   needs it.
4. **Lab-validate / radiology-sign** as workflow states, alongside structuring
   `LabTest.results` (already on the backlog).

## Deliberately deferred

The full profession × department × scope matrix for every cadre in the source
document (theatre coordinator, prosthetist, credit controller, …). A diabetes
centre won't give most of those distinct permissions for a long time — encoding
them early is carried complexity with no user. Add a cadre only when it needs a
permission the model can't already express.

## Rule

Every new capability is one string here + on the backend, checked through the one
permissions middleware. No bespoke per-capability handlers, no schema change.
Grow this list; don't fork it.
