import { db } from "../db";
import { NoteType } from "../note/note";
import { Card } from "./card";

/**
 * Deprecated, consider disallowing moving single cards between decks
 * @param card
 * @param newDeckId
 * @returns
 */
export async function moveCard(card: Card<NoteType>, newDeckId: string) {
  //Remove card from old deck
  const oldDeck = await db.decks.get(card.deck);
  if (oldDeck) {
    oldDeck.cards = oldDeck.cards.filter((c) => c !== card.id);
    await db.decks.update(oldDeck.id, { cards: oldDeck.cards });
  }
  const targetDeck = await db.decks.get(newDeckId);
  if (!targetDeck) {
    return;
  }
  targetDeck.cards.push(card.id);
  //Add card to new deck
  await db.decks.update(targetDeck.id, { cards: targetDeck.cards });
  //Update in card object
  card.deck = targetDeck.id;
  return db.cards.update(card.id, { deck: targetDeck.id });
}
