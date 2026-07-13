import { useEffect, useMemo, useState } from "react";
import { db } from "../../db";
import { useDbQuery } from "../../useDbQuery";
import { Settings, SettingsValues, isSyncedSettingKey } from "../Settings";
import { defaultSettings } from "../defaultSettings";
import { getLocalSettings, subscribeLocalSettings } from "../localSettings";

export function useSettings(): [SettingsValues, boolean] {
  const [localSettings, setLocalSettings] = useState(getLocalSettings());

  useEffect(() => {
    const update = () => setLocalSettings(getLocalSettings());
    update();
    return subscribeLocalSettings(update);
  }, []);

  const [syncedSettings, syncedReady] = useDbQuery(
    () =>
      db.settings
        .toArray()
        .then((settings: Array<Settings<keyof SettingsValues>> | undefined) => {
          const merged: SettingsValues = { ...defaultSettings };
          const mutable = merged as unknown as Record<
            string,
            SettingsValues[keyof SettingsValues]
          >;
          (settings ?? []).forEach((cur) => {
            if (isSyncedSettingKey(cur.key)) {
              mutable[cur.key] = cur.value;
            }
          });
          return [merged, true];
        }),
    [],
    [defaultSettings, false]
  );

  const merged = useMemo<SettingsValues>(() => {
    return {
      ...syncedSettings,
      ...(localSettings as Partial<SettingsValues>),
    };
  }, [localSettings, syncedSettings]);

  return [merged, syncedReady];
}
