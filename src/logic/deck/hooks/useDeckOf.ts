import { Card } from "../../card/card";
import { db } from "../../db";
import { Note, NoteType } from "../../note/note";
import { useDbQuery } from "../../useDbQuery";
import { Deck } from "../deck";

export function useDeckOf(
  a: Card<NoteType> | Note<NoteType>
): [Deck | undefined, boolean] {
  return useDbQuery(
    () => db.decks.get(a.deck).then((deck) => [deck, true]),
    [a],
    [undefined, false]
  );
}
