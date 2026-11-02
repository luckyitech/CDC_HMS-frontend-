import { LogIn, XCircle, Globe, Building2, HelpCircle } from 'lucide-react';
import Tag from './Tag';

// The pills a sign-in record wears — shared by Admin → Monitoring → Sign-ins
// and My profile → Activity → My sign-ins (16 Oct 2026), so both read alike.

const NETWORK = {
  clinic: { label: 'In clinic', cls: 'bg-green-50 text-green-700', Icon: Building2 },
  outside: { label: 'Outside', cls: 'bg-amber-50 text-amber-700', Icon: Globe },
  unknown: { label: 'Unknown', cls: 'bg-gray-100 text-gray-600', Icon: HelpCircle },
};

export const networkLabel = (row) => NETWORK[row.network]?.label || NETWORK.unknown.label;

export const NetworkTag = ({ row }) => {
  const n = NETWORK[row.network] || NETWORK.unknown;
  const named = row.network === 'clinic' && row.networkLabel && row.networkLabel !== 'Clinic';
  return <Tag className={n.cls} Icon={n.Icon}>{named ? row.networkLabel : n.label}</Tag>;
};

export const OutcomeTag = ({ row }) => (row.outcome === 'failed'
  ? <Tag className="bg-red-50 text-red-700" Icon={XCircle}>Failed</Tag>
  : <Tag className="bg-lime-50 text-lime-700" Icon={LogIn}>Signed in</Tag>);
