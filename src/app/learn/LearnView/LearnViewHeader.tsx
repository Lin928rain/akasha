import ConnectionStatusIndicator from "@/app/shell/Header/ConnectionStatusIndicator";
import TtsSettingsPanel from "@/components/TtsSettings/TtsSettingsPanel";
import { VoiceControlToggle } from "@/components/VoiceControl/VoiceControlToggle";
import { Card } from "@/logic/card/card";
import { Deck } from "@/logic/deck/deck";
import { LearnController } from "@/logic/learn";
import { NoteType } from "@/logic/note/note";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Kbd,
  Popover,
  Progress,
  Text,
  Tooltip,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconArrowDown, IconSettings, IconX } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { StopwatchResult, useStopwatch } from "react-timer-hook";
import CardMenu from "../../editor/CardMenu";
import RemainingCardsIndicator from "../RemainingCardsIndicator/RemainingCardsIndicator";
import classes from "./LearnView.module.css";

export let stopwatchResult: StopwatchResult;

function Stopwatch() {
  const stopwatch = useStopwatch({ autoStart: true });

  useEffect(() => {
    stopwatchResult = stopwatch;
  }, [stopwatch]);

  return <></>;
}

interface VoiceControlProps {
  isListening: boolean;
  isSupported: boolean;
  isEnabled: boolean;
  onToggle: () => void;
  error?: string | null;
}

interface LearnViewHeaderProps {
  currentCard: Card<NoteType> | undefined;
  controller: LearnController;
  deck?: Deck;
  voiceControlProps?: VoiceControlProps;
}

function LearnViewHeader({
  currentCard,
  controller,
  deck,
  voiceControlProps,
}: LearnViewHeaderProps) {
  const [t] = useTranslation();
  const navigate = useNavigate();

  useHotkeys([["d", () => navigate("/deck/" + deck?.id)]]);

  const isLimitReached =
    controller.phase === "limit-reached" || controller.phase === "finishing";
  const progress = useMemo(() => {
    if (controller.isFinished) return 100;
    return Math.min(100, controller.progress);
  }, [controller.isFinished, controller.progress]);

  return (
    <>
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" gap="xs">
          <Tooltip
            label={
              <>
                {t("learning.back-to-deck")} <Kbd>d</Kbd>
              </>
            }
          >
            <ActionIcon
              onClick={() => navigate("/deck/" + deck?.id)}
              variant="subtle"
              color="gray"
            >
              <IconX />
            </ActionIcon>
          </Tooltip>
          <Stopwatch />
        </Group>

        <Group justify="flex-end" wrap="nowrap" gap="xs">
          <ConnectionStatusIndicator />
          <RemainingCardsIndicator controller={controller} />
          {voiceControlProps && (
            <VoiceControlToggle {...voiceControlProps} />
          )}
          {isLimitReached && (
            <Group gap={6} wrap="nowrap">
              <Text fz="sm" c="red" style={{ whiteSpace: "nowrap" }}>
                已接触 {controller.uniqueCardsCount}/
                {controller.uniqueCardsLimit} 张卡片
              </Text>
              {controller.phase === "limit-reached" && (
                <>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={controller.finishUp}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    开始收尾
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => navigate("/deck/" + deck?.id)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    结束学习
                  </Button>
                </>
              )}
              {controller.phase === "finishing" && (
                <Text fz="sm" c="orange" style={{ whiteSpace: "nowrap" }}>
                  (收尾中)
                </Text>
              )}
            </Group>
          )}
          <Popover width={320} position="bottom-end" withArrow shadow="md">
            <Popover.Target>
              <Tooltip label={t("settings.learn.tts-title")}>
                <ActionIcon variant="subtle" color="gray">
                  <IconSettings />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown>
              <TtsSettingsPanel />
            </Popover.Dropdown>
          </Popover>
          <CardMenu card={currentCard} onDelete={controller.requestNextCard} />
        </Group>
      </Group>

      <Box pos="relative" w="100%">
        <Progress
          className={classes.progressBar}
          size="xs"
          value={progress}
          color={isLimitReached ? "red" : "blue"}
          transitionDuration={200}
          radius={0}
          w="100%"
        />

        {isLimitReached && controller.newCardPositions.length > 0 && (
          <Box
            pos="absolute"
            top={-30}
            left={0}
            right={0}
            h={40}
            style={{ pointerEvents: "none" }}
          >
            {controller.newCardPositions.map((pos) => (
              <Box
                key={pos.cardId}
                pos="absolute"
                left={`${pos.queuePercentage}%`}
                style={{
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <IconArrowDown color="green" size={16} />
                <Text fz="10px" c="green" fw={700}>
                  第 {pos.position} 位
                </Text>
                <Text fz="9px" c="dimmed">
                  {pos.dueInMinutes} 分钟后
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </>
  );
}

export default LearnViewHeader;
