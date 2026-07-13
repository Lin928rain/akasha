import { useCardsOf } from "@/logic/card/hooks/useCardsOf";
import { useStatesOf } from "@/logic/card/hooks/useStatesOf";
import { useSubDecks } from "@/logic/deck/hooks/useSubDecks";
import { useSuperDecks } from "@/logic/deck/hooks/useSuperDecks";
import { Anchor, Modal, Stack, Text } from "@mantine/core";
import { State } from "fsrs.js";
import { useTranslation } from "react-i18next";
import { Deck } from "../../logic/deck/deck";

interface DebugDeckModalProps {
  opened: boolean;
  setOpened: Function;
  deck?: Deck;
}

function DebugDeckModal({ opened, setOpened, deck }: DebugDeckModalProps) {
  const [t] = useTranslation();
  const [cards] = useCardsOf(deck);
  const states = useStatesOf(cards ?? []);

  const [superDecks] = useSuperDecks(deck);

  const [subDecks] = useSubDecks(deck);

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={t("debug.title")}
    >
      <Stack justify="space-between">
        {deck ? (
          <Stack gap="xs">
            <Text fz="xs">
              <b>{t("debug.name")}: </b>"{deck.name}"
            </Text>
            <Text fz="xs">
              <b>{t("debug.id")}: </b>"{deck.id}"
            </Text>
            <Text fz="xs">
              <b>{t("debug.subdecks")}: </b>
              {subDecks?.map((s) => (
                <span key={s.id}>
                  <Anchor href={"/deck/" + s.id}>{s.name}</Anchor>,{" "}
                </span>
              ))}
            </Text>
            <Text fz="xs">
              <b>{t("debug.superdecks")}: </b>"
              {superDecks?.map((s) => (
                <span key={s.id}>
                  <Anchor href={"/deck/" + s.id}>{s.name}</Anchor>,{" "}
                </span>
              ))}
              "
            </Text>
            <Text fz="xs">
              <b>{t("debug.cards")}: </b>"
              {deck.cards.map((s) => (
                <span key={s}>{s + ", "}</span>
              ))}
              "
            </Text>
            <Text fz="xs">
              <b>{t("debug.notes")}: </b>"
              {deck.notes.map((s) => (
                <span key={s}>{s + ", "}</span>
              ))}
              "
            </Text>

            <Text fz="xs">
              <b>{t("debug.direct-card-length")}: </b>
              {deck.cards.length}
            </Text>
            <Text fz="xs">
              <b>{t("debug.contained-card-length")}: </b>
              {cards?.length}
            </Text>
            <Text fz="xs">
              <b>{t("debug.new")}: </b>
              {states[State.New]}
            </Text>
            <Text fz="xs">
              <b>{t("debug.learning")}: </b>
              {states[State.Learning]}
            </Text>
            <Text fz="xs">
              <b>{t("debug.review")}: </b>
              {states[State.Review]}
            </Text>
            <Text fz="xs">
              <b>{t("debug.relearning")}: </b>
              {states[State.Relearning]}
            </Text>
          </Stack>
        ) : (
          <Text fz="xs">{t("debug.no-deck")}</Text>
        )}
      </Stack>
    </Modal>
  );
}

export default DebugDeckModal;
