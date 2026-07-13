import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import ModalProps from "./ModalProps";

interface NewCardsLimitModalProps extends ModalProps {
  todayCount: number;
  limit: number;
  onReviewOnly: () => void;
  onMixedRatio: () => void;
}

export default function NewCardsLimitModal({
  opened,
  setOpened,
  todayCount,
  limit,
  onReviewOnly,
  onMixedRatio,
}: NewCardsLimitModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      title={t("new-cards-limit.title")}
      opened={opened}
      onClose={() => setOpened(false)}
    >
      <Stack>
        <Text fz="sm">
          {t("new-cards-limit.description", { count: todayCount, limit })}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setOpened(false)}>
            {t("global.cancel")}
          </Button>
          <Button
            data-autofocus
            onClick={() => {
              onReviewOnly();
              setOpened(false);
            }}
          >
            {t("new-cards-limit.review-only")}
          </Button>
          <Button
            color="blue"
            onClick={() => {
              onMixedRatio();
              setOpened(false);
            }}
          >
            {t("new-cards-limit.mixed-ratio")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
