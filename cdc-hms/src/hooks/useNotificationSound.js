import { useRef, useEffect, useCallback } from 'react';

/**
 * useNotificationSound — plays a soft, pleasant chime using the Web Audio API.
 *
 * No audio files needed; the sound is generated programmatically.
 * Browsers block audio until the user has interacted with the page at least once,
 * so the first sound may be silently skipped — subsequent ones always play.
 *
 * Returns:
 *   play(type?) — call to trigger a sound
 *     type 'new'     — rising two-note chime  (new patient / referral received)
 *     type 'alert'   — single low-pitched tone (urgent / warning)
 *     type 'success' — three ascending notes   (action completed)
 */
const useNotificationSound = () => {
  const audioCtx = useRef(null);

  // Lazily create the AudioContext on first use (avoids autoplay policy warnings on mount)
  const getCtx = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx.current;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioCtx.current) {
        audioCtx.current.close();
        audioCtx.current = null;
      }
    };
  }, []);

  /**
   * playTone — internal helper
   * @param {AudioContext} ctx
   * @param {number}       frequency  Hz
   * @param {number}       startTime  seconds from ctx.currentTime
   * @param {number}       duration   seconds
   * @param {number}       gain       0–1 volume
   */
  const playTone = (ctx, frequency, startTime, duration, gain = 0.25) => {
    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type      = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Soft attack + decay envelope so it doesn't click
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const play = useCallback((type = 'new') => {
    try {
      const ctx  = getCtx();
      const now  = ctx.currentTime;

      if (type === 'new') {
        // Rising two-note chime — new patient / referral received
        playTone(ctx, 523, now,        0.35); // C5
        playTone(ctx, 784, now + 0.18, 0.45); // G5
      } else if (type === 'alert') {
        // Single mid-tone pulse — urgent / warning
        playTone(ctx, 440, now, 0.5, 0.3); // A4
      } else if (type === 'success') {
        // Three ascending notes — action completed
        playTone(ctx, 523, now,        0.25); // C5
        playTone(ctx, 659, now + 0.15, 0.25); // E5
        playTone(ctx, 784, now + 0.30, 0.40); // G5
      }
    } catch {
      // Silently ignore — AudioContext unavailable or blocked
    }
  }, [getCtx]);

  return { play };
};

export default useNotificationSound;
