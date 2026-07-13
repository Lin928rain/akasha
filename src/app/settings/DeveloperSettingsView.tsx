import {
  clearApiBaseUrl,
  getApiBaseUrl,
  getApiPrefix,
  getDefaultApiBaseUrl,
  getStoredApiBaseUrl,
  setApiBaseUrl,
} from "@/logic/api";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { setSetting } from "@/logic/settings/setSetting";
import {
  Alert,
  Button,
  Code,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingStatus, StatusIndicator } from "./SettingStatus";

export default function DeveloperSettingsView() {
  const [t] = useTranslation();
  const [status, setStatus] = useState(SettingStatus.NONE);
  const [testStatus, setTestStatus] = useState(SettingStatus.NONE);
  const [value, setValue] = useState(getStoredApiBaseUrl() ?? "");
  const [debounced] = useDebouncedValue(value, 250);
  const defaultUrl = useMemo(() => getDefaultApiBaseUrl(), []);
  const [effectiveUrl, setEffectiveUrl] = useState(getApiBaseUrl());

  // API 请求设置 - 使用本地 state，保存时调用 setSetting
  const [maxConcurrentRequests] = useSetting("api_maxConcurrentRequests");
  const [requestRetryAttempts] = useSetting("api_requestRetryAttempts");
  const [requestRetryDelayMs] = useSetting("api_requestRetryDelayMs");

  const [localMaxConcurrentRequests, setLocalMaxConcurrentRequests] = useState(
    maxConcurrentRequests as number
  );
  const [localRequestRetryAttempts, setLocalRequestRetryAttempts] = useState(
    requestRetryAttempts as number
  );
  const [localRequestRetryDelayMs, setLocalRequestRetryDelayMs] = useState(
    requestRetryDelayMs as number
  );

  const [apiSettingsStatus, setApiSettingsStatus] = useState(
    SettingStatus.NONE
  );

  // AI API 设置
  const [aiApiBaseUrl] = useSetting("ai_apiBaseUrl");
  const [aiModelId] = useSetting("ai_modelId");

  const [localAiApiBaseUrl, setLocalAiApiBaseUrl] = useState(
    aiApiBaseUrl as string
  );
  const [localAiModelId, setLocalAiModelId] = useState(aiModelId as string);

  const [aiSettingsStatus, setAiSettingsStatus] = useState(SettingStatus.NONE);

  useEffect(() => {
    setLocalAiApiBaseUrl(aiApiBaseUrl as string);
    setLocalAiModelId(aiModelId as string);
  }, [aiApiBaseUrl, aiModelId]);

  const handleAiSettingsSave = async () => {
    try {
      setAiSettingsStatus(SettingStatus.LOADING);
      await Promise.all([
        setSetting("ai_apiBaseUrl", localAiApiBaseUrl),
        setSetting("ai_modelId", localAiModelId),
      ]);
      setAiSettingsStatus(SettingStatus.SUCCESS);
    } catch {
      setAiSettingsStatus(SettingStatus.FAILED);
    }
  };

  useEffect(() => {
    setEffectiveUrl(getApiBaseUrl());
  }, [debounced]);

  // 当设置从存储加载后，更新本地状态
  useEffect(() => {
    setLocalMaxConcurrentRequests(maxConcurrentRequests as number);
    setLocalRequestRetryAttempts(requestRetryAttempts as number);
    setLocalRequestRetryDelayMs(requestRetryDelayMs as number);
  }, [maxConcurrentRequests, requestRetryAttempts, requestRetryDelayMs]);

  const handleSave = () => {
    try {
      setStatus(SettingStatus.LOADING);
      const normalized = setApiBaseUrl(value);
      setEffectiveUrl(normalized);
      setStatus(SettingStatus.SUCCESS);
    } catch {
      setStatus(SettingStatus.FAILED);
    }
  };

  const handleReset = () => {
    try {
      setStatus(SettingStatus.LOADING);
      clearApiBaseUrl();
      const defaultValue = getApiBaseUrl();
      setValue(defaultValue);
      setEffectiveUrl(defaultValue);
      setStatus(SettingStatus.SUCCESS);
    } catch {
      setStatus(SettingStatus.FAILED);
    }
  };

  const handleTest = async () => {
    try {
      setTestStatus(SettingStatus.LOADING);
      const response = await fetch(`${getApiPrefix()}/health`);
      setTestStatus(response.ok ? SettingStatus.SUCCESS : SettingStatus.FAILED);
    } catch {
      setTestStatus(SettingStatus.FAILED);
    }
  };

  const handleApiSettingsSave = async () => {
    try {
      setApiSettingsStatus(SettingStatus.LOADING);
      await Promise.all([
        setSetting("api_maxConcurrentRequests", localMaxConcurrentRequests),
        setSetting("api_requestRetryAttempts", localRequestRetryAttempts),
        setSetting("api_requestRetryDelayMs", localRequestRetryDelayMs),
      ]);
      setApiSettingsStatus(SettingStatus.SUCCESS);
    } catch {
      setApiSettingsStatus(SettingStatus.FAILED);
    }
  };

  return (
    <Stack gap="lg" align="start">
      <Text size="sm">{t("settings.developer.description")}</Text>

      <Alert
        icon={<IconInfoCircle />}
        title="使用 nginx 代理模式"
        color="blue"
        variant="light"
      >
        <Text size="sm">
          使用 nginx 反向代理时，前后端统一通过 <Code>http://localhost</Code>{" "}
          访问，无需手动配置后端地址。
        </Text>
        <Text size="sm" mt="sm">
          仅在不使用 nginx 或访问远程后端时，才需要设置自定义地址。
        </Text>
      </Alert>

      <Text size="sm">{t("settings.developer.api-base-url-note")}</Text>
      <TextInput
        label={t("settings.developer.api-base-url")}
        description={t("settings.developer.api-base-url-description")}
        placeholder={t("settings.developer.api-base-url-placeholder")}
        value={value}
        onChange={(event) => {
          setStatus(SettingStatus.NONE);
          setValue(event.currentTarget.value);
        }}
        rightSection={<StatusIndicator status={status} />}
      />
      <Group gap="sm">
        <Button variant="filled" onClick={handleSave}>
          {t("settings.developer.api-base-url-save")}
        </Button>
        <Button variant="light" onClick={handleReset}>
          {t("settings.developer.api-base-url-reset")}
        </Button>
        <Button variant="default" onClick={handleTest}>
          {t("settings.developer.api-base-url-test")}
        </Button>
        <StatusIndicator status={testStatus} />
      </Group>
      <Stack gap={4}>
        <Text size="sm">
          {t("settings.developer.api-base-url-current")}:{" "}
          <Code>{effectiveUrl}</Code>
        </Text>
        <Text size="sm">
          {t("settings.developer.api-base-url-default")}:{" "}
          <Code>{defaultUrl}</Code>
        </Text>
      </Stack>

      <Title order={4} mt="lg">
        {t("settings.developer.api-request-settings")}
      </Title>

      <NumberInput
        label={t("settings.developer.max-concurrent-requests")}
        description={t(
          "settings.developer.max-concurrent-requests-description"
        )}
        value={localMaxConcurrentRequests}
        onChange={(value) =>
          setLocalMaxConcurrentRequests(
            typeof value === "number" ? value : Number(value)
          )
        }
        min={1}
        max={50}
        step={1}
      />

      <NumberInput
        label={t("settings.developer.request-retry-attempts")}
        description={t("settings.developer.request-retry-attempts-description")}
        value={localRequestRetryAttempts}
        onChange={(value) =>
          setLocalRequestRetryAttempts(
            typeof value === "number" ? value : Number(value)
          )
        }
        min={0}
        max={10}
        step={1}
      />

      <NumberInput
        label={t("settings.developer.request-retry-delay")}
        description={t("settings.developer.request-retry-delay-description")}
        value={localRequestRetryDelayMs}
        onChange={(value) =>
          setLocalRequestRetryDelayMs(
            typeof value === "number" ? value : Number(value)
          )
        }
        min={100}
        max={5000}
        step={100}
      />

      <Group gap="sm">
        <Button variant="filled" onClick={handleApiSettingsSave}>
          {t("settings.developer.api-base-url-save")}
        </Button>
        <StatusIndicator status={apiSettingsStatus} />
      </Group>

      <Title order={4} mt="lg">
        AI API 设置（自动造句）
      </Title>

      <Alert
        icon={<IconInfoCircle />}
        title="AI API 配置说明"
        color="blue"
        variant="light"
      >
        <Text size="sm">
          AI API 调用通过后端代理统一处理，API Key 由后端管理，无需在前端配置。
        </Text>
        <Text size="sm" mt="sm">
          只需配置 API 基础地址和模型 ID，后端会使用配置的 API 服务和模型进行调用。
        </Text>
      </Alert>

      <TextInput
        label="API 基础地址"
        description="AI API 的基础地址，例如 https://api.openai.com/v1 或 https://api.anthropic.com"
        value={localAiApiBaseUrl}
        onChange={(event) => {
          setAiSettingsStatus(SettingStatus.NONE);
          setLocalAiApiBaseUrl(event.currentTarget.value);
        }}
        placeholder="https://api.example.com/v1"
      />

      <TextInput
        label="模型 ID"
        description="要使用的 AI 模型 ID，例如 gpt-3.5-turbo 或 claude-sonnet-4-20250514"
        value={localAiModelId}
        onChange={(event) => {
          setAiSettingsStatus(SettingStatus.NONE);
          setLocalAiModelId(event.currentTarget.value);
        }}
        placeholder="gpt-3.5-turbo"
      />

      <Group gap="sm">
        <Button variant="filled" onClick={handleAiSettingsSave}>
          {t("settings.developer.api-base-url-save")}
        </Button>
        <StatusIndicator status={aiSettingsStatus} />
      </Group>
    </Stack>
  );
}
