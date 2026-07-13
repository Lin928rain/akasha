/**
 * 语音控制配置模块
 */

export const DEFAULT_VOICE_CONFIG = {
  enabled: false,
  language: 'zh' as 'zh' | 'en',
  confidenceThreshold: 0.7, // 识别置信度阈值 (0-1)
  continuous: true, // 连续识别
  requireWakeWord: false, // 是否需要唤醒词
  wakeWord: 'akasha', // 唤醒词
};

export type VoiceConfig = typeof DEFAULT_VOICE_CONFIG;

/**
 * 获取默认语音配置
 */
export function getDefaultVoiceConfig(): VoiceConfig {
  return { ...DEFAULT_VOICE_CONFIG };
}

/**
 * 语音识别语言映射
 */
export const VOICE_LANGUAGE_MAP: Record<'zh' | 'en', string> = {
  zh: 'zh-CN',
  en: 'en-US',
};
