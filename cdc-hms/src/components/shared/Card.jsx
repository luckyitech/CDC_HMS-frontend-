const Card = ({ children, title, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-2xl p-8 ${className}`}>
      {title && <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;