import NormalCardEditor from "@/app/editor/NoteEditor/NormalCardEditor";
import { OcclusionRichText } from "@/components/OcclusionRichText/OcclusionRichText";
import { NoteEditorProps, NoteTypeAdapter } from "@/logic/NoteTypeAdapter";
import { Card, HTMLtoPreviewString } from "@/logic/card/card";
import { createCardSkeleton } from "@/logic/card/createCardSkeleton";
import { deleteCard } from "@/logic/card/deleteCard";
import { newCard } from "@/logic/card/newCard";
import { db } from "@/logic/db";
import { Deck } from "@/logic/deck/deck";
import { NoteContent } from "@/logic/note/NoteContent";
import { newNote } from "@/logic/note/newNote";
import { NoteType } from "@/logic/note/note";
import { Note } from "@/logic/note/note";
import { updateNoteContent } from "@/logic/note/updateNoteContent";
import common from "@/style/CommonStyles.module.css";
import { Divider, Stack, Title } from "@mantine/core";
import { useState } from "react";

export const BasicNoteTypeAdapter: NoteTypeAdapter<NoteType.Basic> = {
  async createNote(params: { front: string; back: string }, deck: Deck) {
    return db.transaction("rw", db.notes, db.decks, db.cards, async () => {
      const noteId = await newNote(deck, {
        type: NoteType.Basic,
        front: params.front,
        back: params.back,
      });
      await newCard(
        {
          ...createCardSkeleton(),
          note: noteId,
          content: { type: NoteType.Basic },
        },
        deck
      );
    });
  },

  async updateNote(
    params: { front: string; back: string },
    existingNote: Note<NoteType.Basic>
  ) {
    return db.transaction("rw", db.notes, db.cards, async () => {
      await updateNoteContent(existingNote.id, {
        type: NoteType.Basic,
        front: params.front,
        back: params.back,
      });
    });
  },

  displayQuestion(
    _: Card<NoteType.Basic>,
    content?: NoteContent<NoteType.Basic>
  ) {
    return (
      <Title order={3} fw={600}>
        <OcclusionRichText html={content?.front ?? ""} />
      </Title>
    );
  },

  displayAnswer(
    _card: Card<NoteType.Basic>,
    content?: NoteContent<NoteType.Basic>,
    place?: "learn" | "notebook"
  ) {
    return (
      <Stack gap={place === "notebook" ? "sm" : "lg"} w="100%">
        <Title order={3} fw={600}>
          <OcclusionRichText
            html={content?.front ?? ""}
            controlledIsVisible={true}
          />
        </Title>
        <Divider className={common.lightBorderColor} />
        <div>
          <OcclusionRichText
            html={content?.back ?? ""}
            controlledIsVisible={true}
          />
        </div>
      </Stack>
    );
  },

  displayNote(
    note: Note<NoteType.Basic>,
    showAllAnswers: "strict" | "optional" | "none"
  ) {
    return <BasicNoteDisplay note={note} showAllAnswers={showAllAnswers} />;
  },

  getSortFieldFromNoteContent(content?: NoteContent<NoteType.Basic>) {
    return HTMLtoPreviewString(
      (content?.front ?? "[error]").replace(
        /\{\{([\s\S]*?)\}\}/g,
        (_match, inner) => inner
      )
    );
  },

  editor({
    note,
    deck,
    mode,
    requestedFinish,
    setRequestedFinish,
    focusSelectNoteType,
  }: NoteEditorProps) {
    return (
      <NormalCardEditor
        note={note as Note<NoteType.Basic> | null}
        deck={deck}
        mode={mode}
        requestedFinish={requestedFinish}
        setRequestedFinish={setRequestedFinish}
        focusSelectNoteType={focusSelectNoteType}
      />
    );
  },

  async deleteCard(card: Card<NoteType.Basic>) {
    deleteCard(card);
  },
};

function BasicNoteDisplay({
  note,
  showAllAnswers,
}: {
  note: Note<NoteType.Basic>;
  showAllAnswers: "strict" | "optional" | "none";
}) {
  const [showAnswer, setShowAnswer] = useState(showAllAnswers !== "none");
  const shouldShowAnswer =
    showAllAnswers !== "none" &&
    (showAllAnswers === "strict" ? true : showAnswer);

  return (
    <Stack
      gap="sm"
      w="100%"
      onClick={() => {
        if (showAllAnswers !== "strict" && showAllAnswers !== "none") {
          setShowAnswer((prev) => !prev);
        }
      }}
    >
      <Title order={3} fw={600}>
        <OcclusionRichText
          html={note.content?.front ?? ""}
          controlledIsVisible={true}
        />
      </Title>
      {shouldShowAnswer && (
        <>
          <Divider className={common.lightBorderColor} />
          <div>
            <OcclusionRichText
              html={note.content?.back ?? ""}
              controlledIsVisible={true}
            />
          </div>
        </>
      )}
    </Stack>
  );
}
