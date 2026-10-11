import { useState } from 'react';
import HistologyRequestForm from './HistologyRequestForm';
import HistologyRequestList from './HistologyRequestList';
import { useUserContext } from '../../contexts/UserContext';
import { canRecordHistology } from '../../utils/permissions';

/**
 * HistologyPanel — Orders tab 3 in Today's Consultation (D11): the request
 * form, and below it every histology / cytology request for this patient
 * with their results. Shown only while the clinic has the Histology /
 * cytology module on (the caller checks).
 *
 * Props: patient
 */
const HistologyPanel = ({ patient }) => {
  const { currentUser } = useUserContext();
  const [reloadKey, setReloadKey] = useState(0);
  const uhid = patient?.uhid;
  const canWrite = canRecordHistology(currentUser) && !patient?.mergedIntoUhid;
  return (
    <div className="flex flex-col gap-5">
      {canWrite && <HistologyRequestForm uhid={uhid} onCreated={() => setReloadKey((k) => k + 1)} />}
      <div className="flex flex-col gap-2">
        <h3 className="ui-box-title">This patient's requests</h3>
        <HistologyRequestList uhid={uhid} canWrite={canWrite} reloadKey={reloadKey} />
      </div>
    </div>
  );
};

export default HistologyPanel;
