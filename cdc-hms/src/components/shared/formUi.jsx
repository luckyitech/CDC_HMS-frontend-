// Small shared building blocks used across the module pages (Stocks, Billing).
//
// These four started life in components/stock/stockUi.jsx, where they worked
// fine until a second module needed exactly the same field row, input styling
// and headline tile. They are promoted here rather than copied, or imported
// across module boundaries: `stockUi.jsx` re-exports them, so the twelve stock
// components that already import them are untouched.
//
// Anything that carries STOCK meaning (StatusPill's tone map, MovementBadge,
// BatchScanBox, FefoOverrideModal) deliberately stays in stockUi — this file is
// only for pieces with no domain attached.

// Form field label — matches the house convention (ClinicalCatalog/EditUser).
export const Field = ({ label, children, hint }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

// Input styling — same as ClinicalCatalog's inputCls (border-2, focus:primary).
export const inputCls =
  "w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary";

// Headline stat tile — the app's gradient dashboard card (AdminDashboard).
//
// Tone carries MEANING, so pick it by what the number says: green for money in,
// red for a loss or correction, amber for something owed or expiring, blue for
// a plain count.
export const StatCard = ({ label, value, sub, tone = "blue" }) => {
  const gradients = {
    blue:  "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    amber: "from-amber-500 to-amber-600",
    red:   "from-red-500 to-red-600",
    cyan:  "from-cyan-500 to-cyan-600",
    purple:"from-purple-500 to-purple-600",
  };
  return (
    <div className={`bg-gradient-to-br ${gradients[tone] || gradients.blue} rounded-xl shadow-lg p-6 text-white`}>
      <p className="text-sm opacity-90">{label}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
      {sub && <p className="text-sm mt-3 opacity-75">{sub}</p>}
    </div>
  );
};

// Compact "who · when" attribution line used on rows and history views —
// the clinic-wide standing rule: every action shows who did it and when.
export const ByLine = ({ user, at }) => {
  if (!user && !at) return null;
  const name = user ? `${user.firstName} ${user.lastName}` : null;
  const time = at ? new Date(at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : null;
  return (
    <span className="text-xs text-gray-500">
      {name}{name && time ? " · " : ""}{time}
    </span>
  );
};
