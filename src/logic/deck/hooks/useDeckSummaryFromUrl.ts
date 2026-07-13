import { useParams, useSearchParams } from "react-router-dom";
import { useDbQuery } from "../../useDbQuery";
import { DeckSummary } from "../deck";
import { getDeckSummary } from "../getDeckSummary";

export function useDeckSummaryFromUrl(): [
  DeckSummary | undefined,
  boolean,
  string | undefined,
  URLSearchParams,
] {
  const deckId = useParams().deckId;
  const params = useParams().params;
  const [searchParams] = useSearchParams();

  return useDbQuery(
    () =>
      deckId
        ? getDeckSummary(deckId).then((deck) => [
            deck,
            true,
            params,
            searchParams,
          ])
        : Promise.resolve([undefined, true, params, searchParams]),
    [deckId, searchParams],
    [undefined, false, undefined, searchParams]
  );
}
