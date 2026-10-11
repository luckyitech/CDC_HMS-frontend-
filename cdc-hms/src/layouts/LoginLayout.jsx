import { useNavigate } from 'react-router-dom'
import logo from '../assets/cdc_web_logo1.svg'
import './sidebar.css'
import './login.css'

// The drifting glucose traces behind the islands (decorative). The path is
// drawn twice as wide as the screen and slides by half, so it loops seamlessly.
const TRACE_A = 'M0 330 C120 250 220 410 340 330 S560 220 700 300 S900 420 1040 320 S1240 230 1380 310 S1580 400 1720 330 S1920 250 2060 320 S2280 380 2400 330';
const TRACE_B = 'M0 360 C140 300 260 430 380 360 S600 270 740 340 S960 440 1100 350 S1300 280 1440 340 S1640 420 1780 360 S1980 290 2120 350 S2300 400 2400 360';
const TRACE_C = 'M0 300 C160 360 300 230 460 300 S760 380 900 290 S1160 230 1300 300 S1560 370 1700 300 S1960 230 2100 300 S2320 350 2400 300';

/**
 * LoginLayout — every sign-in screen (11 Oct 2026, "Glucose-wave islands",
 * concept C of claude/login-page-concepts.html; styles in login.css).
 * The sidebar's floating islands on the app canvas: brand island, the page's
 * form (children) in its own island, and an optional help island (`help`).
 */
const LoginLayout = ({ children, help }) => {
  const navigate = useNavigate();

  return (
    // app-shell + own scroll: html/body are locked for PWA stability, so any
    // full-page route outside MainLayout scrolls itself. m-auto centres the
    // stack but still allows scrolling when it's taller than a small screen.
    <div className="app-shell safe-t safe-b overflow-y-auto no-scrollbar overscroll-contain app-canvas sb-white login-canvas flex p-4">
      <div className="login-band" aria-hidden="true" />
      <svg className="login-waves" viewBox="0 0 2400 600" preserveAspectRatio="none" aria-hidden="true">
        <path d={TRACE_A} fill="none" stroke="#0a8fd6" strokeOpacity=".35" strokeWidth="3" />
        <path d={TRACE_B} fill="none" stroke="#00ced1" strokeOpacity=".3" strokeWidth="2" />
      </svg>
      <svg className="login-waves slow" viewBox="0 0 2400 600" preserveAspectRatio="none" aria-hidden="true">
        <path d={TRACE_C} fill="none" stroke="#3b82f6" strokeOpacity=".18" strokeWidth="2" />
      </svg>

      <div className="login-stack">
        <div className="sb-island login-brand" onClick={() => navigate('/')} title="Comprehensive Diabetes Centre">
          <img src={logo} alt="CDC Logo" className="login-logo object-contain" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#0f2a4a] leading-tight">Comprehensive Diabetes Centre</h1>
            <p className="text-xs sm:text-sm text-slate-500">Hospital Management System</p>
          </div>
        </div>
        <div className="sb-island login-form">{children}</div>
        {help && <div className="sb-island login-help">{help}</div>}
      </div>
    </div>
  );
};

export default LoginLayout;
