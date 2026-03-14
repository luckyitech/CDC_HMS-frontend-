import { useState, useEffect, useReducer } from "react";
import { Sunrise, Coffee, Clock3, Utensils, Clock6, Moon, BedDouble, Calendar, CheckCircle, AlertCircle, ClipboardList, Lightbulb, ArrowLeftRight, ChevronDown, ChevronUp, Pencil, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from "../../components/shared/Card";
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';
import { useBloodSugarUnit, toMgDL, toDisplay } from '../../hooks/useBloodSugarUnit';

const SLOT_TO_BACKEND = {
  fasting:        "fasting",
  afterBreakfast: "breakfast",
  beforeLunch:    "beforeLunch",
  afterLunch:     "afterLunch",
  beforeDinner:   "beforeDinner",
  afterDinner:    "afterDinner",
  beforeBedtime:  "bedtime",
};

const BACKEND_TO_SLOT = {
  fasting:      "fasting",
  breakfast:    "afterBreakfast",
  beforeLunch:  "beforeLunch",
  afterLunch:   "afterLunch",
  beforeDinner: "beforeDinner",
  afterDinner:  "afterDinner",
  bedtime:      "beforeBedtime",
};

const EMPTY_READINGS = {
  fasting: "", afterBreakfast: "", beforeLunch: "",
  afterLunch: "", beforeDinner: "", afterDinner: "", beforeBedtime: "",
};

const INITIAL_STATE = {
  readings:     { ...EMPTY_READINGS },
  savedMgDL:    {},
  savedSlots:   new Set(),
  editingSlots: new Set(),
  savingSlots:  new Set(),
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESET_DATE':
      return {
        readings:     { ...EMPTY_READINGS },
        savedMgDL:    {},
        savedSlots:   new Set(),
        editingSlots: new Set(),
        savingSlots:  new Set(),
      };
    case 'LOAD_SAVED':
      return { ...state, savedMgDL: action.savedMgDL, savedSlots: action.savedSlots };
    case 'CHANGE_READING':
      return { ...state, readings: { ...state.readings, [action.key]: action.value } };
    case 'START_EDITING': {
      return {
        ...state,
        readings:     { ...state.readings, [action.key]: action.displayVal },
        editingSlots: new Set([...state.editingSlots, action.key]),
      };
    }
    case 'CANCEL_EDITING': {
      const editingSlots = new Set(state.editingSlots);
      editingSlots.delete(action.key);
      return { ...state, readings: { ...state.readings, [action.key]: '' }, editingSlots };
    }
    case 'START_SAVING':
      return { ...state, savingSlots: new Set([...state.savingSlots, action.key]) };
    case 'SAVE_SUCCESS': {
      const savedSlots   = new Set([...state.savedSlots, action.key]);
      const editingSlots = new Set(state.editingSlots); editingSlots.delete(action.key);
      const savingSlots  = new Set(state.savingSlots);  savingSlots.delete(action.key);
      return {
        ...state,
        savedMgDL:    { ...state.savedMgDL, [action.key]: action.mgdlValue },
        savedSlots,
        editingSlots,
        savingSlots,
        readings:     { ...state.readings, [action.key]: '' },
      };
    }
    case 'SAVE_FAIL': {
      const savingSlots = new Set(state.savingSlots);
      savingSlots.delete(action.key);
      return { ...state, savingSlots };
    }
    default:
      return state;
  }
}

