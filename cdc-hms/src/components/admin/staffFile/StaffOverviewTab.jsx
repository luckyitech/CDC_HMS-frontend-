import Card from '../../shared/Card';

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const InfoRow = ({ label, value, valueClass = 'text-gray-800' }) => (
  <div className="flex justify-between items-start gap-2 py-2 border-b border-gray-100 last:border-0">
    <p className="text-sm text-gray-500 flex-shrink-0 w-1/2">{label}</p>
    <p className={`text-sm font-semibold ${valueClass} text-right break-words w-1/2`}>{value || '—'}</p>
  </div>
);

/**
 * Overview tab of the Staff File — read-only. Editing the employment fields lives
 * in the User Management tab, mirroring the patient file.
 */
const StaffOverviewTab = ({ staff, lastLogin }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card title="Personal Information" shadow={false} className="border border-gray-100">
      <div>
        <InfoRow label="Full Name" value={staff.name} />
        <InfoRow label="Role" value={staff.role} valueClass="text-primary capitalize" />
        <InfoRow label="Email" value={staff.email} />
        <InfoRow label="Phone" value={staff.phone} />
        <InfoRow label="Account status" value={staff.status} />
        <InfoRow label="Last login" value={fmtDateTime(lastLogin)} />
        <InfoRow label="Joined" value={fmtDate(staff.createdAt)} />
      </div>
    </Card>

    <Card title="Employment" shadow={false} className="border border-gray-100">
      <div>
        <InfoRow label="Position" value={staff.position} />
        <InfoRow label="Department" value={staff.department} />
        <InfoRow label="Shift" value={staff.shift} />
        <InfoRow label="Start Date" value={fmtDate(staff.startDate)} />
      </div>
    </Card>
  </div>
);

export default StaffOverviewTab;
