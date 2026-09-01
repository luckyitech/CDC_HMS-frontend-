import PageHeader from '../../components/shared/PageHeader';
import NeuropathyStudio from '../../components/shared/NeuropathyStudio';

/**
 * Neuropathy Studio — the Vibrotherm Dx assessment performed inside the
 * Radiology portal (read-only capture from the probe over Web Serial),
 * graded server-side and filed to the patient's record.
 */
const NeuropathyStudioPage = () => (
  <div>
    <PageHeader
      title="Neuropathy Studio"
      subtitle="Biothesiometry, thermal perception and monofilament — captured live, graded and filed to the patient's record"
    />
    <NeuropathyStudio />
  </div>
);

export default NeuropathyStudioPage;
