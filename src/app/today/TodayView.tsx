import EmptyNotice from "@/components/EmptyNotice";
import {
  DeckCardCounts,
  getDeckCardCountsBulk,
} from "@/logic/card/getDeckCardCounts";
import { useTodayNewCardsCount } from "@/logic/dailyNewCards";
import { useDecks } from "@/logic/deck/hooks/useDecks";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDocumentTitle } from "@mantine/hooks";
import {
  IconBolt,
  IconCalendar,
  IconCards,
  IconFile,
  IconSparkles,
} from "@tabler/icons-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import { TodayDeckItem } from "./TodayDeckItem";
import classes from "./TodayView.module.css";

function TodayView() {
  const [t] = useTranslation();
  const navigate = useNavigate();
  useDocumentTitle(`${t("today.title")} | Akasha`);

  const [decks, areDecksReady] = useDecks();
  const todayNewCardsCount = useTodayNewCardsCount();
  const [maxNewCardsPerDay] = useSetting("learn_maxNewCardsPerDay");
  const [deckCounts, setDeckCounts] = useState<Record<string, DeckCardCounts>>(
    {}
  );
  const [areCountsReady, setAreCountsReady] = useState<boolean>(false);

  useEffect(() => {
    if (!decks) {
      setDeckCounts({});
      setAreCountsReady(false);
      return;
    }
    let active = true;
    setAreCountsReady(false);
    getDeckCardCountsBulk(decks.map((deck) => deck.id)).then((counts) => {
      if (active) {
        setDeckCounts(counts);
        setAreCountsReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [decks]);

  // Filter decks that have cards
  const decksWithCards = useMemo(() => {
    if (!decks) return [];
    return decks.filter((deck) => {
      const counts = deckCounts[deck.id];
      if (!counts) return false;
      return counts.new + counts.learning + counts.review > 0;
    });
  }, [decks, deckCounts]);

  const totalCounts = useMemo(() => {
    return decksWithCards.reduce(
      (acc, deck) => {
        const counts = deckCounts[deck.id];
        if (!counts) return acc;
        return {
          new: acc.new + counts.new,
          learning: acc.learning + counts.learning,
          review: acc.review + counts.review,
        };
      },
      { new: 0, learning: 0, review: 0 }
    );
  }, [decksWithCards, deckCounts]);

  const hasDueCards = decksWithCards.length > 0;
  const isDecksReady = areDecksReady && areCountsReady;

  return (
    <Stack gap="md">
      <AppHeaderContent>
        <Title order={3}>
          <Center>{t("today.title")}</Center>
        </Title>
      </AppHeaderContent>

      {/* Today's Overview Card */}
      <Card withBorder shadow="sm" padding="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <IconCalendar size={24} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="lg" fw={600}>
                  {t("today.overview-title")}
                </Text>
                <Text size="sm" c="dimmed">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </div>
            </Group>
            {maxNewCardsPerDay > 0 && (
              <Badge size="lg" variant="light">
                {t("today.new-cards-progress", {
                  count: todayNewCardsCount,
                  limit: maxNewCardsPerDay,
                })}
              </Badge>
            )}
          </Group>

          <Divider />

          {/* Stats Grid */}
          <Group justify="center" gap="xl">
            <Paper className={classes.statCard} withBorder p="md">
              <Center>
                <IconSparkles size={28} color="var(--mantine-color-grape-6)" />
              </Center>
              <Text ta="center" size="xl" fw={700} mt="xs">
                {totalCounts.new}
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                {t("deck.new-cards-label", { count: totalCounts.new })}
              </Text>
            </Paper>

            <Paper className={classes.statCard} withBorder p="md">
              <Center>
                <IconBolt size={28} color="var(--mantine-color-orange-6)" />
              </Center>
              <Text ta="center" size="xl" fw={700} mt="xs">
                {totalCounts.learning}
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                {t("deck.learning-cards-label", {
                  count: totalCounts.learning,
                })}
              </Text>
            </Paper>

            <Paper className={classes.statCard} withBorder p="md">
              <Center>
                <IconCards size={28} color="var(--mantine-color-blue-6)" />
              </Center>
              <Text ta="center" size="xl" fw={700} mt="xs">
                {totalCounts.review}
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                {t("deck.review-cards-label", { count: totalCounts.review })}
              </Text>
            </Paper>
          </Group>

          {hasDueCards && (
            <Center mt="md">
              <Button
                size="lg"
                leftSection={<IconBolt />}
                onClick={() => navigate("/home")}
              >
                {t("today.start-learning")}
              </Button>
            </Center>
          )}
        </Stack>
      </Card>

      {/* Due Decks List */}
      <Card withBorder shadow="sm" padding="lg">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text size="lg" fw={600}>
              {t("today.due-decks-title")}
            </Text>
            <Badge size="lg" color="blue">
              {t("today.total-due", { count: decksWithCards.length })}
            </Badge>
          </Group>

          <Divider />

          {!isDecksReady ? (
            <Center py="xl">
              <Text c="dimmed">{t("today.loading-decks")}</Text>
            </Center>
          ) : decksWithCards.length === 0 ? (
            <EmptyNotice
              icon={IconFile}
              description={t("today.no-due-decks")}
            />
          ) : (
            <Stack gap="xs">
              {decksWithCards.map((deck, i) => (
                <TodayDeckItem key={deck.id} deck={deck} i={i} />
              ))}
            </Stack>
          )}
        </Stack>
      </Card>

      {/* Congratulatory Message when no due cards */}
      {!hasDueCards && isDecksReady && (
        <Alert
          color="green"
          title={t("today.all-done-title")}
          icon={<IconSparkles />}
          variant="light"
        >
          {t("today.all-done-message")}
        </Alert>
      )}
    </Stack>
  );
}

export default TodayView;
