import { Deck } from "../../deck/deck";
import { NoteType } from "../../note/note";
import { useDbQuery } from "../../useDbQuery";
import { Card } from "../card";
import { getCardsOf } from "../getCardsOf";

export function useCardsOf(
  deck: Deck | undefined,
  excludeSubDecks?: boolean
): [Card<NoteType>[] | undefined, boolean] {
  return useDbQuery(
    () =>
      getCardsOf(deck, excludeSubDecks).then((cards) => [
        cards,
        deck !== undefined,
      ]),
    [deck, excludeSubDecks],
    [undefined, false]
  );
}
