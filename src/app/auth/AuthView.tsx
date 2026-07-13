import {
  getDefaultApiBaseUrl,
  getStoredApiBaseUrl,
  setApiBaseUrl,
} from "@/logic/api";
import { signInWithEmailPassword, signUpWithEmailPassword } from "@/logic/auth";
import {
  Accordion,
  Alert,
  Button,
  Center,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type AuthMode = "sign-in" | "sign-up";

export default function AuthView() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [configInfo, setConfigInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiBaseUrl, setApiBaseUrlInput] = useState(
    getStoredApiBaseUrl() || getDefaultApiBaseUrl()
  );
  const { t } = useTranslation();

  const modeText =
    mode === "sign-in"
      ? {
          title: t("auth.sign-in.title"),
          action: t("auth.sign-in.action"),
          switchLabel: t("auth.sign-in.switch-label"),
          switchAction: t("auth.sign-in.switch-action"),
          description: t("auth.sign-in.description"),
        }
      : {
          title: t("auth.sign-up.title"),
          action: t("auth.sign-up.action"),
          switchLabel: t("auth.sign-up.switch-label"),
          switchAction: t("auth.sign-up.switch-action"),
          description: t("auth.sign-up.description"),
        };

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError(t("auth.error.required"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === "sign-in") {
        await signInWithEmailPassword(email.trim(), password);
      } else {
        await signUpWithEmailPassword(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.failed"));
    } finally {
      setLoading(false);
    }
  }

  function handleSaveConnectionConfig() {
    try {
      // 如果输入框为空，使用默认值 /api
      const valueToSave = apiBaseUrl.trim() || getDefaultApiBaseUrl();
      setApiBaseUrl(valueToSave);
      setConfigInfo(t("auth.connection.saved"));
      setTimeout(() => window.location.reload(), 300);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.connection.failed")
      );
    }
  }

  return (
    <Center py="4rem" px="0.75rem" w="100%">
      <Stack gap="md" maw={420} w="100%">
        <Title order={2}>{modeText.title}</Title>
        <Text c="dimmed" size="sm">
          {modeText.description}
        </Text>
        {error ? (
          <Alert color="red" title={t("auth.error.title")}>
            {error}
          </Alert>
        ) : null}
        {configInfo ? (
          <Alert color="green" title={t("auth.connection.settings-title")}>
            {configInfo}
          </Alert>
        ) : null}
        <TextInput
          required={true}
          label={t("auth.email-label")}
          placeholder={t("auth.email-placeholder")}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          autoComplete="email"
        />
        <PasswordInput
          required={true}
          label={t("auth.password-label")}
          placeholder={t("auth.password-placeholder")}
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          autoComplete={
            mode === "sign-in" ? "current-password" : "new-password"
          }
        />
        <Button loading={loading} onClick={handleSubmit}>
          {modeText.action}
        </Button>
        <Accordion chevronPosition="right" variant="separated">
          <Accordion.Item value="connection">
            <Accordion.Control>{t("auth.connection.title")}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <TextInput
                  label={t("auth.connection.api-url-label")}
                  placeholder={t("auth.connection.api-url-placeholder")}
                  value={apiBaseUrl}
                  onChange={(event) =>
                    setApiBaseUrlInput(event.currentTarget.value)
                  }
                />
                <Button variant="default" onClick={handleSaveConnectionConfig}>
                  {t("auth.connection.save-reload")}
                </Button>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {modeText.switchLabel}
          </Text>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() =>
              setMode((current) =>
                current === "sign-in" ? "sign-up" : "sign-in"
              )
            }
          >
            {modeText.switchAction}
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
