/**
 * 语音识别基础 Hook
 * 封装 Web Speech API 的 SpeechRecognition 接口
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VOICE_LANGUAGE_MAP } from './voiceConfig';

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface VoiceRecognitionOptions {
  language?: 'zh' | 'en';
  continuous?: boolean;
  interimResults?: boolean;
  onCommand?: (transcript: string) => void;
}

export interface VoiceRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  confidence: number;
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}) {
  const {
    language = 'zh',
    continuous = true,
    interimResults = true,
    onCommand,
  } = options;

  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    finalTranscript: '',
    error: null,
    confidence: 0,
  });

  const recognitionRef = useRef<any>(null);
  const isManualStopRef = useRef(false);

  useEffect(() => {
    // 检测浏览器支持
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((s) => ({
        ...s,
        isSupported: false,
        error: '浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器',
      }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = VOICE_LANGUAGE_MAP[language];
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      isManualStopRef.current = false;
      setState((s) => ({
        ...s,
        isListening: true,
        error: null,
      }));
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let highestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result.item(0);

        if (result.isFinal) {
          finalTranscript += alternative.transcript;
          highestConfidence = Math.max(highestConfidence, alternative.confidence);

          // 触发命令处理
          if (onCommand) {
            onCommand(alternative.transcript.trim());
          }
        } else {
          interimTranscript += alternative.transcript;
        }
      }

      setState((s) => ({
        ...s,
        transcript: finalTranscript || interimTranscript,
        interimTranscript,
        finalTranscript,
        confidence: highestConfidence,
      }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('语音识别错误:', event.error, event.message);

      let errorMessage = `识别错误：${event.error}`;
      if (event.error === 'no-speech') {
        errorMessage = '未检测到语音，请对着麦克风说话';
      } else if (event.error === 'audio-capture') {
        errorMessage = '无法访问麦克风，请检查权限设置';
      } else if (event.error === 'not-allowed') {
        errorMessage = '麦克风权限被拒绝';
      }

      setState((s) => ({
        ...s,
        error: errorMessage,
        isListening: false,
      }));
    };

    recognition.onend = () => {
      if (!isManualStopRef.current && continuous) {
        // 连续模式下自动重启
        try {
          recognition.start();
        } catch (e) {
          // 忽略重启失败
        }
      } else {
        setState((s) => ({
          ...s,
          isListening: false,
        }));
      }
    };

    recognitionRef.current = recognition;
    setState((s) => ({ ...s, isSupported: true }));

    return () => {
      recognition.stop();
    };
  }, [language, continuous, interimResults, onCommand]);

  const startListening = useCallback(() => {
    isManualStopRef.current = false;
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.warn('启动语音识别失败:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    isManualStopRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  const resetState = useCallback(() => {
    setState((s) => ({
      ...s,
      transcript: '',
      interimTranscript: '',
      finalTranscript: '',
      error: null,
      confidence: 0,
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetState,
  };
}
