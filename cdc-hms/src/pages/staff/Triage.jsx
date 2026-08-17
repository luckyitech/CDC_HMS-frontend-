import PageHeader from "../../components/shared/PageHeader";
import TriageWorklist from "../../components/nursing/TriageWorklist";

// Standalone Triage route. Triage now lives primarily as the second tab of Queue
// Management; this thin page keeps the direct /…/triage route working and reuses
// the same worklist component.
const Triage = () => (
  <div className="space-y-6">
    <PageHeader title="Triage" subtitle="Patients waiting for a nurse" />
    <TriageWorklist />
  </div>
);

export default Triage;
