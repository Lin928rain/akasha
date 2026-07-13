const DEFAULT_TTS_BASE_URL = "http://localhost:9191";

export function normalizeBaseUrl(value: string): string {
  let normalized = value.trim();
  if (!normalized) {
    return "";
  }
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }
  return normalized.replace(/\/$/, "");
}

export function getTtsBaseUrlFromSettings(value?: string): string {
  return normalizeBaseUrl(value || "");
}

export function getDefaultTtsBaseUrl(): string {
  const envValue = import.meta.env.VITE_TTS_URL as string | undefined;
  return normalizeBaseUrl(envValue || DEFAULT_TTS_BASE_URL);
}

export function getDefaultVoiceForLanguage(language: string): string {
  const normalized = language.toLowerCase();
  if (normalized.startsWith("zh")) return "zh-CN-YunyangNeural";
  if (normalized.startsWith("en")) return "en-AU-WilliamMultilingualNeural";
  if (normalized.startsWith("ja")) return "ja-JP-NanamiNeural";
  if (normalized.startsWith("ko")) return "ko-KR-SunHiNeural";
  if (normalized.startsWith("fr")) return "fr-FR-DeniseNeural";
  if (normalized.startsWith("de")) return "de-DE-KatjaNeural";
  if (normalized.startsWith("es")) return "es-ES-ElviraNeural";
  return "zh-CN-YunyangNeural";
}

export function clampTtsRate(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(50, Math.max(-50, value));
}

export function formatTtsRate(value: number): string {
  const clamped = clampTtsRate(value);
  const sign = clamped >= 0 ? "+" : "";
  return `${sign}${clamped}%`;
}
