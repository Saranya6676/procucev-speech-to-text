

import { useEffect, useRef, useState } from "react";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.5-transcribe-live";

export default function SpeechRecorder({
  language,
  initialTranscript = "",
  onTranscriptChange,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const sessionRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const baseTranscriptRef = useRef("");
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const callbackRef = useRef(onTranscriptChange);
  const startingRef = useRef(false);

  useEffect(() => {
    callbackRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  const updateTranscript = () => {
    const base = baseTranscriptRef.current;
    const recognized = [
      finalTranscriptRef.current,
      interimTranscriptRef.current,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    callbackRef.current?.(
      [base, recognized].filter(Boolean).join(" ").trim()
    );
  };

  const stopRecording = async () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();

    if (sessionRef.current) {
      try {
        sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
        sessionRef.current.close();
      } catch {
        // The session may already be closed.
      }
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => { });
    }

    sessionRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    processorRef.current = null;
    sourceRef.current = null;
    startingRef.current = false;

    setIsRecording(false);
    setStatus("");
  };

  useEffect(() => {
    return () => {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      sessionRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close().catch(() => { });
      }
    };
  }, []);

  const startRecording = async () => {
    if (startingRef.current || sessionRef.current) return;

    startingRef.current = true;
    setError("");
    setStatus("Connecting to Gemini...");

    let stream;
    let audioContext;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access requires localhost or HTTPS.");
      }

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Ask the backend for a short-lived token.
      const response = await fetch(
        "http://localhost:5000/api/gemini/token",
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Could not obtain a Gemini session token.");
      }

      const { token } = await response.json();

      if (!token) {
        throw new Error("The backend did not return a session token.");
      }

      const ai = new GoogleGenAI({ apiKey: token });

      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: ["TEXT"],
          inputAudioTranscription: {
            languageCodes: [],
          },
        },
        callbacks: {
          onmessage(message) {
            const content = message.serverContent;

            if (content?.interimInputTranscription?.text) {
              interimTranscriptRef.current =
                content.interimInputTranscription.text.trim();
              updateTranscript();
            }

            if (content?.inputTranscription?.text) {
              const text = content.inputTranscription.text.trim();

              if (text) {
                finalTranscriptRef.current = [
                  finalTranscriptRef.current,
                  text,
                ]
                  .filter(Boolean)
                  .join(" ");
              }

              interimTranscriptRef.current = "";
              updateTranscript();
            }
          },
          onerror(event) {
            setError(
              event.message || "Gemini encountered a transcription error."
            );
          },
        
onclose(event) {
  console.warn(" connection closed:", event?.reason);

  sessionRef.current = null;

  processorRef.current?.disconnect();
  sourceRef.current?.disconnect();

  streamRef.current?.getTracks().forEach((track) => track.stop());

  if (audioContextRef.current?.state !== "closed") {
    audioContextRef.current?.close().catch(console.error);
  }

  processorRef.current = null;
  sourceRef.current = null;
  streamRef.current = null;
  audioContextRef.current = null;

  setIsRecording(false);
  setStatus(" disconnected. Click Start Recording to reconnect.");
},
        },
      });

      sessionRef.current = session;

      baseTranscriptRef.current = initialTranscript.trim();
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";

      audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessor provides microphone samples for PCM conversion.
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      // 

      //   if (!sessionRef.current) return;

      //   const input = event.inputBuffer.getChannelData(0);
      //   const inputRate = audioContext.sampleRate;
      //   const outputRate = 16000;
      //   const ratio = inputRate / outputRate;
      //   const outputLength = Math.floor(input.length / ratio);

      //   if (outputLength < 1) return;

      //   const pcm = new Int16Array(outputLength);

      //   for (let i = 0; i < outputLength; i++) {
      //     const sampleIndex = Math.min(
      //       Math.floor(i * ratio),
      //       input.length - 1
      //     );
      //     const sample = Math.max(-1, Math.min(1, input[sampleIndex]));

      //     pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
      //   }

      //   const bytes = new Uint8Array(pcm.buffer);
      //   let binary = "";

      //   for (let i = 0; i < bytes.length; i++) {
      //     binary += String.fromCharCode(bytes[i]);
      //   }

      //   try {
      //     sessionRef.current.sendRealtimeInput({
      //       audio: {
      //         data: btoa(binary),
      //         mimeType: "audio/pcm;rate=16000",
      //       },
      //     });
      //   } catch {
      //     setError("Unable to send audio to Gemini.");
      //   }
      // };


      processor.onaudioprocess = (event) => {
        const session = sessionRef.current;
        if (!session) return;

        const input = event.inputBuffer.getChannelData(0);
        const inputRate = audioContext.sampleRate;
        const outputRate = 16000;
        const outputLength = Math.floor(
          (input.length * outputRate) / inputRate
        );

        if (outputLength === 0) return;

        const pcm = new Int16Array(outputLength);
        const ratio = inputRate / outputRate;

        // Resample audio instead of simply skipping samples.
        for (let i = 0; i < outputLength; i++) {
          const position = i * ratio;
          const left = Math.floor(position);
          const right = Math.min(left + 1, input.length - 1);
          const fraction = position - left;

          const sample =
            input[left] * (1 - fraction) + input[right] * fraction;

          const clipped = Math.max(-1, Math.min(1, sample));

          pcm[i] = clipped < 0
            ? clipped * 32768
            : clipped * 32767;
        }

        const bytes = new Uint8Array(pcm.buffer);
        let binary = "";

        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }

        try {
          session.sendRealtimeInput({
            audio: {
              data: btoa(binary),
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch (err) {
          console.error("Audio streaming error:", err);
          setError("Audio streaming failed. Please restart recording.");
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setStatus(
        language
          ? `Listening... selected language: ${language}. Automatic detection is enabled.`
          : "Listening... automatic language detection is enabled."
      );
    } catch (err) {
      setError(err.message || "Unable to start recording.");
      await stopRecording();
    } finally {
      startingRef.current = false;
    }
  };

  return (
    <div className="speech-recorder">
      {!isRecording ? (
        <button
          className="secondary-button"
          type="button"
          onClick={startRecording}
          disabled={startingRef.current}
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

      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
