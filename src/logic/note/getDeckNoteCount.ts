import { db } from "../db";

export async function getDeckNoteCount(
  deckId?: string
): Promise<number | undefined> {
  if (!deckId) {
    return undefined;
  }
  return db.notes.count([{ column: "deck", op: "eq", value: deckId }]);
}
