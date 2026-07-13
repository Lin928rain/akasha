import { db } from "../db";
import { Deck } from "../deck/deck";
import { NoteType } from "../note/note";
import { Card } from "./card";

const BULK_CHUNK_SIZE = 200;

export type CardsLoadProgress = {
  loaded: number;
  total: number;
};

export type CardsLoadProgressHandler = (progress: CardsLoadProgress) => void;

async function collectDecks(
  deck: Deck,
  excludeSubDecks?: boolean
): Promise<Deck[]> {
  const decks: Deck[] = [deck];
  if (excludeSubDecks) {
    return decks;
  }
  for (const subDeckId of deck.subDecks) {
    const subDeck = await db.decks.get(subDeckId);
    if (subDeck) {
      const subDecks = await collectDecks(subDeck);
      decks.push(...subDecks);
    }
  }
  return decks;
}

export async function getCardsOfWithProgress(
  deck?: Deck,
  excludeSubDecks?: boolean,
  onProgress?: CardsLoadProgressHandler
): Promise<Card<NoteType>[] | undefined> {
  if (!deck) return undefined;

  const decks = await collectDecks(deck, excludeSubDecks);
  const total = decks.reduce((sum, currentDeck) => {
    return sum + currentDeck.cards.length;
  }, 0);

  let loaded = 0;
  onProgress?.({ loaded, total });

  // 收集所有卡片 ID
  const allCardIds: string[] = [];
  for (const currentDeck of decks) {
    allCardIds.push(...currentDeck.cards);
  }

  // 分批获取卡片，为每个 chunk 包装一个带进度更新的 promise
  const cards: Card<NoteType>[] = [];
  const chunkPromises: Promise<Card<NoteType>[]>[] = [];

  for (let index = 0; index < allCardIds.length; index += BULK_CHUNK_SIZE) {
    const chunk = allCardIds.slice(index, index + BULK_CHUNK_SIZE);
    const chunkSize = chunk.length;

    // 包装 promise，完成后更新进度
    const wrappedPromise = db.cards.bulkGet(chunk).then((results) => {
      const fetched = results.filter(
        (card): card is Card<NoteType> => card !== undefined
      );
      loaded += chunkSize;
      onProgress?.({ loaded, total });
      return fetched;
    });

    chunkPromises.push(wrappedPromise);
  }

  // 等待所有批次完成（并发执行）
  const results = await Promise.all(chunkPromises);

  // 合并所有结果
  for (const chunkResult of results) {
    cards.push(...chunkResult);
  }

  return cards;
}

export async function getCardsOf(
  deck?: Deck,
  excludeSubDecks?: boolean
): Promise<Card<NoteType>[] | undefined> {
  return getCardsOfWithProgress(deck, excludeSubDecks);
}
