import { useMemo } from "react";
import { useDbQuery } from "../../useDbQuery";
import {
  DeckCardCounts,
  getDeckCardCounts,
  getDeckCardCountsBulk,
} from "../getDeckCardCounts";

export function useDeckCardCounts(
  deckId?: string
): [DeckCardCounts | undefined, boolean] {
  return useDbQuery(
    () => getDeckCardCounts(deckId).then((counts) => [counts, true]),
    [deckId],
    [undefined, false]
  );
}

export function useDeckCardCountsMap(
  deckIds: string[]
): [Record<string, DeckCardCounts>, boolean] {
  const key = useMemo(() => deckIds.join("|"), [deckIds]);
  return useDbQuery<[Record<string, DeckCardCounts>, boolean]>(
    async () => {
      if (deckIds.length === 0) {
        return [{}, true];
      }
      const result = await getDeckCardCountsBulk(deckIds);
      return [result, true];
    },
    [key],
    [{}, false]
  );
}
