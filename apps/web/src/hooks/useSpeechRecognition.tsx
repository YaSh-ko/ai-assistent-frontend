import { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  /** Синхронно с API: React state отстаёт от onstart/onend, из‑за этого start/stop ломались */
  const listeningRef = useRef(false);

  useEffect(() => {
    // Проверяем поддержку Speech Recognition API
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.continuous = false; // Не непрерывное распознавание
        recognition.interimResults = false; // Отключаем промежуточные результаты
        recognition.lang = 'ru-RU'; // Русский язык

        recognition.onstart = () => {
          listeningRef.current = true;
          setIsListening(true);
        };

        recognition.onend = () => {
          listeningRef.current = false;
          setIsListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          
          // Собираем только финальные результаты
          for (const result of event.results) {
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            }
          }
          
          // Обновляем transcript только если есть финальный результат
          if (finalTranscript) {
            setTranscript(finalTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          listeningRef.current = false;
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    const r = recognitionRef.current;
    if (!r || listeningRef.current) return;
    setTranscript('');
    try {
      r.start();
    } catch {
      // InvalidStateError: уже запущено (двойной клик до onstart)
    }
  };

  const stopListening = () => {
    const r = recognitionRef.current;
    if (!r || !listeningRef.current) return;
    try {
      r.stop();
    } catch {
      // не в состоянии listening
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
};