import { useState, useEffect, useRef, useCallback } from 'react';

const INACTIVITY_MS  = 9 * 60 * 1000; // 9 minutes → show warning
const WARNING_MS     = 60 * 1000;      // 1 minute to respond before logout
const COUNTDOWN_SECS = 60;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

export default function useSessionTimeout(enabled) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(COUNTDOWN_SECS);

  const warningTimerRef   = useRef(null);
  const logoutTimerRef    = useRef(null);
  const countdownRef      = useRef(null);
  // Ref so event listeners always read the latest value without stale closures
  const isWarningShownRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    clearTimeout(warningTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('currentUser');
    window.location.href = '/';
  }, []);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    isWarningShownRef.current = false;
    setShowWarning(false);
    setCountdown(COUNTDOWN_SECS);

    // After 9 minutes of inactivity, show the warning
    warningTimerRef.current = setTimeout(() => {
      isWarningShownRef.current = true;
      setShowWarning(true);
      setCountdown(COUNTDOWN_SECS);

      // Tick the countdown every second
      countdownRef.current = setInterval(() => {
        setCountdown(prev => (prev > 1 ? prev - 1 : 1));
      }, 1000);

      // Log out 1 minute after the warning appears
      logoutTimerRef.current = setTimeout(logout, WARNING_MS);
    }, INACTIVITY_MS);
  }, [clearAllTimers, logout]);

  useEffect(() => {
    if (!enabled) return;

    // Only reset on activity when the warning is not yet visible —
    // once visible the user must click "Stay logged in" explicitly.
    const handleActivity = () => {
      if (!isWarningShownRef.current) resetTimer();
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimer(); // Start timer on mount

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
      clearAllTimers();
    };
  }, [enabled, resetTimer, clearAllTimers]);

  return { showWarning, countdown, resetTimer };
}
