import { Group, Text } from "@mantine/core";
import {
  IconBook,
  IconCircleArrowUpRight,
  IconInfoCircle,
  IconProps,
  IconSparkles,
} from "@tabler/icons-react";
import { Card as Model } from "fsrs.js";
import { State } from "fsrs.js";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import classes from "./LearnViewCurrentCardStateIndicator.module.css";

interface LearnViewCurrentCardStateIndicatorProps {
  currentCardModel: Model | undefined;
}

function Indicator({
  color,
  icon: Icon,
  text,
}: {
  color: string;
  icon: React.FC<IconProps>;
  text: string;
}) {
  return (
    <Group
      className={classes.indicator}
      gap="0.25rem"
      align="center"
      style={{
        color: `var(--mantine-color-${color}-strong`,
      }}
    >
      <Icon size={16} />
      <Text fz="sm" fw={500}>
        {text}
      </Text>
    </Group>
  );
}

export default function LearnViewCurrentCardStateIndicator({
  currentCardModel,
}: LearnViewCurrentCardStateIndicatorProps) {
  const [t] = useTranslation();
  const indicator = useCallback(() => {
    if (currentCardModel === undefined) {
      return;
    }
    if (currentCardModel.state === State.New) {
      return (
        <Indicator
          color="grape"
          icon={IconSparkles}
          text={t("learning.new-card")}
        />
      );
    } else if (
      currentCardModel.state === State.Learning ||
      currentCardModel.state === State.Relearning
    ) {
      return (
        <Indicator
          color="orange"
          icon={IconCircleArrowUpRight}
          text={t("learning.learn-card")}
        />
      );
    } else if (
      currentCardModel.state === State.Review &&
      currentCardModel.due <= new Date(Date.now())
    ) {
      return (
        <Indicator
          color="blue"
          icon={IconBook}
          text={t("learning.review-card")}
        />
      );
    } else {
      return (
        <Indicator
          color="gray"
          icon={IconInfoCircle}
          text={t("learning.already-learned")}
        />
      );
    }
  }, [currentCardModel, t]);

  if (currentCardModel === undefined) {
    return null;
  }

  return indicator();
}
