import { getDeckSummaries as getSummaries } from "../db";
import { getDeckSummariesByIds as getSummariesByIds } from "../db";
import { DeckSummary } from "./deck";

export async function getDeckSummaries(): Promise<DeckSummary[]> {
  return getSummaries();
}

export async function getDeckSummariesByIds(
  ids: string[]
): Promise<Array<DeckSummary | undefined>> {
  return getSummariesByIds(ids);
}
