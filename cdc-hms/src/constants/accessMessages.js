/**
 * What the system says when it refuses someone.
 *
 * Kept in one place so the wording is the same wherever a refusal surfaces —
 * the API's 403 toast, a portal the route guard will not open, and a login that
 * lands nowhere. Three different code paths were saying three different things,
 * and one of them was saying nothing at all.
 *
 * The tone is deliberate: name what happened, name who can change it, and do
 * not imply the person did something wrong. Most refusals are an admin having
 * set something up, not an attempt to get somewhere they should not be.
 */

/** No portal at all — they can sign in but there is nowhere to go. */
export const NO_PORTAL_MESSAGE =
  'Your account is not set up to open any part of the system yet. '
  + 'Ask an administrator to give you access.';

/** They asked for a specific portal and cannot open that one. */
export const portalDeniedMessage = (portalLabel) =>
  portalLabel
    ? `You do not have access to the ${portalLabel}. Ask an administrator if you need it.`
    : 'You do not have access to that part of the system. Ask an administrator if you need it.';

/** Human names for the portal capabilities, for the message above. */
export const PORTAL_LABELS = {
  'portal.admin':     'Admin portal',
  'portal.doctor':    'Doctor portal',
  'portal.staff':     'Staff portal',
  'portal.lab':       'Lab portal',
  'portal.inpatient': 'Inpatient workspace',
  'portal.radiology': 'Radiology Suite',
};
