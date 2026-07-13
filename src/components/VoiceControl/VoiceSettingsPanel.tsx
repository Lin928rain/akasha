/**
 * 语音控制设置面板组件
 */

import { SettingStatus, StatusIndicator } from "@/app/settings/SettingStatus";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { setSetting } from "@/logic/settings/setSetting";
import {
  Switch,
  Select,
  Slider,
  Stack,
  Text,
  Group,
  Badge,
  Box,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAvailableCommands } from "@/logic/voice/voiceCommands";

export default function VoiceSettingsPanel() {
  const { t } = useTranslation();

  const [enabled] = useSetting("voice_control_enabled");
  const [language] = useSetting("voice_control_language");
  const [confidenceThreshold] = useSetting(
    "voice_control_confidence_threshold"
  );

  const [languageStatus, setLanguageStatus] = useState(SettingStatus.NONE);
  const [thresholdStatus, setThresholdStatus] = useState(SettingStatus.NONE);
  const [debouncedThreshold] = useDebouncedValue(confidenceThreshold, 300);

  // 获取可用命令列表用于帮助提示
  const zhCommands = getAvailableCommands('zh');
  const enCommands = getAvailableCommands('en');

  useEffect(() => {
    setThresholdStatus(SettingStatus.LOADING);
    setSetting("voice_control_confidence_threshold", debouncedThreshold)
      .then(() => setThresholdStatus(SettingStatus.SUCCESS))
      .catch(() => setThresholdStatus(SettingStatus.FAILED));
  }, [debouncedThreshold]);

  const handleLanguageChange = (value: string | null) => {
    if (!value) return;
    setLanguageStatus(SettingStatus.LOADING);
    setSetting("voice_control_language", value as 'zh' | 'en')
      .then(() => setLanguageStatus(SettingStatus.SUCCESS))
      .catch(() => setLanguageStatus(SettingStatus.FAILED));
  };

  const displayCommands = language === 'zh' ? zhCommands : enCommands;

  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} mb="md">
          {t("settings.voice.title")}
        </Text>

        <Stack gap="md">
          {/* 启用开关 */}
          <Switch
            label={t("settings.voice.enabled")}
            description={t("settings.voice.enabled-description")}
            checked={enabled as boolean}
            onChange={(event) => setSetting("voice_control_enabled", event.currentTarget.checked)}
            size="md"
          />

          {/* 语言选择 */}
          <Box>
            <Select
              label={t("settings.voice.language")}
              description={t("settings.voice.language-description")}
              value={language}
              data={[
                { value: 'zh', label: t("settings.voice.language-zh") },
                { value: 'en', label: t("settings.voice.language-en") },
              ]}
              onChange={handleLanguageChange}
              rightSection={<StatusIndicator status={languageStatus} />}
              disabled={!enabled as boolean}
            />
          </Box>

          {/* 置信度阈值 */}
          <Box>
            <Text size="sm" fw={500} mb="xs">
              {t("settings.voice.confidence-threshold")}
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              {t("settings.voice.confidence-threshold-description")}
            </Text>
            <Group gap="md" align="flex-end">
              <Slider
                value={confidenceThreshold as number}
                onChange={(value) => setSetting("voice_control_confidence_threshold", value)}
                min={0.3}
                max={0.95}
                step={0.05}
                marks={[
                  { value: 0.3, label: '0.3' },
                  { value: 0.5, label: '0.5' },
                  { value: 0.7, label: '0.7' },
                  { value: 0.9, label: '0.9' },
                ]}
                style={{ flex: 1 }}
                disabled={!enabled as boolean}
              />
              <Badge size="lg" variant="filled">
                {(confidenceThreshold as number * 100).toFixed(0)}%
              </Badge>
              <StatusIndicator status={thresholdStatus} />
            </Group>
          </Box>

          {/* 命令帮助 */}
          <Box mt="md">
            <Text size="sm" fw={500} mb="sm">
              {t("settings.voice.available-commands")}
            </Text>
            <Stack gap="xs">
              {Object.entries(displayCommands).map(([commandType, keywords]) => (
                <Group key={commandType} gap="xs" wrap="nowrap">
                  <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>
                    {t(`settings.voice.command.${commandType}`)}
                  </Text>
                  <Group gap="xs">
                    {keywords.slice(0, 5).map((keyword) => (
                      <Badge key={keyword} size="sm" variant="light">
                        {keyword}
                      </Badge>
                    ))}
                  </Group>
                </Group>
              ))}
            </Stack>
          </Box>

          {/* 使用提示 */}
          <Box mt="md" p="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)', borderRadius: 'var(--mantine-radius-md)' }}>
            <Text size="sm" fw={500} mb="xs">
              {t("settings.voice.tips-title")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("settings.voice.tips-content")}
            </Text>
          </Box>
        </Stack>
      </div>
    </Stack>
  );
}
