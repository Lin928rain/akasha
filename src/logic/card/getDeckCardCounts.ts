import { apiRequest } from "../api";

export type DeckCardCounts = {
  new: number;
  learning: number;
  review: number;
};

export type DeckCardCountsEntry = {
  deckId: string;
  counts: DeckCardCounts;
};

export async function getDeckCardCounts(
  deckId?: string
): Promise<DeckCardCounts | undefined> {
  if (!deckId) {
    return undefined;
  }
  const response = await apiRequest<{
    state: { new: number; learning: number; review: number };
  }>("/statistics/card-state", {
    method: "POST",
    body: JSON.stringify({ deckId }),
  });
  const state = response?.state;
  if (!state) {
    return { new: 0, learning: 0, review: 0 };
  }
  return {
    new: state.new ?? 0,
    learning: state.learning ?? 0,
    review: state.review ?? 0,
  };
}

export async function getDeckCardCountsBulk(
  deckIds: string[]
): Promise<Record<string, DeckCardCounts>> {
  if (deckIds.length === 0) {
    return {};
  }
  const response = await apiRequest<{ rows: DeckCardCountsEntry[] }>(
    "/statistics/deck-card-counts",
    {
      method: "POST",
      body: JSON.stringify({ deckIds }),
    }
  );
  const result: Record<string, DeckCardCounts> = {};
  (response?.rows ?? []).forEach((entry) => {
    result[entry.deckId] = entry.counts;
  });
  return result;
}
