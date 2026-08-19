import PageHeader from '../../components/shared/PageHeader';
import UltrasoundTab from '../../components/shared/UltrasoundTab';

/**
 * Radiology Suite — top-level portal.
 *
 * The standalone imaging worklist: every study received from an imaging machine
 * (currently the HS70A ultrasound) lands in the inbox table; open one into the
 * shared report workspace to arrange, adjust, print/PDF and save to a patient's
 * record. Renders the SAME component as the patient file's Diagnostics →
 * Radiology tab (DRY), just without a fixed patient — the report's target UHID
 * is typed in the workspace.
 *
 * Named "Radiology" (not "Ultrasound") so CT / X-ray can join the same portal.
 */
const RadiologySuite = () => (
  <div>
    <PageHeader
      title="Radiology Suite"
      subtitle="Every study received from imaging machines — build and save reports"
    />
    <UltrasoundTab />
  </div>
);

export default RadiologySuite;
