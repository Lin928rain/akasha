import { SettingsValues } from "./Settings";
import { LocalSettingKey } from "./Settings";

const LOCAL_SETTINGS_STORAGE_KEY = "akasha_local_settings_v1";
const LOCAL_SETTINGS_EVENT = "akasha_local_settings_change";

type LocalSettings = Partial<Pick<SettingsValues, LocalSettingKey>>;

function readLocalSettings(): LocalSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }
  const raw = window.localStorage.getItem(LOCAL_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as LocalSettings;
  } catch {
    return {};
  }
}

function writeLocalSettings(settings: LocalSettings): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(
    LOCAL_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  );
  window.dispatchEvent(new Event(LOCAL_SETTINGS_EVENT));
}

export function getLocalSetting<T extends LocalSettingKey>(
  key: T
): SettingsValues[T] | undefined {
  const settings = readLocalSettings();
  return settings[key] as SettingsValues[T] | undefined;
}

export function getLocalSettings(): LocalSettings {
  return readLocalSettings();
}

export function setLocalSetting<T extends LocalSettingKey>(
  key: T,
  value: SettingsValues[T]
): void {
  const settings = readLocalSettings();
  settings[key] = value as LocalSettings[typeof key];
  writeLocalSettings(settings);
}

export function subscribeLocalSettings(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_SETTINGS_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener(LOCAL_SETTINGS_EVENT, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(LOCAL_SETTINGS_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
