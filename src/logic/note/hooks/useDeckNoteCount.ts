import { useDbQuery } from "../../useDbQuery";
import { getDeckNoteCount } from "../getDeckNoteCount";

export function useDeckNoteCount(
  deckId?: string
): [number | undefined, boolean] {
  return useDbQuery(
    () => getDeckNoteCount(deckId).then((count) => [count, !!deckId]),
    [deckId],
    [undefined, false]
  );
}
