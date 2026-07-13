import { successfullyMovedCardTo } from "@/components/Notification/Notification";
import { DeckSummary } from "@/logic/deck/deck";
import { useDeckSummaries } from "@/logic/deck/hooks/useDeckSummaries";
import { moveDeck } from "@/logic/deck/moveDeck";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface MoveDeckModalProps {
  deck: DeckSummary;
  opened: boolean;
  setOpened: Function;
}

export default function MoveDeckModal({
  deck,
  opened,
  setOpened,
}: MoveDeckModalProps) {
  const [t] = useTranslation();
  const oldSuperDeck = deck.superDecks
    ? deck.superDecks[deck.superDecks.length - 1]
    : null;

  const [decks, areDecksReady] = useDeckSummaries((decks) =>
    decks?.filter((d) => d.id !== oldSuperDeck)
  );
  const [newDeckID, setNewDeckID] = useState<string | null>(null);

  return (
    <Modal
      title={t("move.move-deck-title")}
      opened={opened}
      onClose={() => setOpened(false)}
    >
      <Stack>
        <Select
          searchable
          label={t("move.move-to")}
          nothingFoundMessage={t("move.no-decks-found")}
          disabled={!areDecksReady}
          //withinPortal
          data={
            decks?.map((deck) => ({
              value: deck.id,
              label: deck.name,
            })) ?? []
          }
          value={newDeckID}
          onChange={(value) => {
            setNewDeckID(value);
          }}
        />
        {decks?.length === 0 && (
          <Text fz="sm">{t("move.no-decks-message-deck")}</Text>
        )}
        <Group justify="flex-end">
          <Button
            onClick={() => {
              const newDeck = decks?.find((deck) => deck.id === newDeckID);
              if (newDeck !== undefined) {
                moveDeck(deck.id, newDeck.id);
                successfullyMovedCardTo(newDeck.name);
                setOpened(false);
              } else {
              }
            }}
            leftSection={<IconArrowsExchange />}
            disabled={
              !areDecksReady || !newDeckID || newDeckID === oldSuperDeck
            }
          >
            {t("move.move-deck")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
