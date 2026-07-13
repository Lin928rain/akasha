import { db, updateRequestQueueConfig } from "../db";
import {
  LocalSettingKey,
  SettingsValues,
  isSyncedSettingKey,
} from "./Settings";
import { setLocalSetting } from "./localSettings";

export async function setSetting(
  key: keyof SettingsValues,
  newValue: SettingsValues[keyof SettingsValues]
): Promise<void> {
  if (isSyncedSettingKey(key)) {
    await db.settings.put({
      key: key,
      value: newValue as SettingsValues[typeof key],
    });
    return;
  }
  const localKey = key as LocalSettingKey;
  setLocalSetting(localKey, newValue as SettingsValues[typeof localKey]);

  // 如果修改的是 API 相关设置，更新请求队列配置
  if (key === "api_maxConcurrentRequests") {
    updateRequestQueueConfig();
  }
}
