import PageHeader from '../../components/shared/PageHeader';
import ImagingThyroidBoard from '../../components/radiology/ImagingThyroidBoard';

/**
 * Radiology — Unassigned Queue.
 *
 * Same board as the Radiology Suite (DRY), scoped to studies whose machine
 * patient ID matched no UHID. Preview, move to the workspace, attach to a
 * patient, then — once attached — launch the thyroid reporting tool.
 */
const RadiologyUnassigned = () => (
  <div>
    <PageHeader
      title="Unassigned Ultrasound Images"
      subtitle="Images from imaging machines whose patient ID matched no UHID — attach each to the correct patient"
    />
    <ImagingThyroidBoard source="unassigned" />
  </div>
);

export default RadiologyUnassigned;
