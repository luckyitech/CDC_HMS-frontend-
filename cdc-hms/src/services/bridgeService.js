import api from './api';

/**
 * DICOM bridge control (Radiology Suite status chip + Restart button).
 *
 * The bridge on the clinic Mac heartbeats the backend on its own outbound
 * channel; these endpoints read that status and queue a restart that the bridge
 * applies on its next check-in (~30s). Works from any device — the browser
 * never talks to the Mac directly.
 *
 * Backend routes:
 * - GET  /ultrasound/bridge/status   - current status for the chip
 * - POST /ultrasound/bridge/restart  - queue a listener restart
 */
export const bridgeService = {
  getStatus: () => api.get('/ultrasound/bridge/status'),
  requestRestart: () => api.post('/ultrasound/bridge/restart'),
};

export default bridgeService;
