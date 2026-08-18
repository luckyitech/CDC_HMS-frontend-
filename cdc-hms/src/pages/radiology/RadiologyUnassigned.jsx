import PageHeader from '../../components/shared/PageHeader';
import UltrasoundTab from '../../components/shared/UltrasoundTab';

/**
 * Radiology — Unassigned Queue.
 *
 * Same component, table and workspace as the Radiology Suite (DRY), but scoped
 * to studies whose machine patient ID matched no UHID. Its only job is to flag
 * that some received images still need attaching to a patient; from here you can
 * preview, move to the workspace, and attach them exactly as in the Suite.
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
