import MergedOcclusionCardEditor from "@/app/editor/NoteEditor/MergedOcclusionCardEditor";
import type { NoteEditorProps, NoteTypeAdapter } from "@/logic/NoteTypeAdapter";
import type { Card } from "@/logic/card/card";
import { deleteCard } from "@/logic/card/deleteCard";
import { updateCard } from "@/logic/card/updateCard";
import { db } from "@/logic/db";
import type { Deck } from "@/logic/deck/deck";
import type { NoteContent } from "@/logic/note/NoteContent";
import type { Note } from "@/logic/note/note";
import { NoteType } from "@/logic/note/note";
import { updateNoteContent } from "@/logic/note/updateNoteContent";
import { BasicNoteTypeAdapter } from "@/logic/type-implementations/normal/BasicNote";

import type { OcclusionNoteContent } from "./types";

export const OcclusionTypeAdapter: NoteTypeAdapter<NoteType.ImageOcclusion> = {
  async createNote(params: { front: string; back: string }, deck: Deck) {
    return BasicNoteTypeAdapter.createNote(params, deck);
  },

  async updateNote(
    params: { front: string; back: string },
    existingNote: Note<NoteType.ImageOcclusion>
  ) {
    await db.transaction("rw", db.notes, db.cards, async () => {
      await updateNoteContent(existingNote.id, {
        type: NoteType.Basic,
        front: params.front,
        back: params.back,
      });

      const cards = await db.cards
        .where("note")
        .equals(existingNote.id)
        .toArray();
      await Promise.all(
        cards.map((card) =>
          updateCard(card.id, {
            content: { type: NoteType.Basic },
          })
        )
      );
    });
  },

  deleteCard: (card: Card<NoteType.ImageOcclusion>) => {
    deleteCard(card as unknown as Card<NoteType>);
  },

  displayQuestion: (
    card: Card<NoteType.ImageOcclusion>,
    content?: NoteContent<NoteType.ImageOcclusion>
  ) => {
    return BasicNoteTypeAdapter.displayQuestion(
      card as unknown as Card<NoteType.Basic>,
      content as unknown as NoteContent<NoteType.Basic>
    );
  },

  displayAnswer: (
    card: Card<NoteType.ImageOcclusion>,
    content?: NoteContent<NoteType.ImageOcclusion>,
    place?: "learn" | "notebook"
  ) => {
    return BasicNoteTypeAdapter.displayAnswer(
      card as unknown as Card<NoteType.Basic>,
      content as unknown as NoteContent<NoteType.Basic>,
      place
    );
  },

  displayNote: (
    note: Note<NoteType.ImageOcclusion>,
    showAllAnswers: "strict" | "optional" | "none"
  ) => {
    return BasicNoteTypeAdapter.displayNote(
      note as unknown as Note<NoteType.Basic>,
      showAllAnswers
    );
  },

  getSortFieldFromNoteContent: (content: OcclusionNoteContent) => {
    return BasicNoteTypeAdapter.getSortFieldFromNoteContent(
      content as unknown as NoteContent<NoteType.Basic>
    );
  },

  editor: (props: NoteEditorProps) => {
    return (
      <MergedOcclusionCardEditor
        note={props.note as Note<NoteType.ImageOcclusion> | null}
        deck={props.deck}
        mode={props.mode}
        requestedFinish={props.requestedFinish}
        setRequestedFinish={props.setRequestedFinish}
        focusSelectNoteType={props.focusSelectNoteType}
      />
    );
  },
};
