import { SettingStatus, StatusIndicator } from "@/app/settings/SettingStatus";
import { genericFail } from "@/components/Notification/Notification";
import { getApiPrefix } from "@/logic/api";
import { getAccessToken } from "@/logic/auth";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { setSetting } from "@/logic/settings/setSetting";
import { clampTtsRate, formatTtsRate } from "@/logic/tts/ttsConfig";
import { useTtsVoices } from "@/logic/tts/useTtsVoices";
import { Button, Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Option = { value: string; label: string };

function buildOptions(voices: { name: string; friendly_name?: string }[]) {
  return voices.map((voice) => ({
    value: voice.name,
    label: voice.friendly_name || voice.name,
  }));
}

function mergeCurrentOption(options: Option[], current?: string) {
  if (!current) return options;
  if (options.some((option) => option.value === current)) {
    return options;
  }
  return [{ value: current, label: current }, ...options];
}

export default function TtsSettingsPanel() {
  const [t] = useTranslation();
  const [voiceZh] = useSetting("tts_voice_zh");
  const [voiceEn] = useSetting("tts_voice_en");
  const [rate] = useSetting("tts_rate");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [testingZh, setTestingZh] = useState(false);
  const [testingEn, setTestingEn] = useState(false);
  const { voices: zhVoices } = useTtsVoices("zh-CN");
  const { voices: enVoices } = useTtsVoices("en");

  const zhOptions = useMemo(
    () => mergeCurrentOption(buildOptions(zhVoices), voiceZh),
    [zhVoices, voiceZh]
  );
  const enOptions = useMemo(
    () => mergeCurrentOption(buildOptions(enVoices), voiceEn),
    [enVoices, voiceEn]
  );

  const [rateValue, setRateValue] = useState<number>(rate ?? 0);
  const [rateStatus, setRateStatus] = useState(SettingStatus.NONE);
  const [debouncedRate] = useDebouncedValue(rateValue, 300);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setRateValue(rate ?? 0);
  }, [rate]);

  useEffect(() => {
    if (!touched) return;
    setRateStatus(SettingStatus.LOADING);
    setSetting("tts_rate", clampTtsRate(debouncedRate))
      .then(() => setRateStatus(SettingStatus.SUCCESS))
      .catch(() => setRateStatus(SettingStatus.FAILED));
  }, [debouncedRate, touched]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const playSample = async (
    text: string,
    voice: string,
    setLoading: (value: boolean) => void
  ) => {
    if (!voice) return;
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication required.");
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      const response = await fetch(`${getApiPrefix()}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          text,
          voice,
          rate: formatTtsRate(rate ?? 0),
          stream: true,
        }),
      });
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Streaming response body is not available.");
      }
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
        }
      }
      const merged = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        merged.set(chunk, position);
        position += chunk.length;
      }
      const blob = new Blob([merged], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      await audio.play();
    } catch (error) {
      genericFail();
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="xs">
      <Text fw={600}>{t("settings.learn.tts-title")}</Text>
      <Select
        label={t("settings.learn.tts-voice-zh")}
        data={zhOptions}
        value={voiceZh}
        searchable
        onChange={(value) => {
          if (!value) return;
          setSetting("tts_voice_zh", value);
        }}
      />
      <Select
        label={t("settings.learn.tts-voice-en")}
        data={enOptions}
        value={voiceEn}
        searchable
        onChange={(value) => {
          if (!value) return;
          setSetting("tts_voice_en", value);
        }}
      />
      <NumberInput
        label={t("settings.learn.tts-rate")}
        description={t("settings.learn.tts-rate-description")}
        value={rateValue}
        min={-50}
        max={50}
        step={5}
        onChange={(value) => {
          setTouched(true);
          setRateValue(Number(value) || 0);
        }}
        rightSection={<StatusIndicator status={rateStatus} />}
      />
      <Stack gap="xs">
        <Text fw={500}>{t("settings.learn.tts-test-title")}</Text>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            loading={testingZh}
            onClick={() =>
              playSample(
                t("settings.learn.tts-test-zh-sample"),
                voiceZh,
                setTestingZh
              )
            }
          >
            {t("settings.learn.tts-test-zh")}
          </Button>
          <Button
            size="xs"
            variant="light"
            loading={testingEn}
            onClick={() =>
              playSample(
                t("settings.learn.tts-test-en-sample"),
                voiceEn,
                setTestingEn
              )
            }
          >
            {t("settings.learn.tts-test-en")}
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
}
