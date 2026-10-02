import PageHeader from '../../components/shared/PageHeader';
import TeamCalendar from '../../components/hr/leave/TeamCalendar';

/**
 * Team leave calendar — /hr/calendar (B27 phase 5). Open to every internal
 * role; the server redacts the leave type for anyone without leave.manage.
 */
const Calendar = () => (
  <div>
    <PageHeader title="Team calendar" subtitle="Who is away this month, so cover can be arranged." />
    <TeamCalendar />
  </div>
);

export default Calendar;
