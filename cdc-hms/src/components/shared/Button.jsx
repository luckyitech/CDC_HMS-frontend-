const Button = ({ children, onClick, variant = 'primary', type = 'button', className = '' }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white shadow-md',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;