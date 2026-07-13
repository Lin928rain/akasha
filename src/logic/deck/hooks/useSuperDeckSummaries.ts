import { useEffect, useMemo, useState } from "react";
import { DeckSummary } from "../deck";
import { getDeckSummariesByIds } from "../getDeckSummaries";

// 全局缓存，存储已获取的卡组摘要
const deckSummaryCache = new Map<string, DeckSummary>();

export function useSuperDeckSummaries(
  deck?: DeckSummary
): [DeckSummary[] | undefined, boolean] {
  const [result, setResult] = useState<[DeckSummary[] | undefined, boolean]>([
    undefined,
    false,
  ]);

  // 使用 useMemo 缓存父卡组 ID 数组
  const superDeckIds = useMemo(
    () => (deck ? [...(deck.superDecks ?? [])].sort() : []),
    [deck?.superDecks?.join(",")]
  );

  useEffect(() => {
    setResult([undefined, false]);
    if (!deck) {
      setResult([undefined, false]);
      return;
    }

    // 检查缓存
    const missingIds = superDeckIds.filter((id) => !deckSummaryCache.has(id));

    if (missingIds.length === 0) {
      // 所有数据都在缓存中
      const summaries = superDeckIds
        .map((id) => deckSummaryCache.get(id))
        .filter((s): s is DeckSummary => s !== undefined);
      setResult([summaries, true]);
      return;
    }

    // 获取缺失的数据
    void getDeckSummariesByIds(missingIds).then((summaries) => {
      // 更新缓存
      summaries.forEach((summary) => {
        if (summary) {
          deckSummaryCache.set(summary.id, summary);
        }
      });

      // 获取所有结果（缓存 + 新获取）
      const allSummaries = superDeckIds
        .map((id) => deckSummaryCache.get(id))
        .filter((s): s is DeckSummary => s !== undefined);

      setResult([allSummaries, true]);
    });
  }, [deck, superDeckIds]);

  return result;
}
