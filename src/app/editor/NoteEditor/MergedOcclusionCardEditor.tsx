import {
  addFailed,
  saveFailed,
  successfullyAdded,
  successfullySaved,
} from "@/components/Notification/Notification";
import { EditMode } from "@/logic/NoteTypeAdapter";
import { updateCard } from "@/logic/card/updateCard";
import { db } from "@/logic/db";
import { Deck } from "@/logic/deck/deck";
import { NoteType } from "@/logic/note/note";
import type { Note } from "@/logic/note/note";
import { updateNoteContent } from "@/logic/note/updateNoteContent";
import { BasicNoteTypeAdapter } from "@/logic/type-implementations/normal/BasicNote";
import { Stack, Text } from "@mantine/core";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import classes from "./NormalCardEditor.module.css";
import NoteEditor, { useNoteEditor } from "./NoteEditor";
import OcclusionToggleControl from "./OcclusionToggleControl";

interface MergedOcclusionCardEditorProps {
  note: Note<NoteType.ImageOcclusion> | null;
  deck: Deck;
  mode: EditMode;
  requestedFinish: boolean;
  setRequestedFinish: (finish: boolean) => void;
  focusSelectNoteType?: () => void;
}

function MergedOcclusionCardEditor({
  note,
  deck,
  mode,
  requestedFinish,
  setRequestedFinish,
  focusSelectNoteType,
}: MergedOcclusionCardEditorProps) {
  const [t] = useTranslation();
  const noteContent = note?.content ?? {
    type: NoteType.ImageOcclusion,
    front: "",
    back: "",
  };

  const frontEditor = useNoteEditor({
    content: noteContent.front,
    finish: () => setRequestedFinish(true),
    focusSelectNoteType: focusSelectNoteType,
  });

  const backEditor = useNoteEditor({
    content: noteContent.back,
    finish: () => setRequestedFinish(true),
    focusSelectNoteType: focusSelectNoteType,
  });

  const clear = useCallback(() => {
    frontEditor?.commands.setContent("");
    backEditor?.commands.setContent("");
    frontEditor?.commands.focus();
  }, [frontEditor, backEditor]);

  useEffect(() => {
    if (requestedFinish) {
      finish(mode, clear, deck, note, frontEditor, backEditor);
      setRequestedFinish(false);
    }
  }, [
    requestedFinish,
    mode,
    clear,
    deck,
    note,
    frontEditor,
    backEditor,
    setRequestedFinish,
  ]);

  return (
    <Stack gap="2rem">
      <Stack gap={0}>
        <Text fz="sm" fw={600}>
          {t("note.edit.type-specific.normal.front")}
        </Text>
        <NoteEditor
          editor={frontEditor}
          key="front"
          className={classes.front}
          controls={<OcclusionToggleControl editor={frontEditor} />}
        />
      </Stack>
      <Stack gap={0}>
        <Text fz="sm" fw={600}>
          {t("note.edit.type-specific.normal.back")}
        </Text>
        <NoteEditor
          editor={backEditor}
          key="back"
          controls={<OcclusionToggleControl editor={backEditor} />}
        />
      </Stack>
    </Stack>
  );
}

async function finish(
  mode: EditMode,
  clear: () => void,
  deck: Deck,
  note: Note<NoteType.ImageOcclusion> | null,
  frontEditor: Editor | null,
  backEditor: Editor | null
) {
  const front = frontEditor?.getHTML() ?? "";
  const back = backEditor?.getHTML() ?? "";

  if (mode === "edit") {
    try {
      if (note === null) throw new Error("Note is null");

      await db.transaction("rw", db.notes, db.cards, async () => {
        await updateNoteContent(note.id, {
          type: NoteType.Basic,
          front,
          back,
        });

        const cards = await db.cards.where("note").equals(note.id).toArray();
        await Promise.all(
          cards.map((card) =>
            updateCard(card.id, {
              content: { type: NoteType.Basic },
            })
          )
        );
      });

      successfullySaved();
    } catch {
      saveFailed();
    }
  } else {
    try {
      await BasicNoteTypeAdapter.createNote({ front, back }, deck);
      clear();
      successfullyAdded();
    } catch {
      addFailed();
    }
  }
}

export default MergedOcclusionCardEditor;
