import PageHeader from '../../components/shared/PageHeader';
import ImagingThyroidBoard from '../../components/radiology/ImagingThyroidBoard';

/**
 * Radiology Suite — top-level portal.
 *
 * The machine worklist and workspace. Structured reporting (thyroid, and later
 * others) is launched from the workspace via "Open thyroid reporting tool", so
 * there is no separate reports tab. Named "Radiology" (not "Ultrasound") so
 * CT / X-ray can join the same portal.
 */
const RadiologySuite = () => (
  <div>
    <PageHeader
      title="Radiology Suite"
      subtitle="Machine studies and structured reports — build and save to a patient's record"
    />
    <ImagingThyroidBoard source="inbox" />
  </div>
);

export default RadiologySuite;
