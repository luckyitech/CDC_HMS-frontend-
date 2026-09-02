import PageHeader from '../../components/shared/PageHeader';
import UltrasoundTab from '../../components/shared/UltrasoundTab';
import BridgeStatusBar from '../../components/shared/BridgeStatusBar';

/**
 * Radiology Suite — the machine worklist and image workspace. Studies are moved
 * to the workspace, edited, attached to a patient, and a final report PDF is
 * uploaded into the patient's image safe (in the Radiology tab of their file).
 * Named "Radiology" (not "Ultrasound") so CT / X-ray can join the same portal.
 */
const RadiologySuite = () => (
  <div>
    <PageHeader
      title="Radiology Suite"
      subtitle="Machine studies — build and save to a patient's record"
    />
    <BridgeStatusBar />
    <UltrasoundTab />
  </div>
);

export default RadiologySuite;
