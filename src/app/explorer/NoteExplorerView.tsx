import EditorOptionsMenu from "@/app/editor/EditorOptionsMenu";
import { AppHeaderContent } from "@/app/shell/Header/Header";
import DangerousConfirmModal from "@/components/DangerousConfirmModal";
import SelectDecksHeader from "@/components/SelectDecksHeader";
import { useDecks } from "@/logic/deck/hooks/useDecks";
import { deleteNotesBulk } from "@/logic/note/deleteNotesBulk";
import { getNote } from "@/logic/note/getNote";
import { useNotesWith } from "@/logic/note/hooks/useNotesWith";
import { Note, NoteType } from "@/logic/note/note";
import { NoteSortFunction, NoteSorts } from "@/logic/note/sort";
import {
  Box,
  Button,
  Group,
  Space,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedState, useDocumentTitle } from "@mantine/hooks";
import { IconSearch, IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import NoteTable from "../NoteTable/NoteTable";
import EditNoteModal from "../editor/EditNoteModal";
import { EditNoteView } from "../editor/EditNoteView";
import ConnectionStatusIndicator from "../shell/Header/ConnectionStatusIndicator";
import classes from "./NoteExplorerView.module.css";

const ALL_DECKS_ID = "all";

function NoteExplorerView() {
  const [t] = useTranslation();
  useDocumentTitle(`${t("manage-cards.title")} | Akasha`);
  const navigate = useNavigate();
  const location = useLocation();

  const [decks] = useDecks();
  let deckId = useParams().deckId;
  if (deckId === ALL_DECKS_ID) deckId = undefined;

  const noteId = useParams().noteId;

  const {
    sortFunction,
    sortDirection,
  }: { sortFunction?: keyof typeof NoteSorts; sortDirection?: boolean } =
    location.state ?? {};

  const [filter, setFilter] = useDebouncedState<string>("", 250);

  const [sort, setSort] = useState<[NoteSortFunction, boolean]>([
    sortFunction !== undefined
      ? NoteSorts[sortFunction]
      : NoteSorts.bySortField,
    sortDirection !== undefined ? sortDirection : true,
  ]);

  const [rawNotes] = useNotesWith(
    (n) =>
      deckId !== undefined
        ? n.where("deck").equals(deckId).toArray()
        : n.toArray(),
    [deckId]
  );

  const normalizedFilter = filter.trim().toLowerCase();
  const notes = useMemo(() => {
    if (!rawNotes) return undefined;
    const filtered =
      normalizedFilter.length === 0
        ? rawNotes
        : rawNotes.filter((note) =>
            note.sortField.toLowerCase().includes(normalizedFilter)
          );
    return filtered.slice().sort(sort[0](sort[1] ? 1 : -1));
  }, [rawNotes, normalizedFilter, sort]);

  const [editNoteModalOpened, setEditNoteModalOpened] =
    useState<boolean>(false);

  const [openedNote, setOpenedNote] = useState<Note<NoteType> | undefined>();
  const [selectedNotes, setSelectedNotes] = useState<Note<NoteType>[]>([]);
  const [deleteSelectedModalOpened, setDeleteSelectedModalOpened] =
    useState<boolean>(false);

  useEffect(() => {
    if (noteId) {
      getNote(noteId).then((note) => {
        if (note) {
          setOpenedNote(note);
        }
      });
    }
  }, [noteId]);

  return (
    <Stack
      style={{
        overflow: "hidden",
        width: "100%",
        height: "100%",
      }}
    >
      <AppHeaderContent>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Space />
          <Title order={3}>{t("manage-cards.title")}</Title>
          <Group gap="xs" wrap="nowrap">
            <ConnectionStatusIndicator />
            <EditorOptionsMenu />
          </Group>
        </Group>
      </AppHeaderContent>
      <Group align="end" gap="xs">
        <SelectDecksHeader
          label="Showing Notes in"
          decks={decks}
          onSelect={(deckId) => navigate(`/notes/${deckId}`)}
        />
      </Group>
      <div className={classes.container}>
        <Stack>
          <Group gap="xs" align="end">
            <TextInput
              leftSection={<IconSearch size={16} />}
              defaultValue={filter}
              placeholder="Filter Notes"
              w="100%"
              onChange={(event) => setFilter(event.currentTarget.value)}
            />
            <Button
              leftSection={<IconTrash size={16} />}
              color="red"
              variant="light"
              disabled={selectedNotes.length === 0}
              onClick={() => setDeleteSelectedModalOpened(true)}
            >
              {t("manage-cards.bulk-delete", { count: selectedNotes.length })}
            </Button>
          </Group>
          {notes && (
            <NoteTable
              noteSet={notes ?? []}
              openedNote={openedNote}
              setOpenedNote={setOpenedNote}
              openModal={() => setEditNoteModalOpened(true)}
              sort={sort}
              setSort={setSort}
              selectedNotes={selectedNotes}
              setSelectedNotes={setSelectedNotes}
            />
          )}
        </Stack>
        <Box className={classes.noteDisplay}>
          <EditNoteView note={openedNote} />
        </Box>
      </div>
      {openedNote && (
        <EditNoteModal
          note={openedNote}
          setClose={() => setEditNoteModalOpened(false)}
          opened={editNoteModalOpened}
        />
      )}
      <DangerousConfirmModal
        dangerousAction={async () => {
          const selectedIds = new Set(selectedNotes.map((note) => note.id));
          await deleteNotesBulk(selectedNotes);
          if (openedNote && selectedIds.has(openedNote.id)) {
            setOpenedNote(undefined);
          }
          setSelectedNotes([]);
        }}
        dangerousDependencies={[]}
        dangerousTitle={t("manage-cards.bulk-delete-title")}
        dangerousDescription={t("manage-cards.bulk-delete-description", {
          count: selectedNotes.length,
        })}
        suppressDbNotifications={true}
        opened={deleteSelectedModalOpened}
        setOpened={setDeleteSelectedModalOpened}
      />
    </Stack>
  );
}

export default NoteExplorerView;
