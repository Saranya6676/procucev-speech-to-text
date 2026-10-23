
import { useEffect, useRef, useState } from "react";

export default function SpeechRecorder({
  language,
  initialTranscript,
  onTranscriptChange,
}) {
  const recognitionRef = useRef(null);
  const baseTranscriptRef = useRef("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser. Please try Google Chrome."
      );
      return;
    }

    if (recognitionRef.current) return;

    setError("");
    baseTranscriptRef.current = initialTranscript.trim();

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let recognizedText = "";

      for (let i = 0; i < event.results.length; i++) {
        recognizedText += event.results[i][0].transcript + " ";
      }

      const base = baseTranscriptRef.current;
      const separator = base && recognizedText.trim() ? " " : "";

      onTranscriptChange(
        `${base}${separator}${recognizedText.trim()}`.trim()
      );
    };

    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      recognitionRef.current = null;
      setError("Unable to start recording. Please try again.");
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  };

  return (
    <div className="speech-recorder">
      {!isRecording ? (
        <button
          className="secondary-button"
          type="button"
          onClick={startRecording}
        >
          🎙️ Start Recording
        </button>
      ) : (
        <button
          className="delete-button"
          type="button"
          onClick={stopRecording}
        >
          ⏹ Stop Recording
        </button>
      )}

      {isRecording && <p role="status">Listening… speak now.</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
