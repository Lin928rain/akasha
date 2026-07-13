import { changePassword } from "@/logic/auth";
import {
  Alert,
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ChangePasswordModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({
  opened,
  onClose,
}: ChangePasswordModalProps) {
  const [t] = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("settings.account.password.error.required"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("settings.account.password.error.mismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("settings.account.password.error.too-short"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // 成功后延迟关闭
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("settings.account.password.error.failed")
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <Modal
      title={t("settings.account.password.title")}
      opened={opened}
      onClose={handleClose}
      centered
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" title={t("common.error")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            color="green"
            title={t("settings.account.password.success-title")}
          >
            {t("settings.account.password.success-message")}
          </Alert>
        )}

        <PasswordInput
          required
          label={t("settings.account.password.current-label")}
          placeholder={t("settings.account.password.current-placeholder")}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          autoComplete="current-password"
        />

        <PasswordInput
          required
          label={t("settings.account.password.new-label")}
          placeholder={t("settings.account.password.new-placeholder")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.currentTarget.value)}
          autoComplete="new-password"
        />

        <PasswordInput
          required
          label={t("settings.account.password.confirm-label")}
          placeholder={t("settings.account.password.confirm-placeholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          autoComplete="new-password"
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={loading} onClick={handleSubmit} disabled={success}>
            {t("settings.account.password.save-button")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
