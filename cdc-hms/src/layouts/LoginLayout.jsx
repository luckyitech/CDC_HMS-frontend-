import logo from '../assets/cdc_web_logo1.svg'

const LoginLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-28 h-28 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl p-4">
            <img 
              src={logo} 
              alt="CDC Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">Comprehensive Diabetes Centre</h1>
          <p className="text-white/90 mt-2 text-lg">Hospital Management System</p>
        </div>
        {children}
      </div>
    </div>
  );
};

export default LoginLayout;