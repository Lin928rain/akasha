/**
 * 语音控制 Hook
 * 将语音识别与学习控制器连接
 */

import { useCallback, useEffect, useRef } from 'react';
import { useVoiceRecognition } from '../voiceRecognition';
import { parseVoiceCommand } from '../voiceCommands';
import type { LearnController } from '../../learn';

export interface UseVoiceControlOptions {
  enabled: boolean;
  language: 'zh' | 'en';
  confidenceThreshold: number;
  requireManualTrigger?: boolean;
}

export interface UseVoiceControlReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  lastCommand: string | null;
  commandCount: number;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

export function useVoiceControl(
  controller: LearnController | null,
  options: UseVoiceControlOptions
): UseVoiceControlReturn {
  const {
    enabled,
    language,
    requireManualTrigger = false,
  } = options;

  const lastCommandRef = useRef<string | null>(null);
  const commandCountRef = useRef(0);

  // 处理语音命令
  const handleVoiceCommand = useCallback(
    (transcript: string) => {
      if (!controller) return;

      const command = parseVoiceCommand(transcript, language);
      if (!command) return;

      lastCommandRef.current = transcript;
      commandCountRef.current += 1;

      console.log('[Voice Control] Command:', command, 'Transcript:', transcript);

      switch (command.type) {
        case 'showAnswer':
          if (!controller.showingAnswer) {
            controller.showAnswer();
          }
          break;

        case 'answer':
          if (controller.showingAnswer && command.rating) {
            controller.answerCard(command.rating);
            controller.requestNextCard();
          }
          break;

        case 'stopTts':
          // 触发停止 TTS 事件（通过自定义事件）
          window.dispatchEvent(new CustomEvent('voice-stop-tts'));
          break;

        case 'replayTts':
          // 触发重播 TTS 事件
          window.dispatchEvent(new CustomEvent('voice-replay-tts'));
          break;
      }
    },
    [controller, language]
  );

  const {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    resetState,
  } = useVoiceRecognition({
    language,
    continuous: true,
    interimResults: true,
    onCommand: handleVoiceCommand,
  });

  // 启用/禁用控制
  useEffect(() => {
    if (!enabled) {
      stopListening();
      resetState();
    } else if (!requireManualTrigger && isSupported) {
      // 自动启动
      startListening();
    }
  }, [enabled, requireManualTrigger, isSupported]);

  // 清理
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    lastCommand: lastCommandRef.current,
    commandCount: commandCountRef.current,
    startListening,
    stopListening,
    error,
  };
}
