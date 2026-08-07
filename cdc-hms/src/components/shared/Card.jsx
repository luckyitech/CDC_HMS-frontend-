// `shadow` (default true) can be turned off for flat cards (e.g. cards nested in
// an already-elevated panel where the drop shadow reads as clutter).
const Card = ({ children, title, className = '', shadow = true }) => {
  return (
    <div className={`bg-white rounded-xl ${shadow ? 'shadow-2xl' : ''} p-8 ${className}`}>
      {title && <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;