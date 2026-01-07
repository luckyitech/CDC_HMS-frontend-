import { useState } from "react";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";

const LogBloodSugar = () => {
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
      icon: "🌅",
      time: "6:00-8:00 AM",
    },
    {
      key: "afterBreakfast",
      label: "After Breakfast",
      icon: "🍳",
      time: "2 hrs after meal",
    },
    {
      key: "beforeLunch",
      label: "Before Lunch",
      icon: "🕐",
      time: "12:00-1:00 PM",
    },
    {
      key: "afterLunch",
      label: "After Lunch",
      icon: "🍽️",
      time: "2 hrs after meal",
    },
    {
      key: "beforeDinner",
      label: "Before Dinner",
      icon: "🕖",
      time: "6:00-7:00 PM",
    },
    {
      key: "afterDinner",
      label: "After Dinner",
      icon: "🌙",
      time: "2 hrs after meal",
    },
    {
      key: "beforeBedtime",
      label: "Before Bedtime",
      icon: "😴",
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
      alert("Please enter a blood sugar value");
      return;
    }
    alert(
      `Saved ${timeSlots.find((s) => s.key === slotKey).label}: ${value} mg/dL`
    );
  };

  const handleSaveAll = () => {
    // eslint-disable-next-line no-unused-vars
    const enteredReadings = Object.entries(readings).filter(([_, value]) => value !== '');
    if (enteredReadings.length === 0) {
      alert("Please enter at least one reading");
      return;
    }
    alert(`Saved ${enteredReadings.length} reading(s) for ${selectedDate}`);
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
    if (numValue < 100) return "✅ Normal";
    if (numValue < 140) return "⚠️ Elevated";
    return "❌ High";
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
                    <span className="text-xl sm:text-2xl lg:text-3xl">{slot.icon}</span>
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

              {/* Notes */}
              <div className="mt-4 sm:mt-6">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  📝 Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about how you're feeling, meals, exercise, medication changes, etc."
                  rows="4"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                />
              </div>

              {/* Save All Button - Better mobile sizing */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                <Button onClick={handleSaveAll} className="flex-1 w-full text-sm sm:text-base py-2 sm:py-3">
                  💾 Save All Readings
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
                  🔄 Clear All
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Tips */}
          <Card title="💡 Tips for Accurate Readings" className="mt-6">
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>
                  <strong>Fasting:</strong> Measure before eating or drinking
                  (except water) in the morning
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>
                  <strong>After Meals:</strong> Measure exactly 2 hours after
                  the first bite
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>
                  <strong>Wash Hands:</strong> Always wash hands before testing
                  to avoid contamination
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
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