import MissingObject from "@/components/MissingObject";
import { useScrollResetOnLocationChange } from "@/lib/ui";
import { useDeckSummaryFromUrl } from "@/logic/deck/hooks/useDeckSummaryFromUrl";
import { useSuperDeckSummaries } from "@/logic/deck/hooks/useSuperDeckSummaries";
import { Group, Stack } from "@mantine/core";
import { useDocumentTitle, useHotkeys } from "@mantine/hooks";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import DeckMenu from "./DeckMenu";
import DeckOptionsModal from "./DeckOptionsModal";
import HeroDeckSection from "./HeroDeckSection/HeroDeckSection";
import SuperDecksBreadcrumbs from "./SuperDecksBreadcrumbs/SuperDecksBreadcrumbs";
import TitleSection from "./TitleSection";

function DeckView() {
  const navigate = useNavigate();

  const [deckOptionsOpened, setDeckOptionsOpened] = useState(false);

  const [deck, isDeckReady, ,] = useDeckSummaryFromUrl();
  const [superDecks] = useSuperDeckSummaries(deck);
  useScrollResetOnLocationChange();

  useDocumentTitle(deck?.name ? deck?.name : "Akasha");
  useHotkeys([["n", () => navigate("/new/" + deck?.id)]]);

  if (isDeckReady && !deck) {
    return <MissingObject />;
  }

  return (
    <>
      <AppHeaderContent>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <SuperDecksBreadcrumbs superDecks={superDecks} />
          <DeckMenu
            deck={deck}
            isDeckReady={isDeckReady}
            setDeckOptionsOpened={setDeckOptionsOpened}
          />
        </Group>
      </AppHeaderContent>
      <Stack gap="xl" align="start" w="100%" maw="600px" pt="lg">
        <TitleSection deck={deck} />
        <HeroDeckSection deck={deck} isDeckReady={isDeckReady} />

        {deck ? (
          <DeckOptionsModal
            deck={deck}
            opened={deckOptionsOpened}
            setOpened={setDeckOptionsOpened}
          />
        ) : (
          ""
        )}
      </Stack>
    </>
  );
}
export default DeckView;
