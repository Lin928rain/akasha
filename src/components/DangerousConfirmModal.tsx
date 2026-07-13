import { runWithoutDbNotifications } from "@/logic/db";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import React, { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import ModalProps from "./ModalProps";

interface DangerousConfirmModalProps extends ModalProps {
  dangerousAction: Function;
  dangerousDependencies: Array<any>;
  dangerousTitle: string;
  dangerousDescription: ReactNode;
  suppressDbNotifications?: boolean;
}

function DangerousConfirmModal({
  dangerousDependencies,
  dangerousAction,
  dangerousTitle,
  dangerousDescription,
  opened,
  setOpened,
  suppressDbNotifications,
}: DangerousConfirmModalProps) {
  const [t] = useTranslation();
  const [isRunning, setIsRunning] = useState(false);

  async function handleConfirm() {
    if (isRunning) return;
    setIsRunning(true);
    try {
      if (suppressDbNotifications) {
        await runWithoutDbNotifications(() =>
          Promise.resolve(dangerousAction(...dangerousDependencies))
        );
      } else {
        await Promise.resolve(dangerousAction(...dangerousDependencies));
      }
      setOpened(false);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Modal
      title={dangerousTitle}
      opened={opened}
      onClose={() => {
        if (!isRunning) {
          setOpened(false);
        }
      }}
    >
      <Stack>
        <Text fz="sm">{dangerousDescription}</Text>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            disabled={isRunning}
            onClick={() => setOpened(false)}
          >
            {t("global.cancel")}
          </Button>
          <Button
            data-autofocus
            color="red"
            loading={isRunning}
            onClick={handleConfirm}
          >
            {dangerousTitle}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default DangerousConfirmModal;
