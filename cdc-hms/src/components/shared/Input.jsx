const Input = ({ label, type = 'text', name, value, onChange, placeholder, error }) => {
  return (
    <div className="mb-6">
      {label && <label className="block text-gray-700 font-semibold mb-2 text-sm uppercase tracking-wide">{label}</label>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 transition ${
          error ? 'border-red-500' : 'border-gray-300 focus:border-primary'
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>}
    </div>
  );
};

export default Input;