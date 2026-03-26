import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, CalendarCheck, TrendingUp, Activity, ChevronRight, Droplet, Pill } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useUserContext } from '../../contexts/UserContext';
import { usePatientContext } from '../../contexts/PatientContext';
import { useAppointmentContext } from '../../contexts/AppointmentContext';
import { useBloodSugarUnit, toDisplay } from '../../hooks/useBloodSugarUnit';

// Format date string (YYYY-MM-DD) → "Feb 26, 2026"
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Map backend timeSlot enum → readable label
const SLOT_LABELS = {
  fasting: 'Fasting',
  breakfast: 'After Breakfast',
  beforeLunch: 'Before Lunch',
  afterLunch: 'After Lunch',
  beforeDinner: 'Before Dinner',
  afterDinner: 'After Dinner',
  bedtime: 'Before Bedtime',
};

const getBloodSugarStatus = (value, timeSlot) => {
  const isFasting = timeSlot === 'fasting' || timeSlot === 'bedtime';
  if (isFasting) {
    if (value <= 130) return 'normal';
    if (value <= 180) return 'elevated';
    return 'high';
  } else {
    if (value <= 180) return 'normal';
    if (value <= 230) return 'elevated';
    return 'high';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'normal': return 'text-green-600 bg-green-100';
    case 'elevated': return 'text-yellow-600 bg-yellow-100';
    case 'high': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const { unit } = useBloodSugarUnit();
  const { getBloodSugarReadings } = usePatientContext();
  const { getPatientAppointments } = useAppointmentContext();

  const [readings, setReadings] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  const uhid = currentUser?.uhid;
  const patientName = currentUser?.name || 'Patient';

  const loadData = useCallback(async () => {
    if (!uhid) return;
    setLoading(true);
    try {
      const [bloodSugar, appointments] = await Promise.all([
        getBloodSugarReadings(uhid, { limit: 50 }),
        getPatientAppointments(uhid),
      ]);

      // Sort readings newest first (by date, then createdAt as tiebreak)
      const sorted = [...(bloodSugar || [])].sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setReadings(sorted);

      // Find next upcoming appointment (not cancelled, date >= today)
      const todayStr = new Date().toISOString().split('T')[0];
      const upcoming = (appointments || [])
        .filter(a => a.date >= todayStr && a.status !== 'cancelled')
        .sort((a, b) => a.date.localeCompare(b.date));
      setNextAppointment(upcoming[0] || null);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uhid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived stats
  const weekAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })();

  const thisWeekReadings = readings.filter(r => r.date >= weekAgoStr);
  const weeklyAverage = thisWeekReadings.length > 0
    ? Math.round(thisWeekReadings.reduce((s, r) => s + Number(r.value), 0) / thisWeekReadings.length)
    : null;
  const daysLoggedThisWeek = new Set(thisWeekReadings.map(r => r.date)).size;
  const lastReading = readings[0] || null;
  const recentReadings = readings.slice(0, 5).map(r => ({
    ...r,
    status: getBloodSugarStatus(Number(r.value), r.timeSlot),
    typeLabel: SLOT_LABELS[r.timeSlot] || r.timeSlot,
    displayTime: r.createdAt
      ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
          Welcome back, {patientName.split(' ')[0]}!
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">UHID: {uhid || '—'}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Last Reading */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Last Reading</p>
          {lastReading ? (
            <>
              <p className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2">{toDisplay(lastReading.value, unit)}</p>
              <p className="text-xs opacity-75">{unit}</p>
              <p className="text-xs sm:text-sm mt-2 sm:mt-3 opacity-90 leading-tight">
                {SLOT_LABELS[lastReading.timeSlot] || lastReading.timeSlot}
                <br className="sm:hidden" />
                <span className="hidden sm:inline"> &middot; </span>
                {formatDate(lastReading.date)}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold mt-1 sm:mt-2">—</p>
              <p className="text-xs opacity-75 mt-1">No readings yet</p>
            </>
          )}
        </div>

        {/* Weekly Average */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Weekly Avg</p>
          {weeklyAverage !== null ? (
            <>
              <p className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2">{toDisplay(weeklyAverage, unit)}</p>
              <p className="text-xs opacity-75">{unit}</p>
            </>
          ) : (
            <p className="text-2xl font-bold mt-1 sm:mt-2">—</p>
          )}
          <p className="text-xs sm:text-sm mt-2 sm:mt-3 opacity-90">Last 7 days</p>
        </div>

        {/* Days Logged */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Days Logged</p>
          <p className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2">
            {daysLoggedThisWeek}<span className="text-lg sm:text-2xl">/7</span>
          </p>
          <p className="text-xs opacity-75">This Week</p>
          <p className="text-xs sm:text-sm mt-2 sm:mt-3 opacity-90">
            {daysLoggedThisWeek >= 5 ? 'Keep it up!' : daysLoggedThisWeek > 0 ? 'Log daily!' : 'Start logging!'}
          </p>
        </div>

        {/* Next Appointment */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Next Appt.</p>
          {nextAppointment ? (
            <>
              <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 leading-tight">{formatDate(nextAppointment.date)}</p>
              <p className="text-xs opacity-75">{nextAppointment.timeSlot}</p>
              <p className="text-xs sm:text-sm mt-2 sm:mt-3 opacity-90 leading-tight truncate">
                {nextAppointment.doctorName || nextAppointment.doctor?.name || 'Doctor'}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold mt-1 sm:mt-2 leading-tight">None</p>
              <p className="text-xs opacity-90 mt-2">No upcoming appointments</p>
            </>
          )}
        </div>
      </div>

      {/* Recent Readings */}
      <Card title="Recent Blood Sugar Readings">
        {recentReadings.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No blood sugar readings yet.</p>
            <Button
              className="mt-4"
              onClick={() => navigate('/patient/log-blood-sugar')}
            >
              Log Your First Reading
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-3">
              {recentReadings.map((reading, index) => (
                <div key={reading.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {toDisplay(reading.value, unit)} <span className="font-normal text-gray-500 text-xs">{unit}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{reading.typeLabel} &middot; {reading.displayTime}</p>
                    <p className="text-xs text-gray-400">{formatDate(reading.date)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(reading.status)}`}>
                    {reading.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Reading</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentReadings.map((reading, index) => (
                    <tr key={reading.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{formatDate(reading.date)}</td>
                      <td className="px-4 py-3 text-sm">{reading.displayTime}</td>
                      <td className="px-4 py-3 text-sm">{reading.typeLabel}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{toDisplay(reading.value, unit)} {unit}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(reading.status)}`}>
                          {reading.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-center">
              <Button onClick={() => navigate('/patient/trends')} variant="outline">
                View Full History
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Quick Actions + Health Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/patient/log-blood-sugar')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition border-l-4 border-blue-500"
            >
              <Droplet className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-blue-700 text-sm">Log Blood Sugar</p>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={() => navigate('/patient/book-appointment')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-lg transition border-l-4 border-green-500"
            >
              <CalendarCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-green-700 text-sm">Book Appointment</p>
              </div>
              <ChevronRight className="w-4 h-4 text-green-400" />
            </button>
            <button
              onClick={() => navigate('/patient/trends')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-lg transition border-l-4 border-purple-500"
            >
              <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-purple-700 text-sm">View Trends</p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400" />
            </button>
            <button
              onClick={() => navigate('/patient/upload-results')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 rounded-lg transition border-l-4 border-orange-500"
            >
              <Activity className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-orange-700 text-sm">Upload Results</p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </button>
          </div>
        </Card>

        {/* Health Tips */}
        <Card title="Health Tips" className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 sm:p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="font-semibold text-blue-700 text-sm">Stay Hydrated</p>
              </div>
              <p className="text-xs text-blue-600">Drink at least 8 glasses of water daily</p>
            </div>
            <div className="p-3 sm:p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="font-semibold text-green-700 text-sm">Regular Exercise</p>
              </div>
              <p className="text-xs text-green-600">30 minutes of walking can help control blood sugar</p>
            </div>
            <div className="p-3 sm:p-4 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Pill className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <p className="font-semibold text-purple-700 text-sm">Medication</p>
              </div>
              <p className="text-xs text-purple-600">Take your medications as prescribed</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard;
