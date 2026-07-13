import ListButton from "@/components/ListButton/ListButton";
import type { DeckCardCounts } from "@/logic/card/getDeckCardCounts";
import { Alert, Badge, Group, Text } from "@mantine/core";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DeckSummary } from "../../logic/deck/deck";
import badge from "./Badge.module.css";

type DeckPreviewProps = {
  deck: DeckSummary;
  i: number;
  counts?: DeckCardCounts;
  countsReady: boolean;
};

export default function DeckPreview({
  deck,
  i,
  counts,
  countsReady,
}: DeckPreviewProps) {
  const navigate = useNavigate();
  const [t] = useTranslation();
  const states = counts ?? { new: 0, learning: 0, review: 0 };

  return (
    <ListButton
      i={i}
      onClick={() => {
        navigate("/deck/" + deck.id);
      }}
    >
      {deck ? (
        <Group justify="space-between" w="100%" wrap="nowrap">
          <Text>{deck.name}</Text>
          <Group gap="xs" wrap="nowrap">
            {countsReady && states.review > 0 ? (
              <Badge variant="light" color="blue" classNames={badge}>
                {t("deck.review-cards-label", { count: states.review })}
              </Badge>
            ) : (
              <></>
            )}
            {countsReady && states.new > 0 ? (
              <Badge variant="light" color="grape" classNames={badge}>
                {t("deck.new-cards-label", { count: states.new })}
              </Badge>
            ) : (
              <></>
            )}
            {countsReady && states.learning > 0 ? (
              <Badge variant="light" color="orange" classNames={badge}>
                {t("deck.learning-cards-label", {
                  count: states.learning,
                })}
              </Badge>
            ) : (
              <></>
            )}
          </Group>
        </Group>
      ) : (
        <Alert title={t("global.error")} color="red" variant="filled">
          {t("deck.error-failed-to-load")}
        </Alert>
      )}
    </ListButton>
  );
}
