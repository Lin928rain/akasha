import { useDbQuery } from "../../useDbQuery";
import { DeckSummary } from "../deck";
import { getDeckSummaries } from "../getDeckSummaries";

export function useTopLevelDeckSummaries(): [
  DeckSummary[] | undefined,
  boolean,
] {
  return useDbQuery<[DeckSummary[] | undefined, boolean]>(
    async () => {
      const val = await getDeckSummaries();
      return [val, true];
    },
    [],
    [undefined, false]
  );
}
