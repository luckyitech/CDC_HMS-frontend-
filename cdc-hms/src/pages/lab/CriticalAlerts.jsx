import { useState } from "react";
import toast from "react-hot-toast";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { useNavigate } from "react-router-dom";
import { useLabContext } from "../../contexts/LabContext";

const CriticalAlerts = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all"); // all, unnotified, notified

  // Mock critical results data
  const { getCriticalTests } = useLabContext();
  const criticalAlerts = getCriticalTests();

  const filteredAlerts = criticalAlerts.filter((alert) => {
    if (filter === "unnotified") return !alert.notified;
    if (filter === "notified") return alert.notified;
    return true;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "Critical":
        return "bg-red-500 text-white";
      case "High":
        return "bg-orange-500 text-white";
      default:
        return "bg-yellow-500 text-white";
    }
  };

  const formatResults = (results) => {
    return Object.entries(results)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  const handleNotifyDoctor = (alert) => {
    // Show success notification
    toast.success(
      `Doctor Notified Successfully!\nPatient: ${alert.patientName}\nDoctor: ${alert.orderedBy}\nTest: ${alert.testType}`,
      {
        duration: 5000,
        position: "top-right",
        icon: "✅",
        style: {
          background: "#10B981",
          color: "#FFFFFF",
          fontWeight: "bold",
          padding: "16px",
          whiteSpace: "pre-line",
        },
      }
    );

    // In real system, this would send SMS/Email to doctor
    console.log("Notification sent:", {
      patient: alert.patientName,
      doctor: alert.orderedBy,
      test: alert.testType,
      result: alert.results,
    });
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Critical Results Alerts
        </h2>
        <Button variant="outline" onClick={() => navigate("/lab/dashboard")}>
          ← Back to Dashboard
        </Button>
      </div>

      {/* Alert Banner */}
      {filteredAlerts.filter((a) => !a.notified).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🚨</span>
            <div className="flex-1">
              <p className="font-bold text-red-800 text-lg">
                Urgent Action Required!
              </p>
              <p className="text-sm text-red-700 mt-1">
                You have {filteredAlerts.filter((a) => !a.notified).length}{" "}
                critical result(s) that need immediate doctor notification.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Total Critical</p>
          <p className="text-4xl font-bold mt-2">{criticalAlerts.length}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Pending Notification</p>
          <p className="text-4xl font-bold mt-2">
            {criticalAlerts.filter((a) => !a.notified).length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Doctor Notified</p>
          <p className="text-4xl font-bold mt-2">
            {criticalAlerts.filter((a) => a.notified).length}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            filter === "all"
              ? "bg-primary text-white shadow-lg"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All ({criticalAlerts.length})
        </button>
        <button
          onClick={() => setFilter("unnotified")}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            filter === "unnotified"
              ? "bg-primary text-white shadow-lg"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Unnotified ({criticalAlerts.filter((a) => !a.notified).length})
        </button>
        <button
          onClick={() => setFilter("notified")}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            filter === "notified"
              ? "bg-primary text-white shadow-lg"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Notified ({criticalAlerts.filter((a) => a.notified).length})
        </button>
      </div>

      {/* Critical Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-6xl mb-4">✅</p>
              <p className="text-xl font-semibold text-gray-800 mb-2">
                No critical alerts
              </p>
              <p className="text-gray-600">
                All critical results have been addressed
              </p>
            </div>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card key={alert.id}>
              <div
                className={`p-4 sm:p-6 rounded-lg ${
                  alert.notified
                    ? "bg-gray-50"
                    : "bg-red-50 border-2 border-red-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Alert Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-4 py-2 rounded-full text-sm font-bold bg-red-500 text-white">
                        CRITICAL
                      </span>
                      {!alert.notified && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-300 animate-pulse">
                          ⚠️ PENDING NOTIFICATION
                        </span>
                      )}
                      {alert.notified && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-300">
                          ✓ Doctor Notified
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Patient</p>
                        <p className="text-xl font-bold text-gray-800">
                          {alert.patientName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {alert.uhid} • {alert.age}y • {alert.gender}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Test</p>
                        <p className="text-xl font-bold text-primary">
                          {alert.testType}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ordered by: {alert.orderedBy}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Result</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatResults(alert.results)}
                        </p>
                        <p className="text-xs text-gray-600">
                          Normal: {alert.normalRange}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Detected</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {new Date(alert.completedDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}{" "}
                          at {alert.completedTime}
                        </p>
                        <p className="text-xs text-gray-600">
                          By: {alert.completedBy}
                        </p>
                      </div>

                      {alert.technicianNotes && (
                        <div className="sm:col-span-2">
                          <p className="text-sm text-gray-600">
                            Technician Notes
                          </p>
                          <p className="text-sm text-gray-800 font-medium">
                            {alert.technicianNotes}
                          </p>
                        </div>
                      )}

                      {alert.notified && (
                        <div className="sm:col-span-2">
                          <p className="text-sm text-gray-600">
                            Notification Details
                          </p>
                          <p className="text-sm text-green-700 font-medium">
                            Doctor notified on{" "}
                            {new Date(alert.notifiedDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}{" "}
                            at {alert.notifiedTime}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 lg:items-end">
                    {!alert.notified ? (
                      <Button
                        onClick={() => handleNotifyDoctor(alert)}
                        className="bg-red-600 hover:bg-red-700 w-full lg:w-auto"
                      >
                        🚨 Notify Doctor Now
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full lg:w-auto"
                        disabled
                      >
                        ✓ Notification Sent
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-sm w-full lg:w-auto"
                    >
                      View Full Report
                    </Button>
                    <Button
                      variant="outline"
                      className="text-sm w-full lg:w-auto"
                    >
                      Print Alert
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Critical Values Reference */}
      <Card title="📚 Critical Values Reference Guide" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="font-bold text-gray-800 mb-1">Glucose</p>
            <p className="text-gray-600">Critical: &lt;50 or &gt;400 mg/dL</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="font-bold text-gray-800 mb-1">HbA1c</p>
            <p className="text-gray-600">Critical: &gt;10%</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="font-bold text-gray-800 mb-1">Creatinine</p>
            <p className="text-gray-600">Critical: &gt;3.0 mg/dL</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="font-bold text-gray-800 mb-1">Potassium</p>
            <p className="text-gray-600">Critical: &lt;2.5 or &gt;6.0 mEq/L</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="font-bold text-gray-800 mb-1">Hemoglobin</p>
            <p className="text-gray-600">Critical: &lt;7.0 g/dL</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="font-bold text-gray-800 mb-1">Platelets</p>
            <p className="text-gray-600">Critical: &lt;50,000/µL</p>
          </div>
        </div>
      </Card>

      {/* Protocol Reminder */}
      <Card title="⚠️ Critical Result Protocol" className="mt-6">
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span>
              <strong>Verify Result:</strong> Double-check the test result and
              ensure correct patient identification
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span>
              <strong>Document:</strong> Record the critical value with date,
              time, and your initials
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span>
              <strong>Notify Immediately:</strong> Contact the ordering
              physician within 15 minutes
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
              4
            </span>
            <span>
              <strong>Record Notification:</strong> Document who was notified,
              when, and their response
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
              5
            </span>
            <span>
              <strong>Follow-up:</strong> Ensure the physician acknowledges
              receipt and plans appropriate action
            </span>
          </li>
        </ol>
      </Card>
    </div>
  );
};

export default CriticalAlerts;
