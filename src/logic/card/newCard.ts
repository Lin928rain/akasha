import { db } from "../db";
import { Deck } from "../deck/deck";
import { NoteType } from "../note/note";
import { Card } from "./card";

/**
 * This function creates a new card in the database.
 *
 * **Side effects:** It also updates the deck to include the new card.
 */

export async function newCard(card: Card<NoteType>, deck: Deck) {
  card.deck = deck.id;
  await db.transaction("rw", db.decks, db.cards, async () => {
    await db.cards.add(card);
    const storedDeck = await db.decks.get(deck.id);
    if (!storedDeck) {
      return;
    }
    await db.decks.update(deck.id, {
      cards: [...storedDeck.cards, card.id],
    });
  });
  return card.id;
}
