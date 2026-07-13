/**
 * Voice control module exports
 */

export { useVoiceControl } from './hooks/useVoiceControl';
export { useVoiceRecognition } from './voiceRecognition';
export { parseVoiceCommand, getAvailableCommands } from './voiceCommands';
export { getDefaultVoiceConfig, VOICE_LANGUAGE_MAP } from './voiceConfig';

export type {
  VoiceCommand,
  VoiceCommandMatch,
} from './voiceCommands';

export type {
  VoiceRecognitionState,
  VoiceRecognitionOptions,
} from './voiceRecognition';

export type {
  UseVoiceControlOptions,
  UseVoiceControlReturn,
} from './hooks/useVoiceControl';

export type {
  VoiceConfig,
} from './voiceConfig';
