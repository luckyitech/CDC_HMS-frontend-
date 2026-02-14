import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const VoiceInput = ({ value, onChange, placeholder, rows = 4, required = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [textBeforeRecording, setTextBeforeRecording] = useState('');

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    // Create recognition instance
    const recognitionInstance = new SpeechRecognition();
    
    // Configuration
    recognitionInstance.continuous = true; // Keep listening until stopped
    recognitionInstance.interimResults = true; // Show results as user speaks
    recognitionInstance.lang = 'en-US'; // Language setting

    // Event: When speech is recognized
    recognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the textarea with transcribed text
      if (finalTranscript) {
        // Append to the text that existed BEFORE this recording session
        const newText = textBeforeRecording 
          ? textBeforeRecording + ' ' + finalTranscript 
          : finalTranscript;
        onChange({ target: { value: newText } });
      }
    };

    // Event: When recognition ends
    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    // Event: When error occurs
    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.', {
          duration: 4000,
          position: 'top-right',
          icon: '🎤',
          style: {
            background: '#EF4444',
            color: '#FFFFFF',
            fontWeight: 'bold',
            padding: '16px',
          },
        });
      } else if (event.error === 'no-speech') {
        // Don't show alert for no-speech, just stop silently
        console.log('No speech detected');
      }
    };

    setRecognition(recognitionInstance);

    // Cleanup
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [textBeforeRecording]);

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      // Stop listening
      recognition.stop();
      setIsListening(false);
    } else {
      // Start listening
      try {
        // Save current text before starting to record
        setTextBeforeRecording(value || '');
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error('Could not start voice input. Please try again.', {
          duration: 3000,
          position: 'top-right',
          icon: '❌',
          style: {
            background: '#EF4444',
            color: '#FFFFFF',
            fontWeight: 'bold',
            padding: '16px',
          },
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
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary font-mono text-sm pr-16"
      />

      {/* Microphone Button */}
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
              // Stop icon
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <rect x="6" y="6" width="8" height="8" />
              </svg>
            ) : (
              // Microphone icon
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
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

      {/* Help Text */}
      {isSupported && (
        <p className="text-xs text-gray-500 mt-2">
         Click the microphone to start voice input. Speak clearly and the text will appear automatically.
        </p>
      )}
    </div>
  );
};

export default VoiceInput;