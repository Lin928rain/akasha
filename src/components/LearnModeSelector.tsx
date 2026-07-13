import type { CardGroup } from "@/logic/deck/deck";
import { Button, Modal, Radio, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface LearnModeSelectorProps {
  opened: boolean;
  setOpened: (opened: boolean) => void;
  cardGroups: CardGroup[];
  onConfirm: (groupId?: string) => void;
}

export function LearnModeSelector({
  opened,
  setOpened,
  cardGroups,
  onConfirm,
}: LearnModeSelectorProps) {
  const [t] = useTranslation();
  const [selectedMode, setSelectedMode] = useState<"all" | "group">("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();

  const handleConfirm = () => {
    if (selectedMode === "group" && !selectedGroupId) {
      // 如果选择了分组学习模式但没有选择具体分组，提示用户
      return;
    }
    const groupId = selectedMode === "group" ? selectedGroupId : undefined;
    onConfirm(groupId);
    setOpened(false);
  };

  const hasGroups = cardGroups.length > 0;
  const canConfirm =
    selectedMode === "all" || (selectedMode === "group" && selectedGroupId);

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={t("learn.mode-selector.title")}
      size="md"
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="md">
        <Radio.Group
          value={selectedMode}
          onChange={(value) => {
            setSelectedMode(value as "all" | "group");
            if (value === "all") {
              setSelectedGroupId(undefined);
            }
          }}
        >
          <Stack gap="xs">
            <Radio
              value="all"
              label={t("learn.mode-selector.all-cards")}
              description={t("learn.mode-selector.all-cards-description")}
            />
            <Radio
              value="group"
              label={t("learn.mode-selector.group-learning")}
              description={t("learn.mode-selector.group-learning-description")}
              disabled={!hasGroups}
            />
          </Stack>
        </Radio.Group>

        {selectedMode === "group" && hasGroups && (
          <Stack gap="xs" ml="md">
            <Title order={6}>{t("learn.mode-selector.select-group")}</Title>
            <Radio.Group
              value={selectedGroupId || ""}
              onChange={(value) => setSelectedGroupId(value || undefined)}
            >
              <Stack gap="xs">
                {cardGroups.map((group) => (
                  <Radio
                    key={group.id}
                    value={group.id}
                    label={
                      <Text size="sm">
                        {group.name} (
                        {t("learn.mode-selector.card-count", {
                          count: group.cardIds.length,
                        })}
                        )
                      </Text>
                    }
                  />
                ))}
              </Stack>
            </Radio.Group>
          </Stack>
        )}

        {!hasGroups && selectedMode === "group" && (
          <Text c="orange" size="sm">
            {t("learn.mode-selector.no-groups-available")}
          </Text>
        )}

        <Stack gap="xs" mt="sm">
          <Button onClick={handleConfirm} fullWidth disabled={!canConfirm}>
            {t("common.start")}
          </Button>
          <Button variant="default" onClick={() => setOpened(false)} fullWidth>
            {t("common.cancel")}
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}
