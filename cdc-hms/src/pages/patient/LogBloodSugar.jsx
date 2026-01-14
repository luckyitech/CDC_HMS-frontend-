import { useState } from "react";
import { Sunrise, Coffee, Clock3, Utensils, Clock6, Moon, BedDouble, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from '../../contexts/PatientContext';

const LogBloodSugar = () => {
  const { addBloodSugarReading, getBloodSugarReadings } = usePatientContext();
  
  // TODO: In production, get this from logged-in patient
  // For demo, we'll use CDC001 (John Doe)
  const currentPatientUHID = "CDC001";
  
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Mock logged dates (dates that have entries)
  const [loggedDates] = useState([
    "2024-12-02",
    "2024-12-03",
    "2024-12-04",
    "2024-12-05",
    "2024-12-06",
    "2024-12-07",
    "2024-12-08",
  ]);

  // Blood sugar entries for selected date
  const [readings, setReadings] = useState({
    fasting: "",
    afterBreakfast: "",
    beforeLunch: "",
    afterLunch: "",
    beforeDinner: "",
    afterDinner: "",
    beforeBedtime: "",
  });

  const [notes, setNotes] = useState("");

  const timeSlots = [
    {
      key: "fasting",
      label: "Fasting (Morning)",
      icon: Sunrise,
      time: "6:00-8:00 AM",
    },
    {
      key: "afterBreakfast",
      label: "After Breakfast",
      icon: Coffee,
      time: "2 hrs after meal",
    },
    {
      key: "beforeLunch",
      label: "Before Lunch",
      icon: Clock3,
      time: "12:00-1:00 PM",
    },
    {
      key: "afterLunch",
      label: "After Lunch",
      icon: Utensils,
      time: "2 hrs after meal",
    },
    {
      key: "beforeDinner",
      label: "Before Dinner",
      icon: Clock6,
      time: "6:00-7:00 PM",
    },
    {
      key: "afterDinner",
      label: "After Dinner",
      icon: Moon,
      time: "2 hrs after meal",
    },
    {
      key: "beforeBedtime",
      label: "Before Bedtime",
      icon: BedDouble,
      time: "9:00-11:00 PM",
    },
  ];

  const handleReadingChange = (key, value) => {
    // Only allow numbers
    if (value === "" || /^\d+$/.test(value)) {
      setReadings({ ...readings, [key]: value });
    }
  };

  const handleSave = (slotKey) => {
    const value = readings[slotKey];
    if (!value) {
      toast.error("Please enter a blood sugar value");
      return;
    }
    toast.success(
      `Saved ${timeSlots.find((s) => s.key === slotKey).label}: ${value} mg/dL`,
      { duration: 3000, icon: '✅' }
    );
  };

  const handleSaveAll = () => {
    // eslint-disable-next-line no-unused-vars
    const enteredReadings = Object.entries(readings).filter(([_, value]) => value !== '');
    if (enteredReadings.length === 0) {
      toast.error("Please enter at least one reading", { icon: '⚠️' });
      return;
    }
    
    // Create reading object with date and values (in mg/dL)
    const reading = {
      date: selectedDate,
      fasting: readings.fasting ? parseFloat(readings.fasting) : null,
      afterBreakfast: readings.afterBreakfast ? parseFloat(readings.afterBreakfast) : null,
      beforeLunch: readings.beforeLunch ? parseFloat(readings.beforeLunch) : null,
      afterLunch: readings.afterLunch ? parseFloat(readings.afterLunch) : null,
      beforeDinner: readings.beforeDinner ? parseFloat(readings.beforeDinner) : null,
      afterDinner: readings.afterDinner ? parseFloat(readings.afterDinner) : null,
      beforeBedtime: readings.beforeBedtime ? parseFloat(readings.beforeBedtime) : null,
    };
    
    // Save to PatientContext
    addBloodSugarReading(currentPatientUHID, reading);
    
    toast.success(
      `Successfully saved ${enteredReadings.length} reading(s) for ${new Date(selectedDate).toLocaleDateString()}`,
      { 
        duration: 4000,
        icon: '🎉',
        style: {
          background: '#10b981',
          color: '#fff',
        }
      }
    );
    
    toast('Your doctor can now view this data in Glycemic Charts', {
      duration: 3000,
      icon: '👨‍⚕️',
    });
    
    // Clear form
    setReadings({
      fasting: "",
      afterBreakfast: "",
      beforeLunch: "",
      afterLunch: "",
      beforeDinner: "",
      afterDinner: "",
      beforeBedtime: "",
    });
  };


  const getReadingColor = (value) => {
    if (!value) return "border-gray-300";
    const numValue = parseInt(value);
    if (numValue < 100) return "border-green-500 bg-green-50";
    if (numValue < 140) return "border-yellow-500 bg-yellow-50";
    return "border-red-500 bg-red-50";
  };

  const getStatusText = (value) => {
    if (!value) return "";
    const numValue = parseInt(value);
    if (numValue < 100) return "âœ… Normal";
    if (numValue < 140) return "âš ï¸ Elevated";
    return "âŒ High";
  };

  // Generate calendar days for current month
  const generateCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      days.push({
        day,
        dateStr,
        isLogged: loggedDates.includes(dateStr),
        isToday: dateStr === new Date().toISOString().split("T")[0],
        isSelected: dateStr === selectedDate,
      });
    }

    return days;
  };

  const calendarDays = generateCalendar();

  return (
    <div>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#374151',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '0.5rem',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">
        Log Blood Sugar
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <Card title="📅 Select Date">
            <div className="mb-4">
              <input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* Mini Calendar */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center font-bold text-lg mb-3">
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-xs font-semibold text-gray-600"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayObj, index) => {
                  if (!dayObj) {
                    return <div key={index} className="aspect-square"></div>;
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(dayObj.dateStr)}
                      disabled={new Date(dayObj.dateStr) > new Date()}
                      className={`aspect-square rounded-lg text-sm font-semibold transition-all ${
                        dayObj.isSelected
                          ? "bg-primary text-white shadow-lg"
                          : dayObj.isToday
                          ? "bg-blue-100 text-primary border-2 border-primary"
                          : dayObj.isLogged
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      } ${
                        new Date(dayObj.dateStr) > new Date()
                          ? "opacity-30 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded border border-green-300"></div>
                  <span className="text-gray-600">Logged</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded border-2 border-primary"></div>
                  <span className="text-gray-600">Today</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Reading Entry */}
        <div className="lg:col-span-2">
          <Card
            title={`📝 Record Readings - ${new Date(
              selectedDate
            ).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`}
          >
            <div className="space-y-3 sm:space-y-4">
              {timeSlots.map((slot) => (
                <div
                  key={slot.key}
                  className="p-3 sm:p-4 border-2 rounded-lg hover:shadow-md transition-all"
                >
                  {/* Header - Compact on mobile */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <slot.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-xs sm:text-sm lg:text-base truncate">
                        {slot.label}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{slot.time}</p>
                    </div>
                  </div>

                  {/* Input and Save - Better Mobile Layout */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={readings[slot.key]}
                      onChange={(e) => handleReadingChange(slot.key, e.target.value)}
                      placeholder="0"
                      className={`w-20 sm:w-24 px-3 py-2 text-center text-lg sm:text-xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 ${getReadingColor(readings[slot.key])}`}
                      maxLength="3"
                    />
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">mg/dL</span>
                    <Button 
                      onClick={() => handleSave(slot.key)}
                      disabled={!readings[slot.key]}
                      className="text-xs sm:text-sm py-2 px-3 sm:px-4 ml-auto"
                    >
                      Save
                    </Button>
                  </div>

                  {/* Status Text */}
                  {readings[slot.key] && (
                    <div className="text-xs sm:text-sm font-semibold mt-2 text-right">
                      {getStatusText(readings[slot.key])}
                    </div>
                  )}
                </div>
              ))}
              {/* Save All Button - Better mobile sizing */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                <Button onClick={handleSaveAll} className="flex-1 w-full text-sm sm:text-base py-2 sm:py-3">
                   Save All Readings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReadings({
                      fasting: "",
                      afterBreakfast: "",
                      beforeLunch: "",
                      afterLunch: "",
                      beforeDinner: "",
                      afterDinner: "",
                      beforeBedtime: "",
                    });
                    setNotes("");
                  }}
                  className="flex-1 w-full text-sm sm:text-base py-2 sm:py-3"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Tips */}
          <Card title="💡 Tips for Accurate Readings" className="mt-6">
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span>
                  <strong>Fasting:</strong> Measure before eating or drinking
                  (except water) in the morning
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>
                  <strong>After Meals:</strong> Measure exactly 2 hours after
                  the first bite
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>
                  <strong>Wash Hands:</strong> Always wash hands before testing
                  to avoid contamination
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>
                  <strong>Consistency:</strong> Try to test at the same times
                  each day
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LogBloodSugar;