const LogBloodSugar = () => {
  const { addBloodSugarReading, getBloodSugarReadings } = usePatientContext();
  const { currentUser } = useUserContext();
  const { unit, changeUnit } = useBloodSugarUnit();

  const currentPatientUHID = currentUser?.uhid;

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loggedDates, setLoggedDates] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { readings, savedMgDL, savedSlots, editingSlots, savingSlots } = state;

  // Load logged dates for calendar highlights
  useEffect(() => {
    if (!currentPatientUHID) return;
    getBloodSugarReadings(currentPatientUHID).then((data) => {
      const dates = [...new Set((data || []).map((r) => r.date))];
      setLoggedDates(dates);
    });
  }, [currentPatientUHID]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload readings whenever the selected date changes
  useEffect(() => {
    if (!currentPatientUHID) return;
    let cancelled = false;

    dispatch({ type: 'RESET_DATE' });

    getBloodSugarReadings(currentPatientUHID, {
      startDate: selectedDate,
      endDate: selectedDate,
    }).then((data) => {
      if (cancelled) return;
      const savedMgDL = {};
      const savedSlots = new Set();
      (data || []).filter((r) => (r.date || '').slice(0, 10) === selectedDate).forEach((r) => {
        const frontendKey = BACKEND_TO_SLOT[r.timeSlot];
        if (frontendKey && r.value != null) {
          savedMgDL[frontendKey] = r.value;
          savedSlots.add(frontendKey);
        }
      });
      dispatch({ type: 'LOAD_SAVED', savedMgDL, savedSlots });
    });

    return () => { cancelled = true; };
  }, [selectedDate, currentPatientUHID]); // eslint-disable-line react-hooks/exhaustive-deps

  const timeSlots = [
    { key: "fasting",        label: "Fasting",         icon: Sunrise,   time: "Before eating, 6–8 AM"  },
    { key: "afterBreakfast", label: "After Breakfast",  icon: Coffee,    time: "2 hrs after breakfast"   },
    { key: "beforeLunch",    label: "Before Lunch",     icon: Clock3,    time: "Around 12–1 PM"          },
    { key: "afterLunch",     label: "After Lunch",      icon: Utensils,  time: "2 hrs after lunch"       },
    { key: "beforeDinner",   label: "Before Dinner",    icon: Clock6,    time: "Around 6–7 PM"           },
    { key: "afterDinner",    label: "After Dinner",     icon: Moon,      time: "2 hrs after dinner"      },
    { key: "beforeBedtime",  label: "Before Bedtime",   icon: BedDouble, time: "Around 9–11 PM"          },
  ];

  const handleReadingChange = (key, value) => {
    const pattern = unit === 'mmol/L' ? /^\d*\.?\d{0,1}$/ : /^\d{0,3}$/;
    if (value === "" || pattern.test(value)) {
      dispatch({ type: 'CHANGE_READING', key, value });
    }
  };

  const startEditing = (slotKey) => {
    const displayVal = savedMgDL[slotKey] != null
      ? String(toDisplay(savedMgDL[slotKey], unit))
      : "";
    dispatch({ type: 'START_EDITING', key: slotKey, displayVal });
  };

  const cancelEditing = (slotKey) => {
    dispatch({ type: 'CANCEL_EDITING', key: slotKey });
  };

  const handleSave = async (slotKey) => {
    const value = readings[slotKey];
    if (!value) {
      toast.error("Please enter a blood sugar value");
      return;
    }
    if (!currentPatientUHID) {
      toast.error("Patient not identified. Please log in again.");
      return;
    }

    dispatch({ type: 'START_SAVING', key: slotKey });

    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const mgdlValue = toMgDL(value, unit);

    const result = await addBloodSugarReading(currentPatientUHID, {
      date:     selectedDate,
      timeSlot: SLOT_TO_BACKEND[slotKey],
      value:    mgdlValue,
      time,
    });

    if (result?.success) {
      dispatch({ type: 'SAVE_SUCCESS', key: slotKey, mgdlValue });
      const slotLabel = timeSlots.find((s) => s.key === slotKey).label;
      toast.success(`${slotLabel}: ${value} ${unit} saved`, {
        duration: 3000,
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      });
    } else {
      dispatch({ type: 'SAVE_FAIL', key: slotKey });
      toast.error(result?.message || "Failed to save. Please try again.");
    }
  };

  const getStatus = (mgdl) => {
    if (mgdl == null) return null;
    if (mgdl < 100) return "Normal";
    if (mgdl < 140) return "Elevated";
    return "High";
  };

  const getStatusFromInput = (value) => {
    if (!value) return null;
    return getStatus(toMgDL(value, unit));
  };

  const getCardBorder = (slotKey, isConfirmed) => {
    const s = isConfirmed ? getStatus(savedMgDL[slotKey]) : getStatusFromInput(readings[slotKey]);
    if (s === 'Normal')   return "border-green-400";
    if (s === 'Elevated') return "border-yellow-400";
    if (s === 'High')     return "border-red-400";
    return "border-gray-200";
  };

  const getInputColor = (value) => {
    const s = getStatusFromInput(value);
    if (s === 'Normal')   return "border-green-500 bg-green-50 text-green-800";
    if (s === 'Elevated') return "border-yellow-500 bg-yellow-50 text-yellow-800";
    if (s === 'High')     return "border-red-500 bg-red-50 text-red-800";
    return "border-gray-300 bg-white text-gray-800";
  };

  const getStatusBadge = (s) => {
    if (s === 'Normal')   return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Normal</span>;
    if (s === 'Elevated') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Elevated</span>;
    if (s === 'High')     return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">High</span>;
    return null;
  };

  // Calendar helpers
  const generateCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        day,
        dateStr,
        isLogged:   loggedDates.includes(dateStr),
        isToday:    dateStr === new Date().toISOString().split("T")[0],
        isSelected: dateStr === selectedDate,
      });
    }
    return days;
  };

  const calendarDays = generateCalendar();
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const displayDate = isToday
    ? "Today"
    : new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Log Blood Sugar</h2>
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          {['mg/dL', 'mmol/L'].map((u) => (
            <button
              key={u}
              onClick={() => {
                if (unit !== u) {
                  changeUnit(u);
                  toast(`Log your blood sugar readings in ${u}`, {
                    duration: 2000,
                    icon: <ArrowLeftRight className="w-4 h-4 text-primary" />,
                  });
                }
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${unit === u ? 'bg-white text-primary shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: compact date bar */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-primary rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-bold text-gray-800 text-base">{displayDate}</span>
            {isToday && <span className="px-2 py-0.5 bg-primary text-white text-xs font-semibold rounded-full">Today</span>}
          </div>
          <div className="flex items-center gap-1 text-primary text-sm font-semibold">
            <Pencil className="w-4 h-4" />
            <span>Change</span>
            {showCalendar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showCalendar && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-md p-4">
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => { setSelectedDate(e.target.value); setShowCalendar(false); }}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary mb-3"
            />
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-center font-bold mb-2 text-sm">
                {new Date(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["S","M","T","W","T","F","S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-gray-500">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayObj, index) => {
                  if (!dayObj) return <div key={index} className="aspect-square" />;
                  return (
                    <button
                      key={index}
                      onClick={() => { setSelectedDate(dayObj.dateStr); setShowCalendar(false); }}
                      disabled={new Date(dayObj.dateStr) > new Date()}
                      className={`aspect-square rounded-lg text-xs font-semibold transition-all ${
                        dayObj.isSelected ? "bg-primary text-white shadow" :
                        dayObj.isToday    ? "bg-blue-100 text-primary border-2 border-primary" :
                        dayObj.isLogged   ? "bg-green-100 text-green-700" :
                                            "bg-white text-gray-700 hover:bg-gray-100"
                      } ${new Date(dayObj.dateStr) > new Date() ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded inline-block border border-green-300" /> Logged</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 rounded inline-block border-2 border-primary" /> Today</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: progress bar */}
      <div className="lg:hidden mb-4 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Readings saved today</span>
          <span className="text-sm font-bold text-primary">{savedSlots.size} / 7</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
            style={{ width: `${(savedSlots.size / 7) * 100}%` }}
          />
        </div>
        {savedSlots.size === 7 && (
          <p className="text-xs text-green-600 font-semibold mt-1.5">All readings saved for today!</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calendar - desktop sidebar */}
        <div className="hidden lg:block lg:col-span-1">
          <Card title={<span className="flex items-center gap-2"><Calendar className="w-5 h-5" />Select Date</span>}>
            <div className="mb-4">
              <input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center font-bold text-lg mb-3">
                {new Date(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["S","M","T","W","T","F","S"].map((day, i) => (
                  <div key={i} className="text-center text-xs font-semibold text-gray-600">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayObj, index) => {
                  if (!dayObj) return <div key={index} className="aspect-square" />;
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(dayObj.dateStr)}
                      disabled={new Date(dayObj.dateStr) > new Date()}
                      className={`aspect-square rounded-lg text-sm font-semibold transition-all ${
                        dayObj.isSelected ? "bg-primary text-white shadow-lg" :
                        dayObj.isToday    ? "bg-blue-100 text-primary border-2 border-primary" :
                        dayObj.isLogged   ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                            "bg-white text-gray-700 hover:bg-gray-100"
                      } ${new Date(dayObj.dateStr) > new Date() ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded border border-green-300" />
                  <span className="text-gray-600">Logged</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded border-2 border-primary" />
                  <span className="text-gray-600">Today</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Reading Entry */}
        <div className="lg:col-span-2">
          <Card
            title={
              <span className="flex items-center justify-between w-full gap-2 flex-wrap">
                <span className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  <span className="hidden sm:inline">
                    {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                  <span className="sm:hidden">Record Readings</span>
                </span>
                <span className="hidden lg:flex items-center gap-2 text-sm font-normal text-gray-500">
                  <span className="font-bold text-primary">{savedSlots.size}/7</span> saved
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(savedSlots.size / 7) * 100}%` }} />
                  </div>
                </span>
              </span>
            }
          >
            <div className="space-y-3">
              {timeSlots.map((slot) => {
                const isConfirmed = savedSlots.has(slot.key) && !editingSlots.has(slot.key);
                const isEditing   = editingSlots.has(slot.key);
                const isSaving    = savingSlots.has(slot.key);
                const inputVal    = readings[slot.key];
                const confirmedDisplayVal = savedMgDL[slot.key] != null
                  ? toDisplay(savedMgDL[slot.key], unit)
                  : null;
                const confirmedStatus = getStatus(savedMgDL[slot.key]);

                return (
                  <div
                    key={slot.key}
                    className={`border-l-4 ${getCardBorder(slot.key, isConfirmed)} bg-white rounded-xl shadow-sm p-3 sm:p-4 transition-all`}
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-50">
                          <slot.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 text-sm sm:text-base leading-tight">{slot.label}</p>
                          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">{slot.time}</p>
                        </div>
                      </div>
                      {isConfirmed
                        ? getStatusBadge(confirmedStatus)
                        : getStatusBadge(getStatusFromInput(inputVal))
                      }
                    </div>

                    {isConfirmed ? (
                      /* ── Confirmed / Saved state ── */
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                          <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-2xl sm:text-3xl font-bold text-gray-800">{confirmedDisplayVal}</span>
                          <span className="text-xs text-gray-500 font-medium">{unit}</span>
                        </div>
                        <span className="text-xs text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">Saved</span>
                        <button
                          onClick={() => startEditing(slot.key)}
                          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </div>
                    ) : (
                      /* ── Active / Editing state ── */
                      <div className="flex items-center gap-2 sm:gap-3">
                        <input
                          type="text"
                          inputMode={unit === 'mmol/L' ? 'decimal' : 'numeric'}
                          value={inputVal}
                          onChange={(e) => handleReadingChange(slot.key, e.target.value)}
                          placeholder="—"
                          className={`w-24 sm:w-28 px-3 py-2.5 text-center text-xl sm:text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors ${getInputColor(inputVal)}`}
                          maxLength={unit === 'mmol/L' ? 4 : 3}
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">{unit}</span>

                        <div className="ml-auto flex items-center gap-2">
                          {isEditing && (
                            <button
                              onClick={() => cancelEditing(slot.key)}
                              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-500 border border-gray-300 hover:bg-gray-50 transition-all"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => handleSave(slot.key)}
                            disabled={!inputVal || isSaving}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              inputVal && !isSaving
                                ? 'bg-primary text-white shadow hover:bg-blue-700 active:scale-95'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isSaving ? 'Saving…' : isEditing ? 'Update' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Tips — collapsible */}
          <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowTips(!showTips)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 font-semibold text-gray-700 text-sm sm:text-base">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Tips for Accurate Readings
              </span>
              {showTips ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {showTips && (
              <ul className="px-4 pb-4 space-y-2 text-xs sm:text-sm text-gray-700 border-t border-gray-100 pt-3">
                <li className="flex items-start gap-2">
                  <Sunrise className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Fasting:</strong> Measure before eating or drinking (except water) in the morning</span>
                </li>
                <li className="flex items-start gap-2">
                  <Utensils className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span><strong>After Meals:</strong> Measure exactly 2 hours after the first bite</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Wash Hands:</strong> Always wash hands before testing to avoid wrong readings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock3 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Be Consistent:</strong> Try to test at the same times each day</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span><strong>High Reading?</strong> Readings above {unit === 'mmol/L' ? '7.8 mmol/L' : '140 mg/dL'} after meals — contact your doctor</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogBloodSugar;
