import { useDbQuery } from "../../useDbQuery";
import { DeckSummary } from "../deck";
import { getDeckSummaries } from "../getDeckSummaries";

export function useDecks(
  modify?: (decks: DeckSummary[] | undefined) => DeckSummary[] | undefined
): [DeckSummary[] | undefined, boolean] {
  return useDbQuery(
    () =>
      getDeckSummaries().then((decks) => [
        modify ? modify(decks) : decks,
        true,
      ]),
    [],
    [undefined, false]
  );
}
