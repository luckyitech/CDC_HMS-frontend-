import { useNavigate } from 'react-router-dom'
import logo from '../assets/cdc_web_logo1.svg'

const LoginLayout = ({ children }) => {
  const navigate = useNavigate();

  return (
    // app-shell + own scroll: html/body are locked for PWA stability, so any
    // full-page route outside MainLayout scrolls itself. m-auto centres the
    // card but still allows scrolling when it's taller than a small screen.
    <div className="app-shell safe-t safe-b overflow-y-auto no-scrollbar overscroll-contain bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 flex p-4">
      <div className="w-full max-w-3xl m-auto">
        <div className="text-center mb-8">
          <div
            className="w-28 h-28 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl p-4 cursor-pointer"
            onClick={() => navigate('/')}
          >
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