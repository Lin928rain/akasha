export type Settings<T extends keyof SettingsValues> = {
  key: T;
  value: SettingsValues[T];
  userId?: string;
};

export enum SupportedLanguages {
  English = "en",
  Chinese = "zh",
}

export interface SettingsValues {
  name?: string;
  language: SupportedLanguages;
  useVisualFeedback: boolean;
  developerMode: boolean;
  showShortcutHints: boolean;

  colorSchemePreference: "light" | "dark" | "auto";
  themeColor: string;

  useBubbleMenu: boolean;
  useToolbar: boolean;
  showSubAndSuperScriptOptionInEditor: boolean;
  showStrikethroughOptionInEditor: boolean;
  showHighlightOptionInEditor: boolean;
  showListOptionInEditor: boolean;
  showCodeOptionInEditor: boolean;
  showLinkOptionInEditor: boolean;

  learn_newToReviewRatio: number;
  learn_sort: "creationDate" | "dueDate";
  learn_maxUniqueCardsPerSession: number;
  learn_maxNewCardsPerDay: number;
  tts_voice_zh: string;
  tts_voice_en: string;
  tts_rate: number;
  tts_base_url: string;

  globalScheduler_maximumInterval: number;
  globalScheduler_requestRetention: number;
  globalScheduler_w: number[];

  api_maxConcurrentRequests: number;
  api_requestRetryAttempts: number;
  api_requestRetryDelayMs: number;

  // AI API 配置
  ai_apiBaseUrl: string;
  ai_modelId: string;
  ai_apiKey: string;

  // 语音控制配置
  voice_control_enabled: boolean;
  voice_control_language: 'zh' | 'en';
  voice_control_confidence_threshold: number;
}

export const syncedSettingKeys = [
  "learn_newToReviewRatio",
  "learn_sort",
  "learn_maxUniqueCardsPerSession",
  "learn_maxNewCardsPerDay",
  "globalScheduler_maximumInterval",
  "globalScheduler_requestRetention",
  "globalScheduler_w",
  // AI 配置（不包括 API Key，由后端管理）
  "ai_apiBaseUrl",
  "ai_modelId",
] as const;

export type SyncedSettingKey = (typeof syncedSettingKeys)[number];
export type LocalSettingKey = Exclude<keyof SettingsValues, SyncedSettingKey>;

export function isSyncedSettingKey(
  key: keyof SettingsValues
): key is SyncedSettingKey {
  return (syncedSettingKeys as readonly string[]).includes(key);
}
