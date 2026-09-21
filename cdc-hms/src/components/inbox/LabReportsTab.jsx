import LabInbox from '../../pages/staff/LabInbox';

// The Lab reports tab reuses the existing Lab Inbox page unchanged. The
// Communications Inbox mirrors WhatsApped lab reports into the same queue
// (source = whatsapp), so this stays the single place external results are
// triaged. The old /<portal>/lab-inbox routes redirect here.
const LabReportsTab = () => <LabInbox embedded />;

export default LabReportsTab;
