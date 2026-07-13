import ImportModal from "@/app/settings/importexport/ImportModal";
import DangerousConfirmModal from "@/components/DangerousConfirmModal";
import { Deck, DeckSummary } from "@/logic/deck/deck";
import { deleteDeck } from "@/logic/deck/deleteDeck";
import { getDeck } from "@/logic/deck/getDeck";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { useShowShortcutHints } from "@/logic/settings/hooks/useShowShortcutHints";
import { ActionIcon, Group, Kbd, Menu } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import {
  IconAdjustmentsHorizontal,
  IconArrowsExchange,
  IconCards,
  IconCode,
  IconCursorText,
  IconDots,
  IconFileImport,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ConnectionStatusIndicator from "../shell/Header/ConnectionStatusIndicator";
import DebugDeckModal from "./DebugDeckModal";
import MoveDeckModal from "./MoveDeckModal";
import RenameDeckModal from "./RenameDeckModal";

interface DeckMenuProps {
  deck?: DeckSummary;
  isDeckReady: boolean;
  setDeckOptionsOpened: Function;
}

function DeckMenu({ deck, isDeckReady, setDeckOptionsOpened }: DeckMenuProps) {
  const navigate = useNavigate();
  const [t] = useTranslation();

  const [developerMode] = useSetting("developerMode");

  const [deleteModalOpened, setDeleteModalOpened] = useState<boolean>(false);
  const [moveModalOpened, setMoveModalOpened] = useState<boolean>(false);
  const [renameModalOpened, setRenameModalOpened] = useState<boolean>(false);
  const [importModalOpened, setImportModalOpened] = useState<boolean>(false);
  const [debugModalOpened, setDebugModalOpened] = useState<boolean>(false);
  const [debugDeck, setDebugDeck] = useState<Deck | undefined>(undefined);

  const handleDelete = useCallback(async () => {
    if (!deck) {
      return;
    }
    try {
      await deleteDeck(deck);
      setDeleteModalOpened(false);
      navigate(
        deck.superDecks && deck.superDecks[deck.superDecks.length - 1]
          ? "/deck/" + deck.superDecks[deck.superDecks.length - 1]
          : "/home"
      );
    } catch (error) {
      console.error("Failed to delete deck: " + error);
    }
  }, [deck, navigate]);

  const manageCards = useCallback(() => {
    if (deck) {
      navigate("/notes/" + deck.id);
    }
  }, [deck, navigate]);

  const showShortcutHints = useShowShortcutHints();
  const handleOpenDebug = useCallback(() => {
    if (!deck) return;
    setDebugModalOpened(true);
    void getDeck(deck.id).then((fullDeck) => {
      if (fullDeck) {
        setDebugDeck(fullDeck);
      }
    });
  }, [deck]);

  useHotkeys([
    ["r", () => setRenameModalOpened(true)],
    ["m", () => {}],
    ["b", manageCards],
    ["i", () => setImportModalOpened(true)],
    ["o", () => setDeckOptionsOpened(true)],
    ["shift+d", handleOpenDebug],
    ["Backspace", () => setDeleteModalOpened(true)],
  ]);

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <ConnectionStatusIndicator />
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={t("deck.menu.label")}
              disabled={isDeckReady && !deck}
            >
              <IconDots />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconCursorText size={16} />}
              rightSection={showShortcutHints && <Kbd>r</Kbd>}
              onClick={() => setRenameModalOpened(true)}
            >
              {t("deck.menu.rename")}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconArrowsExchange size={16} />}
              rightSection={showShortcutHints && <Kbd>m</Kbd>}
              onClick={() => setMoveModalOpened(true)}
            >
              {t("deck.menu.move")}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCards size={16} />}
              rightSection={showShortcutHints && <Kbd>b</Kbd>}
              onClick={manageCards}
            >
              {t("deck.menu.manage-cards")}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileImport size={16} />}
              rightSection={showShortcutHints && <Kbd>i</Kbd>}
              onClick={() => setImportModalOpened(true)}
            >
              {t("deck.menu.import-cards")}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconAdjustmentsHorizontal size={16} />}
              rightSection={showShortcutHints && <Kbd>o</Kbd>}
              onClick={() => setDeckOptionsOpened(true)}
            >
              {t("deck.menu.options")}
            </Menu.Item>
            {developerMode ? (
              <Menu.Item
                leftSection={<IconCode size={16} />}
                rightSection={
                  showShortcutHints && (
                    <Group align="center" gap="0.25rem">
                      <Kbd>shift</Kbd>+<Kbd>d</Kbd>
                    </Group>
                  )
                }
                onClick={handleOpenDebug}
              >
                {t("deck.menu.debug")}
              </Menu.Item>
            ) : null}
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              rightSection={showShortcutHints && <Kbd>←</Kbd>}
              onClick={() => setDeleteModalOpened(true)}
            >
              {t("deck.menu.delete")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      {deck && (
        <>
          <DangerousConfirmModal
            dangerousAction={() => handleDelete()}
            dangerousDependencies={[deck]}
            dangerousTitle={t("deck.delete-modal.title")}
            dangerousDescription={t("deck.delete-modal.description")}
            suppressDbNotifications={true}
            opened={deleteModalOpened}
            setOpened={setDeleteModalOpened}
          />
          <RenameDeckModal
            deck={deck}
            opened={renameModalOpened}
            setOpened={setRenameModalOpened}
          />
          <MoveDeckModal
            deck={deck}
            opened={moveModalOpened}
            setOpened={setMoveModalOpened}
          />
          {debugDeck && (
            <DebugDeckModal
              deck={debugDeck}
              opened={debugModalOpened}
              setOpened={setDebugModalOpened}
            />
          )}
          <ImportModal
            deck={deck}
            opened={importModalOpened}
            setOpened={setImportModalOpened}
          />
        </>
      )}
    </>
  );
}

export default DeckMenu;
