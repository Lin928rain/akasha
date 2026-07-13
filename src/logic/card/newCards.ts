import { db } from "../db";
import { Deck } from "../deck/deck";
import { NoteType } from "../note/note";
import { Card } from "./card";

export async function newCards(cards: Card<NoteType>[], deck: Deck) {
  cards.forEach((card) => (card.deck = deck.id));
  return db.transaction("rw", db.decks, db.cards, async () => {
    await db.cards.bulkAdd(cards);
    const storedDeck = await db.decks.get(deck.id);
    if (!storedDeck) {
      return;
    }
    await db.decks.update(deck.id, {
      cards: [...storedDeck.cards, ...cards.map((card) => card.id)],
    });
  });
}
