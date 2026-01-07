import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';

const ViewTrends = () => {
  const [filterPeriod, setFilterPeriod] = useState('7days');

  // Mock patient blood sugar data
  const getBloodSugarData = (period) => {
    const data = {
      '7days': [
        { date: '2024-12-02', avgReading: 148, status: 'elevated' },
        { date: '2024-12-03', avgReading: 142, status: 'elevated' },
        { date: '2024-12-04', avgReading: 156, status: 'high' },
        { date: '2024-12-05', avgReading: 151, status: 'high' },
        { date: '2024-12-06', avgReading: 145, status: 'elevated' },
        { date: '2024-12-07', avgReading: 138, status: 'normal' },
        { date: '2024-12-08', avgReading: 149, status: 'elevated' },
      ],
      '14days': Array.from({ length: 14 }, (_, i) => ({
        date: new Date(2024, 10, 25 + i).toISOString().split('T')[0],
        avgReading: 130 + Math.floor(Math.random() * 30),
        status: Math.random() > 0.6 ? 'elevated' : Math.random() > 0.3 ? 'normal' : 'high',
      })),
      '30days': Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2024, 10, 9 + i).toISOString().split('T')[0],
        avgReading: 130 + Math.floor(Math.random() * 30),
        status: Math.random() > 0.6 ? 'elevated' : Math.random() > 0.3 ? 'normal' : 'high',
      })),
    };
    return data[period] || data['7days'];
  };

  const bloodSugarData = getBloodSugarData(filterPeriod);

  // Calculate statistics
  const calculateStats = () => {
    const readings = bloodSugarData.map(d => d.avgReading);
    const avg = Math.round(readings.reduce((a, b) => a + b, 0) / readings.length);
    const min = Math.min(...readings);
    const max = Math.max(...readings);
    const normalDays = bloodSugarData.filter(d => d.status === 'normal').length;
    
    return { avg, min, max, normalDays, totalDays: bloodSugarData.length };
  };

  const stats = calculateStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'elevated': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-700 border-green-300';
      case 'elevated': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const maxValue = Math.max(...bloodSugarData.map(d => d.avgReading), 200);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">My Blood Sugar Trends</h2>
        <div className="flex gap-2">
          {['7days', '14days', '30days'].map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base ${
                filterPeriod === period
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period === '7days' ? '7 Days' : period === '14days' ? '14 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Average</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-2">{stats.avg}</p>
          <p className="text-[10px] sm:text-xs opacity-75 mt-1">mg/dL</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Lowest</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-2">{stats.min}</p>
          <p className="text-[10px] sm:text-xs opacity-75 mt-1">mg/dL</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Highest</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-2">{stats.max}</p>
          <p className="text-[10px] sm:text-xs opacity-75 mt-1">mg/dL</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Normal Days</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-2">{stats.normalDays}/{stats.totalDays}</p>
          <p className="text-[10px] sm:text-xs opacity-75 mt-1">Days</p>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <p className="text-xs sm:text-sm opacity-90">Control Rate</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-2">
            {Math.round((stats.normalDays / stats.totalDays) * 100)}%
          </p>
          <p className="text-[10px] sm:text-xs opacity-75 mt-1">Success</p>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <Card title="📊 Daily Average Blood Sugar">
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-xs sm:text-sm text-gray-700">
            <strong>Target Range:</strong> Keep your average blood sugar between <span className="text-green-600 font-bold">70-130 mg/dL</span> (fasting) 
            and below <span className="text-green-600 font-bold">180 mg/dL</span> (after meals) for good control.
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {bloodSugarData.map((day, index) => (
            <div key={index} className="flex items-center gap-2 sm:gap-4">
              <div className="w-16 sm:w-24 text-xs sm:text-sm font-medium text-gray-600 flex-shrink-0">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              
              <div className="flex-1 relative">
                <div className="w-full bg-gray-200 rounded-full h-8 sm:h-10 overflow-hidden">
                  <div
                    className={`${getStatusColor(day.status)} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 sm:pr-3`}
                    style={{ width: `${(day.avgReading / maxValue) * 100}%` }}
                  >
                    <span className="text-white font-bold text-xs sm:text-sm">{day.avgReading}</span>
                  </div>
                </div>
              </div>
              
              <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border capitalize ${getStatusBadge(day.status)} flex-shrink-0`}>
                {day.status}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600">Normal (&lt;130 mg/dL)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">Elevated (130-180 mg/dL)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-600">High (&gt;180 mg/dL)</span>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card title="📋 Detailed Readings" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Avg Reading</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bloodSugarData.map((day, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className="text-base sm:text-lg font-bold text-gray-800">
                      {day.avgReading} <span className="text-xs sm:text-sm text-gray-500">mg/dL</span>
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusBadge(day.status)}`}>
                      {day.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Health Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
        <Card title="💡 Your Progress">
          <div className="space-y-3 sm:space-y-4">
            {stats.normalDays >= stats.totalDays * 0.7 ? (
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <p className="text-xs sm:text-sm text-green-800">
                  <strong>Excellent!</strong> You're maintaining good control {Math.round((stats.normalDays / stats.totalDays) * 100)}% of the time. Keep it up!
                </p>
              </div>
            ) : stats.normalDays >= stats.totalDays * 0.5 ? (
              <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <p className="text-xs sm:text-sm text-yellow-800">
                  <strong>Good progress!</strong> You're in control {Math.round((stats.normalDays / stats.totalDays) * 100)}% of the time. Let's aim for 70% or higher.
                </p>
              </div>
            ) : (
              <div className="p-3 sm:p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <p className="text-xs sm:text-sm text-red-800">
                  <strong>Needs Attention:</strong> Your blood sugar is in range only {Math.round((stats.normalDays / stats.totalDays) * 100)}% of the time. Please consult your doctor.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card title="🎯 Next Steps">
          <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">▸</span>
              <span>Continue logging your blood sugar daily</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">▸</span>
              <span>Take your medications as prescribed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">▸</span>
              <span>Maintain a balanced diet and exercise regularly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">▸</span>
              <span>Schedule your next appointment with your doctor</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ViewTrends;