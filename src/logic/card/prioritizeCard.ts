import { db } from "@/logic/db";
import { State } from "fsrs.js";

export async function prioritizeCard(cardId: string): Promise<void> {
  const card = await db.cards.get(cardId);
  if (!card || card.model.state !== State.New) {
    return;
  }

  const deck = await db.decks.get(card.deck);
  if (!deck) {
    return;
  }

  const deckCards = await db.cards.bulkGet(deck.cards);
  const existingOrders = deckCards
    .filter((currentCard) => currentCard?.model.state === State.New)
    .map((currentCard) => currentCard?.customOrder)
    .filter((order): order is number => typeof order === "number");

  const nextOrder =
    existingOrders.length === 0 ? -1 : Math.min(...existingOrders) - 1;
  await db.cards.update(card.id, { customOrder: nextOrder });
}
