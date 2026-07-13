import { db } from "../db";
import { Deck, DeckSummary } from "./deck";
import { getDeck } from "./getDeck";

export async function deleteDeck(
  deck: Deck | DeckSummary,
  calledRecursively?: boolean
) {
  await db.transaction("rw", db.decks, db.cards, db.notes, async () => {
    if (!deck) {
      return;
    }

    await Promise.all(
      deck.subDecks.map((subDeckID) =>
        getDeck(subDeckID).then(
          (subDeck) => subDeck && deleteDeck(subDeck, true)
        )
      )
    );

    if (
      !calledRecursively &&
      deck.superDecks &&
      deck.superDecks[deck.superDecks.length - 1]
    ) {
      const superDeck = await getDeck(
        deck.superDecks[deck.superDecks.length - 1]
      );
      if (superDeck) {
        await db.decks.update(superDeck.id, {
          subDecks: superDeck.subDecks.filter((s) => s !== deck.id),
        });
      }
    }

    const [cardsInDeck, notesInDeck] = await Promise.all([
      db.cards.where("deck").equals(deck.id).toArray(),
      db.notes.where("deck").equals(deck.id).toArray(),
    ]);
    const cardIds = uniqueStrings([
      ...("cards" in deck ? deck.cards : []),
      ...cardsInDeck.map((card) => card.id),
    ]);
    const noteIds = uniqueStrings([
      ...("notes" in deck ? deck.notes : []),
      ...notesInDeck.map((note) => note.id),
    ]);
    const cardsFromNotes = await db.cards.whereIn("note", noteIds);
    const allCardIds = uniqueStrings([
      ...cardIds,
      ...cardsFromNotes.map((card) => card.id),
    ]);
    await db.cards.bulkDelete(allCardIds);
    await db.notes.bulkDelete(noteIds);
    await db.decks.delete(deck.id);
  });
}

function uniqueStrings(values: string[]): string[] {
  const seen: Record<string, true> = {};
  const result: string[] = [];
  values.forEach((value) => {
    if (!seen[value]) {
      seen[value] = true;
      result.push(value);
    }
  });
  return result;
}
