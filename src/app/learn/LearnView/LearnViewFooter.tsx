import { Button, Group, Text, Stack } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Rating } from "fsrs.js";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LearnController } from "../../../logic/learn";
import {
  timeStringForRating,
  timeStringForSlashRating,
} from "../../../logic/learnReview";
import AnswerCardButton from "./AnswerCardButton";
import classes from "./LearnView.module.css";

interface LearnViewFooterProps {
  controller: LearnController;
  answer: Function;
  onSlash?: () => void;
}

function LearnViewFooter({ controller, answer, onSlash }: LearnViewFooterProps) {
  const [t] = useTranslation();
  const [slashConfirmOpen, setSlashConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // 倒计时逻辑
  useEffect(() => {
    if (!slashConfirmOpen) {
      setCountdown(5);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setSlashConfirmOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [slashConfirmOpen]);

  const handleSlashClick = useCallback(() => {
    if (slashConfirmOpen) {
      // 二次确认，执行斩
      onSlash?.();
      setSlashConfirmOpen(false);
    } else {
      // 第一次点击，打开确认
      setSlashConfirmOpen(true);
    }
  }, [slashConfirmOpen, onSlash]);

  useHotkeys(
    !controller.isFinished
      ? [
          ["1", () => answer(Rating.Again)],
          ["2", () => answer(Rating.Hard)],
          ["3", () => answer(Rating.Good)],
          ["4", () => answer(Rating.Easy)],
          ["5", () => handleSlashClick()],
          [
            "Space",
            () =>
              !controller.showingAnswer
                ? controller.showAnswer()
                : answer(Rating.Good),
          ],
          [
            "Enter",
            () =>
              !controller.showingAnswer
                ? controller.showAnswer()
                : answer(Rating.Good),
          ],
        ]
      : []
  );

  return (
    <Group className={classes.footerContainer} justify="center">
      {controller.showingAnswer ? (
        <Group gap="xs" wrap="nowrap" justify="center" w="100%" maw="25rem">
          <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
            <AnswerCardButton
              label={t("learning.rate-again")}
              timeInfo={timeStringForRating(
                Rating.Again,
                controller.currentCardRepeatInfo
              )}
              color="red"
              action={() => answer(Rating.Again)}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
            <AnswerCardButton
              label={t("learning.rate-hard")}
              timeInfo={timeStringForRating(
                Rating.Hard,
                controller.currentCardRepeatInfo
              )}
              color="yellow"
              action={() => answer(Rating.Hard)}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
            <AnswerCardButton
              label={t("learning.rate-good")}
              timeInfo={timeStringForRating(
                Rating.Good,
                controller.currentCardRepeatInfo
              )}
              color="green"
              action={() => answer(Rating.Good)}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
            <AnswerCardButton
              label={t("learning.rate-easy")}
              timeInfo={timeStringForRating(
                Rating.Easy,
                controller.currentCardRepeatInfo
              )}
              color="blue"
              action={() => answer(Rating.Easy)}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
            <SlashButton
              label={t("learning.rate-slash")}
              timeInfo={slashConfirmOpen ? `${countdown}s` : timeStringForSlashRating()}
              action={handleSlashClick}
              isConfirming={slashConfirmOpen}
              t={t}
            />
          </div>
        </Group>
      ) : (
        <Button onClick={controller.showAnswer} h="2.5rem">
          {t("learning.show-answer")}
        </Button>
      )}
    </Group>
  );
}

interface SlashButtonProps {
  label: string;
  timeInfo: string;
  action: () => void;
  isConfirming: boolean;
  t: (key: string) => string;
}

function SlashButton({ label, timeInfo, action, isConfirming, t }: SlashButtonProps) {
  const [bubbleOffset, setBubbleOffset] = useState(0);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConfirming) {
      setBubbleOffset(0);
      return;
    }

    // 等待 DOM渲染完成
    requestAnimationFrame(() => {
      if (bubbleRef.current) {
        const bubbleRect = bubbleRef.current.getBoundingClientRect();
        const screenPadding = 10; // 屏幕边缘留白

        // 检查是否超出左边界
        if (bubbleRect.left < screenPadding) {
          const overflow = screenPadding - bubbleRect.left;
          setBubbleOffset(overflow);
        }
        // 检查是否超出右边界
        else if (bubbleRect.right > window.innerWidth - screenPadding) {
          const overflow = bubbleRect.right - (window.innerWidth - screenPadding);
          setBubbleOffset(-overflow);
        }
        // 不超出时不重置 offset，保持上次的有效值
      }
    });
  }, [isConfirming]);

  return (
    <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
      <Button
        variant={isConfirming ? "outline" : "filled"}
        color="violet"
        onClick={action}
        h="2.5rem"
        px={0}
        fullWidth
        miw="0"
      >
        <Stack gap="0" align="center">
          <Text fz="xs" fw={400} lh="1">
            {timeInfo}
          </Text>
          <Text fz="sm" fw={600} lh="1.25">
            {label}
          </Text>
        </Stack>
      </Button>
      {isConfirming && (
        <div ref={bubbleRef} style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: `translateX(calc(-50% + ${bubbleOffset}px))`,
          marginBottom: '8px',
          backgroundColor: 'var(--mantine-color-body)',
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-default)',
          padding: 'var(--mantine-spacing-xs)',
          boxShadow: 'var(--mantine-shadow-md)',
          zIndex: 1000,
          width: 'min(280px, calc(100vw - 20px))',
          whiteSpace: 'nowrap',
        }}>
          <Text size="xs">
            {t("learning.slash-confirm-warning")}
          </Text>
          {/* 气泡箭头 - 外边框 */}
          <div style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: `translateX(calc(-50% - ${bubbleOffset}px))`,
            borderWidth: '6px',
            borderStyle: 'solid',
            borderColor: 'var(--mantine-color-default-border)',
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
          }} />
          {/* 气泡箭头 - 内填充 */}
          <div style={{
            position: 'absolute',
            bottom: '-10px',
            left: '50%',
            transform: `translateX(calc(-50% - ${bubbleOffset}px))`,
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: 'transparent',
            borderTopColor: 'var(--mantine-color-body)',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
          }} />
        </div>
      )}
    </div>
  );
}

export default LearnViewFooter;

/**/
