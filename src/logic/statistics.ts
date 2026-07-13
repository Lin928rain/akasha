import { Rating, State } from "fsrs.js";
import { apiRequest } from "./api";
import { db } from "./db";
import { useDbQuery } from "./useDbQuery";

export interface DeckStatistics {
  deck: string;
  day: string;
  userId?: string;
  time: {
    total: number;
    forNew: number;
    forReview: number;
    forLearning: number;
  };
  cards: {
    [State.New]: number;
    [State.Review]: number;
    [State.Learning]: number;
    [State.Relearning]: number;
  };
  ratingsList: Rating[];
}

export function newStatistics(): DeckStatistics {
  return {
    deck: "[not set]",
    day: new Date().toISOString().split("T")[0],
    time: {
      total: 0,
      forNew: 0,
      forReview: 0,
      forLearning: 0,
    },
    cards: {
      [State.New]: 0,
      [State.Review]: 0,
      [State.Learning]: 0,
      [State.Relearning]: 0,
    },
    ratingsList: [],
  };
}
export async function writeStatistics(statistics: DeckStatistics) {
  const existingStats = await db.statistics.get([
    statistics.deck,
    statistics.day,
  ]);

  if (existingStats) {
    db.statistics.put({
      deck: statistics.deck,
      day: statistics.day,
      time: {
        total: existingStats.time.total + statistics.time.total,
        forNew: existingStats.time.forNew + statistics.time.forNew,
        forReview: existingStats.time.forReview + statistics.time.forReview,
        forLearning:
          existingStats.time.forLearning + statistics.time.forLearning,
      },
      cards: {
        [State.New]:
          existingStats.cards[State.New] + statistics.cards[State.New],
        [State.Review]:
          existingStats.cards[State.Review] + statistics.cards[State.Review],
        [State.Learning]:
          existingStats.cards[State.Learning] +
          statistics.cards[State.Learning],
        [State.Relearning]:
          existingStats.cards[State.Relearning] +
          statistics.cards[State.Relearning],
      },
      ratingsList: existingStats.ratingsList.concat(statistics.ratingsList),
    });
  } else {
    db.statistics.add(statistics);
  }
}

export async function getStatistics(deck?: string, day?: string) {
  if (deck && day) {
    return db.statistics.get({ deck, day });
  } else if (deck) {
    return db.statistics.where("deck").equals(deck).toArray();
  } else if (day) {
    return db.statistics.where("day").equals(day).toArray();
  } else {
    return db.statistics.toArray();
  }
}

export function useStatistics(deck?: string, day?: string) {
  return useDbQuery(() => getStatistics(deck, day), [deck, day], undefined);
}

export type ReviewSummaryRow = {
  day: string;
  [State.Review]: number;
  [State.Learning]: number;
  [State.New]: number;
};

export type CardStateSummary = {
  new: number;
  learning: number;
  review: number;
  notDue: number;
};

export async function getReviewSummary(args: {
  days: number;
  deckId?: string;
}): Promise<ReviewSummaryRow[]> {
  const response = await apiRequest<{ rows: ReviewSummaryRow[] }>(
    "/statistics/review-summary",
    {
      method: "POST",
      body: JSON.stringify({
        days: args.days,
        deckId: args.deckId,
      }),
    }
  );
  return response?.rows ?? [];
}

export async function getCardStateSummary(
  deckId?: string
): Promise<CardStateSummary> {
  const response = await apiRequest<{ state: CardStateSummary }>(
    "/statistics/card-state",
    {
      method: "POST",
      body: JSON.stringify({ deckId }),
    }
  );
  return (
    response?.state ?? {
      new: 0,
      learning: 0,
      review: 0,
      notDue: 0,
    }
  );
}
