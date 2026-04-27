import { AlertTriangle } from "lucide-react";

// Shown when the user has been inactive for 9 minutes.
// They have 60 seconds to click "Stay Logged In" before being logged out.
export default function SessionTimeoutWarning({ countdown, onStayLoggedIn }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">

        <div className="flex justify-center">
          <div className="p-3 bg-amber-100 rounded-full">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800">Session Timeout Warning</h2>
          <p className="text-sm text-gray-500 mt-1">
            You have been inactive. You will be logged out in:
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center">
          <span className={`text-5xl font-bold tabular-nums ${countdown <= 10 ? 'text-red-500' : 'text-amber-500'}`}>
            {String(countdown).padStart(2, '0')}
          </span>
          <span className="text-gray-400 text-lg ml-2 self-end mb-1">sec</span>
        </div>

        <button
          onClick={onStayLoggedIn}
          className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          Stay Logged In
        </button>

        <p className="text-xs text-gray-400">
          Click the button above to continue your session.
        </p>
      </div>
    </div>
  );
}
