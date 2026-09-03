import PageHeader from '../../components/shared/PageHeader';
import NeuropathyStudio from '../../components/shared/NeuropathyStudio';

/**
 * Neuropathy Studio — the standalone radiology-portal worklist (New exam picker
 * + Studies list) for ad-hoc use. The queued flow is handled in the patient
 * file's PNS Studio tab (RadiologyDashboard → Start), not here.
 */
const NeuropathyStudioPage = () => (
  <div>
    <PageHeader title="Neuropathy Suite" />
    <NeuropathyStudio />
  </div>
);

export default NeuropathyStudioPage;
