import { SettingsValues, SupportedLanguages } from "./Settings";

export const defaultSettings: SettingsValues = {
  language: SupportedLanguages.Chinese,
  useVisualFeedback: true,
  developerMode: false,
  showShortcutHints: true,

  colorSchemePreference: "auto",
  themeColor: "#1e752f",

  useBubbleMenu: true,
  useToolbar: false,
  showSubAndSuperScriptOptionInEditor: true,
  showStrikethroughOptionInEditor: true,
  showHighlightOptionInEditor: true,
  showListOptionInEditor: true,
  showCodeOptionInEditor: true,
  showLinkOptionInEditor: true,

  learn_newToReviewRatio: 0.5,
  learn_sort: "creationDate",
  learn_maxUniqueCardsPerSession: 50,
  learn_maxNewCardsPerDay: 20,
  tts_voice_zh: "zh-CN-YunyangNeural",
  tts_voice_en: "en-AU-WilliamMultilingualNeural",
  tts_rate: 0,
  tts_base_url: "http://localhost:9191",
  globalScheduler_maximumInterval: 36500,
  globalScheduler_requestRetention: 0.9,
  globalScheduler_w: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
    0.34, 1.26, 0.29, 2.61,
  ],
  api_maxConcurrentRequests: 5,
  api_requestRetryAttempts: 3,
  api_requestRetryDelayMs: 500,

  // AI API 配置
  ai_apiBaseUrl: "",
  ai_modelId: "",
  ai_apiKey: "",

  // 语音控制配置
  voice_control_enabled: false,
  voice_control_language: 'zh',
  voice_control_confidence_threshold: 0.5,
};
