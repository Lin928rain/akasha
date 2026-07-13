import ListButton from "@/components/ListButton/ListButton";
import { useDeckCardCounts } from "@/logic/card/hooks/useDeckCardCounts";
import { Badge, Group, Text } from "@mantine/core";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DeckSummary } from "../../logic/deck/deck";

interface TodayDeckItemProps {
  deck: DeckSummary;
  i: number;
}

export function TodayDeckItem({ deck, i }: TodayDeckItemProps) {
  const navigate = useNavigate();
  const [t] = useTranslation();
  const [counts] = useDeckCardCounts(deck.id);

  const total =
    (counts?.new ?? 0) + (counts?.learning ?? 0) + (counts?.review ?? 0);

  if (total === 0) {
    return null;
  }

  return (
    <ListButton
      i={i}
      onClick={() => {
        navigate("/deck/" + deck.id);
      }}
    >
      <Group justify="space-between" w="100%" wrap="nowrap">
        <Text fw={500}>{deck.name}</Text>
        <Group gap="xs" wrap="nowrap">
          {(counts?.review ?? 0) > 0 && (
            <Badge variant="light" color="blue">
              {t("deck.review-cards-label", { count: counts?.review ?? 0 })}
            </Badge>
          )}
          {(counts?.new ?? 0) > 0 && (
            <Badge variant="light" color="grape">
              {t("deck.new-cards-label", { count: counts?.new ?? 0 })}
            </Badge>
          )}
          {(counts?.learning ?? 0) > 0 && (
            <Badge variant="light" color="orange">
              {t("deck.learning-cards-label", {
                count: counts?.learning ?? 0,
              })}
            </Badge>
          )}
        </Group>
      </Group>
    </ListButton>
  );
}
