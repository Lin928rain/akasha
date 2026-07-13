import { Deck } from "../../deck/deck";
import { useDbQuery } from "../../useDbQuery";
import { getNotesOf } from "../getNotesOf";
import { Note, NoteType } from "../note";

export function useNotesOf(
  deck: Deck | undefined,
  excludeSubDecks?: boolean,
  limit?: number
): [Note<NoteType>[] | undefined, boolean] {
  return useDbQuery(
    () =>
      getNotesOf(deck, excludeSubDecks, limit).then((notes) => [
        notes,
        deck !== undefined,
      ]),
    [deck, excludeSubDecks, limit],
    [undefined, false]
  );
}
