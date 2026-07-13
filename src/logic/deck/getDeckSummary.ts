import { getDeckSummary as getSummary } from "../db";
import { DeckSummary } from "./deck";

export async function getDeckSummary(
  deckId: string
): Promise<DeckSummary | undefined> {
  return getSummary(deckId);
}
