import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const VoiceInput = ({ value, onChange, placeholder, rows = 4, required = false, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Refs so handlers always have the latest values without stale closures
  const recognitionRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const textBeforeRecordingRef = useRef('');
  const cumulativeFinalRef = useRef(''); // accumulates all final results in one session

  // Keep onChangeRef current on every render (no stale closure for onChange)
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Create the recognition instance once on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += transcript + ' ';
        }
      }

      if (newFinal) {
        // Append new final text to everything already said this session
        cumulativeFinalRef.current += newFinal;
        const base = textBeforeRecordingRef.current;
        const full = base
          ? base.trimEnd() + ' ' + cumulativeFinalRef.current
          : cumulativeFinalRef.current;
        onChangeRef.current({ target: { value: full } });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.', {
          duration: 4000,
          position: 'top-right',
          icon: '🎤',
          style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
        });
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        textBeforeRecordingRef.current = value || '';
        cumulativeFinalRef.current = ''; // reset session accumulator
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error('Could not start voice input. Please try again.', {
          duration: 3000,
          position: 'top-right',
          icon: '❌',
          style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
        });
      }
    }
  };

  return (
    <div className="relative">
      {/* Textarea */}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary font-mono text-sm pr-16 disabled:bg-gray-50 disabled:cursor-not-allowed"
      />

      {/* Microphone Button */}
      {!disabled && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {isListening && (
            <span className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              Recording...
            </span>
          )}

          {isSupported ? (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-full transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="6" width="8" height="8" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                </svg>
              )}
            </button>
          ) : (
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded">
              Voice input not supported in this browser
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {isSupported && !disabled && (
        <p className="text-xs text-gray-500 mt-2">
          Click the microphone to start voice input. Speak clearly and the text will appear automatically.
        </p>
      )}
    </div>
  );
};

export default VoiceInput;
