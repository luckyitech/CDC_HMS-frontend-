import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Stethoscope, Users, Clock, ChevronRight } from 'lucide-react';
import analyticsService from '../../../services/analyticsService';

const SECTIONS = [
  {
    title:       'Doctor Performance',
    description: 'Patients seen per doctor, average consultation times, and patient distribution across doctors.',
    icon:        Stethoscope,
    color:       'from-blue-500 to-blue-600',
    iconBg:      'bg-blue-100',
    iconColor:   'text-blue-600',
    path:        '/admin/analytics/doctors',
  },
  {
    title:       'Staff & Triage',
    description: 'Daily triage volume, triage performance per staff member, and average triage durations.',
    icon:        Users,
    color:       'from-purple-500 to-purple-600',
    iconBg:      'bg-purple-100',
    iconColor:   'text-purple-600',
    path:        '/admin/analytics/staff',
  },
  {
    title:       'Consultation Timing',
    description: 'When consultations happen during the day, how long they take, and duration distribution.',
    icon:        Clock,
    color:       'from-green-500 to-green-600',
    iconBg:      'bg-green-100',
    iconColor:   'text-green-600',
    path:        '/admin/analytics/consultations',
  },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_START   = `${CURRENT_YEAR}-01-01`;
const YEAR_END     = `${CURRENT_YEAR}-12-31`;

export default function AnalyticsOverview() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsService.getTriageMetrics(YEAR_START, YEAR_END),
      analyticsService.getConsultationTiming(YEAR_START, YEAR_END),
      analyticsService.getDoctorPerformance(YEAR_START, YEAR_END),
    ]).then(([triage, timing, doctors]) => {
      setSummary({
        totalTriages:           triage.data?.totalTriages ?? 0,
        totalConsultations:     timing.data?.totalConsultations ?? 0,
        avgConsultationMinutes: timing.data?.avgConsultationMinutes ?? null,
        activeDoctors:          doctors.data?.doctors?.length ?? 0,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart2 className="text-blue-600" size={26} />
          Analytics
        </h1>
        <p className="text-gray-500 text-sm mt-1">Clinic performance overview — {CURRENT_YEAR}</p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Total Consultations</p>
          <p className="text-4xl font-bold mt-2">{loading ? '…' : summary?.totalConsultations}</p>
          <p className="text-sm mt-3 opacity-75">Current year</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Avg Consultation</p>
          <p className="text-4xl font-bold mt-2">
            {loading ? '…' : summary?.avgConsultationMinutes != null ? `${summary.avgConsultationMinutes} min` : '—'}
          </p>
          <p className="text-sm mt-3 opacity-75">Per patient</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Total Triages</p>
          <p className="text-4xl font-bold mt-2">{loading ? '…' : summary?.totalTriages}</p>
          <p className="text-sm mt-3 opacity-75">Current year</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Active Doctors</p>
          <p className="text-4xl font-bold mt-2">{loading ? '…' : summary?.activeDoctors}</p>
          <p className="text-sm mt-3 opacity-75">With consultations</p>
        </div>
      </div>

      {/* Section navigation cards */}
      <div>
        <h2 className="text-lg font-bold text-gray-700 mb-4">Detailed Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.path}
                onClick={() => navigate(s.path)}
                className="bg-white rounded-xl shadow-md p-6 text-left hover:shadow-lg transition-all duration-200 group border border-gray-100 hover:border-blue-200"
              >
                <div className={`inline-flex p-3 rounded-xl ${s.iconBg} mb-4`}>
                  <Icon size={24} className={s.iconColor} />
                </div>
                <h3 className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {s.title}
                </h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{s.description}</p>
                <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details <ChevronRight size={16} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
