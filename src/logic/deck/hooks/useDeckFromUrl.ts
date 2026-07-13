import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../../db";
import { useDbQuery } from "../../useDbQuery";
import { Deck } from "../deck";

export function useDeckFromUrl(): [
  Deck | undefined,
  boolean,
  string | undefined,
  URLSearchParams,
] {
  const deckId = useParams().deckId;
  const params = useParams().params;
  const [searchParams] = useSearchParams();

  return useDbQuery(
    () =>
      db.decks
        .get(deckId || "")
        .then((deck) => [deck, true, params, searchParams]),
    [deckId, searchParams],
    [undefined, false, undefined, searchParams]
  );
}
