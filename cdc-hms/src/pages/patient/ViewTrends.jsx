import PageHeader from '../../components/shared/PageHeader';
import GlucoseManagementCentre from '../../components/shared/GlucoseManagementCentre';
import { useUserContext } from '../../contexts/UserContext';

/**
 * ViewTrends — the patient's Glucose Management Centre (Phase 2).
 *
 * Replaces the old 7-slot bar chart with the same shared centre the doctor
 * uses (GlucoseManagementCentre), in its `patient` variant: the patient can
 * link and sync their own Accu-Chek Instant over Bluetooth, see the consensus
 * glycaemic metrics (TIR / GMI / variability), keep a diary of meals, activity
 * and doses that tags their readings pre-/post-meal, and print or save a PDF
 * summary — but cannot exclude readings or change targets (those stay with the
 * doctor). The manual logbook they already keep is one of the sources, so
 * nothing they have logged is lost. Own record only (the API enforces it).
 */
const ViewTrends = () => {
  const { currentUser } = useUserContext();
  const uhid = currentUser?.uhid;

  if (!uhid) {
    return (
      <div>
        <PageHeader title="My Blood Sugar" />
        <div className="text-center py-16 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500">We couldn’t find your patient record. Please contact the clinic.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Blood Sugar" />
      <GlucoseManagementCentre patient={{ uhid, name: currentUser?.name || 'My readings' }} variant="patient" />
    </div>
  );
};

export default ViewTrends;
