import PageHeader from '../../components/shared/PageHeader';
import UltrasoundTab from '../../components/shared/UltrasoundTab';

/**
 * Radiology — Unassigned Queue. Same component and workspace as the Radiology
 * Suite (DRY), scoped to studies whose machine patient ID matched no UHID.
 * Preview, move to the workspace, and attach each to the correct patient.
 */
const RadiologyUnassigned = () => (
  <div>
    <PageHeader
      title="Unassigned Ultrasound Images"
      subtitle="Images from imaging machines whose patient ID matched no UHID — attach each to the correct patient"
    />
    <UltrasoundTab source="unassigned" />
  </div>
);

export default RadiologyUnassigned;
