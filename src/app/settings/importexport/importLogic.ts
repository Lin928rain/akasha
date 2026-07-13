import { getAdapterOfType } from "@/logic/NoteTypeAdapter";
import { Card } from "@/logic/card/card";
import { createCardSkeleton } from "@/logic/card/createCardSkeleton";
import { db, runWithoutDbNotifications } from "@/logic/db";
import { Deck } from "@/logic/deck/deck";
import { NoteContent } from "@/logic/note/NoteContent";
import { createNoteSkeleton } from "@/logic/note/createNoteSkeleton";
import { Note, NoteType } from "@/logic/note/note";

export async function importCards(
  text: string | null,
  deck: Deck | undefined,
  cardSeparator: string,
  questionAnswerSeperator: string
) {
  if (!text || !deck) {
    return;
  }
  const normalizedText = normalizeNewlines(text);
  const normalizedCardSeparator = normalizeNewlines(cardSeparator);
  const normalizedQaSeparator = normalizeNewlines(questionAnswerSeperator);
  const questionAnswerPairs = normalizedText
    .split(normalizedCardSeparator)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      return line.split(normalizedQaSeparator);
    });

  const adapter = getAdapterOfType(NoteType.Basic);
  const notesToCreate: Array<Note<NoteType.Basic>> = [];
  const cardsToCreate: Array<Card<NoteType.Basic>> = [];

  questionAnswerPairs.forEach((pair) => {
    if (pair.length < 2) {
      return;
    }
    const front = plainTextToHtml(pair[0]);
    const back = plainTextToHtml(pair[1]);
    const content: NoteContent<NoteType.Basic> = {
      type: NoteType.Basic,
      front,
      back,
    };
    const note: Note<NoteType.Basic> = {
      ...createNoteSkeleton(deck.id),
      content,
      sortField: adapter.getSortFieldFromNoteContent(content),
    };
    const card: Card<NoteType.Basic> = {
      ...createCardSkeleton(),
      note: note.id,
      content: { type: NoteType.Basic },
      deck: deck.id,
    };
    notesToCreate.push(note);
    cardsToCreate.push(card);
  });

  if (notesToCreate.length === 0) {
    return;
  }

  await runWithoutDbNotifications(() =>
    db.transaction("rw", db.decks, db.notes, db.cards, async () => {
      const storedDeck = await db.decks.get(deck.id);
      if (!storedDeck) {
        return;
      }
      await db.notes.bulkAdd(notesToCreate);
      await db.cards.bulkAdd(cardsToCreate);
      await db.decks.update(deck.id, {
        notes: [...storedDeck.notes, ...notesToCreate.map((note) => note.id)],
        cards: [...storedDeck.cards, ...cardsToCreate.map((card) => card.id)],
      });
    })
  );
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function plainTextToHtml(value: string) {
  const normalized = normalizeNewlines(value);
  const escaped = normalized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br />");
}
