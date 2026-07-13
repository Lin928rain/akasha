import { db } from "../db";
import { Note, NoteType } from "./note";

export async function deleteNotesBulk(notes: Array<Note<NoteType>>) {
  if (notes.length === 0) {
    return;
  }

  const noteIds = uniqueStrings(notes.map((note) => note.id));
  const deckIds = uniqueStrings(notes.map((note) => note.deck));

  return db.transaction("rw", db.notes, db.cards, db.decks, async () => {
    await db.notes.bulkDelete(noteIds);

    const cardsToDelete = await db.cards.whereIn("note", noteIds);
    await db.cards.bulkDelete(cardsToDelete.map((card) => card.id));

    for (const deckId of deckIds) {
      const [remainingNotes, remainingCards] = await Promise.all([
        db.notes.where("deck").equals(deckId).toArray(),
        db.cards.where("deck").equals(deckId).toArray(),
      ]);
      await db.decks.update(deckId, {
        notes: remainingNotes.map((note) => note.id),
        cards: remainingCards.map((card) => card.id),
      });
    }
  });
}

function uniqueStrings(values: string[]): string[] {
  const seen: Record<string, true> = {};
  const result: string[] = [];
  values.forEach((value) => {
    if (!seen[value]) {
      seen[value] = true;
      result.push(value);
    }
  });
  return result;
}
