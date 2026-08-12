import api from './api';

/**
 * GLP-1 / GIP Agonist Monitoring Service
 * Handles all GLP-1 related API calls
 *
 * Backend routes:
 * - GET    /glp1-medications           - Clinic formulary (doctor, admin)
 * - POST   /glp1-medications           - Add an agent (admin only)
 * - PUT    /glp1-medications/:id       - Update an agent (admin only)
 * - DELETE /glp1-medications/:id       - Retire an agent (admin only)
 *
 * - GET    /glp1-therapies?uhid=       - A patient's courses (doctor, staff)
 * - GET    /glp1-therapies/:id/full    - Therapy + reviews + weekly summary, ONE request
 * - POST   /glp1-therapies             - Start a course (doctor) — 422 if safety screen fails
 * - PUT    /glp1-therapies/:id         - Update a course (doctor)
 * - PATCH  /glp1-therapies/:id/schedule    - Replace the dose ladder (doctor)
 * - POST   /glp1-therapies/:id/review-weeks - Add a monitoring week (doctor)
 * - POST   /glp1-therapies/:id/stop    - Stop a course, reason required (doctor)
 *
 * - GET    /glp1-reviews?therapyId=    - Reviews (doctor, staff)
 * - POST   /glp1-reviews               - Record a monitoring visit (doctor)
 * - PUT    /glp1-reviews/:id           - Amend, reason required (doctor)
 * - DELETE /glp1-reviews/:id           - Soft delete, reason required (doctor, admin)
 *
 * - GET    /glp1-symptoms              - Symptom catalogue (doctor, staff)
 * - POST   /glp1-symptoms              - Add a symptom clinic-wide (doctor, admin)
 * - DELETE /glp1-symptoms/:id          - Retire a symptom (admin only)
 *
 * - GET    /glp1-week-notes?therapyId= - Per-week notes (doctor, staff)
 * - POST   /glp1-week-notes            - Add a note to a week (doctor, staff)
 * - DELETE /glp1-week-notes/:id        - Soft delete (author's own; doctors any)
 */

