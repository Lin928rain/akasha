import EmptyNotice from "@/components/EmptyNotice";
import NewCardsLimitModal from "@/components/NewCardsLimitModal";
import Stat from "@/components/Stat/Stat";
import { useDeckCardCounts } from "@/logic/card/hooks/useDeckCardCounts";
import { useTodayNewCardsCount } from "@/logic/dailyNewCards";
import { DeckSummary } from "@/logic/deck/deck";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import {
  IconBolt,
  IconBook,
  IconCircleArrowUpRight,
  IconFile,
  IconSparkles,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import classes from "./HeroDeckSection.module.css";

interface HeroDeckSectionProps {
  deck?: DeckSummary;
  isDeckReady: boolean;
}

function HeroDeckSection({ deck, isDeckReady }: HeroDeckSectionProps) {
  const navigate = useNavigate();
  const [t] = useTranslation();
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const [counts, areCountsReady] = useDeckCardCounts(deck?.id);

  const [maxNewCardsPerDay] = useSetting("learn_maxNewCardsPerDay");
  const todayNewCardsCount = useTodayNewCardsCount();
  const isLoadingCounts =
    !isDeckReady || !areCountsReady || (!!deck && !counts);

  function isDone() {
    if (!counts) {
      return true;
    }
    return counts.new + counts.learning + counts.review === 0;
  }

  function startLearning(learnMode?: "review-only" | "mixed") {
    let url = `/learn/${deck?.id}`;
    if (isDone()) {
      url += "/all";
    }
    if (learnMode === "review-only") {
      url += "?newCardsLimit=0";
    } else if (learnMode === "mixed") {
      // mixed 模式下，突破每日新卡片限制，只受单次学习卡片数量上限限制
      url += "?newCardsLimitUnlimited=1";
    }
    navigate(url);
  }

  function handleStartLearning() {
    if (!deck) return;

    // 检查是否已达到今日新卡片上限
    if (
      maxNewCardsPerDay > 0 &&
      todayNewCardsCount >= maxNewCardsPerDay &&
      (counts?.new ?? 0) > 0
    ) {
      openModal();
      return;
    }

    startLearning();
  }

  useHotkeys([["Space", handleStartLearning]]);

  return (
    <Paper className={classes.container} withBorder shadow="xs">
      {isLoadingCounts ? (
        <Text c="dimmed" fw={600}>
          {t("hero-deck-section.loading")}
        </Text>
      ) : counts ? (
        counts.new + counts.learning + counts.review === 0 ? (
          <EmptyNotice
            icon={IconFile}
            description={t("hero-deck-section.no-cards")}
          />
        ) : isDone() ? (
          <Stack gap="md" align="center">
            <Title order={3}>
              {t("hero-deck-section.all-cards-done-title")}
            </Title>
            <Text fz="sm">
              {t("hero-deck-section.all-cards-done-subtitle")}
            </Text>
            <Button variant="subtle" w="50%" onClick={handleStartLearning}>
              {t("hero-deck-section.all-cards-done-learn-anyway")}
            </Button>
          </Stack>
        ) : (
          <Stack gap="md" align="center" w="100%">
            <Group
              wrap="nowrap"
              w="100%"
              justify="center"
              className={classes.statsGroup}
            >
              <Stat
                value={counts.new}
                name={t("deck.new-cards-label")}
                color="grape"
                icon={IconSparkles}
              />
              <Stat
                value={counts.learning}
                name={t("deck.learning-cards-label")}
                color="orange"
                icon={IconCircleArrowUpRight}
              />
              <Stat
                value={counts.review}
                name={t("deck.review-cards-label")}
                color="blue"
                icon={IconBook}
              />
            </Group>
            {maxNewCardsPerDay > 0 && (
              <Text fz="xs" c="dimmed">
                {t("hero-deck-section.today-new-cards", {
                  count: todayNewCardsCount,
                  limit: maxNewCardsPerDay,
                })}
              </Text>
            )}
            <Button
              disabled={
                !deck || counts.new + counts.learning + counts.review === 0
              }
              leftSection={<IconBolt />}
              w="50%"
              onClick={handleStartLearning}
            >
              {t("hero-deck-section.learn")}
            </Button>
          </Stack>
        )
      ) : null}

      <NewCardsLimitModal
        opened={modalOpened}
        setOpened={closeModal}
        todayCount={todayNewCardsCount}
        limit={maxNewCardsPerDay}
        onReviewOnly={() => startLearning("review-only")}
        onMixedRatio={() => startLearning("mixed")}
      />
    </Paper>
  );
}

export default HeroDeckSection;
