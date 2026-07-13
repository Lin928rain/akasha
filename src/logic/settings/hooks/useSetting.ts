import { useEffect, useState } from "react";
import { db } from "../../db";
import { useDbQuery } from "../../useDbQuery";
import { SettingsValues, isSyncedSettingKey } from "../Settings";
import { defaultSettings } from "../defaultSettings";
import { getLocalSetting, subscribeLocalSettings } from "../localSettings";

export function useSetting<T extends keyof SettingsValues>(
  key: T
): [SettingsValues[T], boolean] {
  const isSynced = isSyncedSettingKey(key);

  const [localValue, setLocalValue] = useState<SettingsValues[T]>(() => {
    if (isSynced) {
      return defaultSettings[key];
    }

    return (
      (getLocalSetting(key as never) as SettingsValues[T] | undefined) ??
      defaultSettings[key]
    );
  });

  useEffect(() => {
    if (isSynced) {
      return undefined;
    }

    const update = () => {
      setLocalValue(
        (getLocalSetting(key as never) as SettingsValues[T] | undefined) ??
          defaultSettings[key]
      );
    };

    update();
    return subscribeLocalSettings(update);
  }, [isSynced, key]);

  const [syncedValue, syncedReady] = useDbQuery(
    () =>
      isSynced
        ? db.settings
            .get(key)
            .then(
              (setting) =>
                [
                  (setting?.value as SettingsValues[T]) ?? defaultSettings[key],
                  true,
                ] as [SettingsValues[T], boolean]
            )
        : Promise.resolve([defaultSettings[key], false] as [
            SettingsValues[T],
            boolean,
          ]),
    [key],
    [defaultSettings[key], false]
  );

  return isSynced ? [syncedValue, syncedReady] : [localValue, true];
}