export const glp1Service = {
  // ============================================
  // FORMULARY
  // ============================================

  /**
   * Get the GLP-1 agents — catalogue medications tagged GLP-1 / GIP. Drives the
   * medication tabs. Agents are managed on the admin Clinical Catalog page.
   */
  getMedications: (params = {}) => api.get('/glp1-medications', { params }),

  // ============================================
  // THERAPIES
  // ============================================

  /**
   * Get a patient's GLP-1 courses
   * @param {string} uhid - Patient UHID (REQUIRED)
   * @param {Object} params - { status: 'Active' }
   */
  getTherapies: (uhid, params = {}) => api.get('/glp1-therapies', {
    params: { uhid, ...params }
  }),

  /**
   * Everything the Tools panel needs in ONE request:
   * therapy + medication + reviews + weekly side effect summary
   * @param {number} id - Therapy ID
   */
  getFull: (id) => api.get(`/glp1-therapies/${id}/full`),

  /**
   * Start a patient on a GLP-1 agonist
   * @param {Object} data - Required: uhid, medicationName, startDate, safetyScreen,
   *                        and a ladder (rungs[] or doseSchedule[])
   *                        Optional: medicationBrand, indication, startWeek,
   *                                  startingDose, targetDose, otherConditions,
   *                                  baseline, reviewWeeks
   * Note: doctorId is auto-assigned from JWT token.
   *       Returns 422 if the safety screen is incomplete or a positive finding
   *       has no override reason.
   */
  startTherapy: (data) => api.post('/glp1-therapies', data),

  updateTherapy: (id, data) => api.put(`/glp1-therapies/${id}`, data),

  /**
   * Replace the patient's dose ladder — how steps are added, edited and removed.
   * The whole ladder is sent; the server rejects gaps and overlaps.
   * @param {Array} doseSchedule - [{ fromWeek, toWeek, dose, note }]
   */
  updateSchedule: (id, doseSchedule) => api.patch(`/glp1-therapies/${id}/schedule`, { doseSchedule }),

  /** Adds a monitoring week for this patient only */
  addReviewWeek: (id, week) => api.post(`/glp1-therapies/${id}/review-weeks`, { week }),

  /** Stops a course. There is no delete — a drug the patient took stays in the record */
  stopTherapy: (id, reason) => api.post(`/glp1-therapies/${id}/stop`, { reason }),

  /**
   * Switch agent — stops this course and starts the new one linked to it.
   * @param {Object} data - medicationName, reason and doseSchedule required;
   *                        medicationBrand, startDate, startingDose optional
   */
  switchMedication: (id, data) => api.post(`/glp1-therapies/${id}/switch`, data),

  // ============================================
  // WEEKLY INJECTIONS
  // ============================================

  /**
   * The week-by-week injection record
   * @param {Object} params - { therapyId } or { uhid }, plus status
   */
  getAdministrations: (params) => api.get('/glp1-administrations', { params }),

  /**
   * Record one week as given, missed or omitted.
   * Recording the same week again updates it rather than duplicating.
   * @param {Object} data - therapyId, weekNumber, status required;
   *                        administeredDate, dose, site, note optional.
   *                        A note is required when the status is not 'given'.
   * Note: administeredBy is auto-assigned from the JWT — usually the nurse
   */
  recordAdministration: (data) => api.post('/glp1-administrations', data),

  removeAdministration: (id) => api.delete(`/glp1-administrations/${id}`),

  // ============================================
  // WEEK NOTES
  // ============================================

  /**
   * Free-text notes attached to one week — the nurse's injection note and the
   * doctor's clinical note, both against the same week and told apart by
   * authorRole.
   *
   * Rarely needed alongside getFull, which already returns weekNotes for a
   * course. Use this for a patient-wide read (visit history) or to refresh
   * without refetching the whole therapy.
   * @param {Object} params - { therapyId } or { uhid }, plus weekNumber, includeDeleted
   */
  getWeekNotes: (params) => api.get('/glp1-week-notes', { params }),

  /**
   * Add a note to one week.
   * @param {Object} data - therapyId, weekNumber, body — all required
   * Note: authorId and authorRole are auto-assigned from the JWT, never sent
   */
  addWeekNote: (data) => api.post('/glp1-week-notes', data),

  /** Soft delete — the row stays. A nurse may remove only their own note */
  removeWeekNote: (id) => api.delete(`/glp1-week-notes/${id}`),

  // ============================================
  // REVIEWS
  // ============================================

  /**
   * Get reviews
   * @param {Object} params - { therapyId } or { uhid }, plus includeDeleted
   */
  getReviews: (params) => api.get('/glp1-reviews', { params }),

  /**
   * Record a monitoring visit
   * @param {Object} data - Required: therapyId, weekNumber, reviewDate
   *                        Optional: weight, bmi, waistCircumference, bp, heartRate,
   *                                  fpg, hba1c, doseAtReview, adherence, actionPlan,
   *                                  sideEffects: [{ symptomId, severity, note }]
   * Note: doctorId is auto-assigned from JWT token — this is the Doctor column
   */
  createReview: (data) => api.post('/glp1-reviews', data),

  /**
   * Amend a review. amendmentReason is REQUIRED every time.
   * The original author is never overwritten.
   */
  amendReview: (id, data) => api.put(`/glp1-reviews/${id}`, data),

  /** Soft delete — the row stays, the week is freed. reason REQUIRED */
  removeReview: (id, reason) => api.delete(`/glp1-reviews/${id}`, { data: { reason } }),

  // ============================================
  // SYMPTOM CATALOGUE
  // ============================================

  getSymptoms: (params = {}) => api.get('/glp1-symptoms', { params }),

  /** Adds a symptom clinic-wide — it becomes available for every patient */
  createSymptom: (name) => api.post('/glp1-symptoms', { name }),

  retireSymptom: (id) => api.delete(`/glp1-symptoms/${id}`),
};

export default glp1Service;
