import { expect, test } from "@playwright/test";
import { Card as FsrsCard, State } from "fsrs.js";
import { v4 as uuidv4 } from "uuid";

const apiBaseUrl = "http://localhost:8787/api";

type SeedResult = {
  deckId: string;
  noteId: string;
  cardId: string;
};

async function clearDatabase(request: any) {
  await request.post(`${apiBaseUrl}/admin/clear`);
}

async function seedBasicData(request: any): Promise<SeedResult> {
  const deckId = `deck-${uuidv4()}`;
  const noteId = `note-${uuidv4()}`;
  const cardId = `card-${uuidv4()}`;
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const model = new FsrsCard();
  model.state = State.Review;
  model.due = new Date(Date.now() - 60 * 60 * 1000);

  const deckResponse = await request.post(
    `${apiBaseUrl}/tables/decks/bulk-add`,
    {
      data: {
        rows: [
          {
            id: deckId,
            name: "Demo Deck",
            sub_decks: [],
            super_decks: null,
            cards: [cardId],
            notes: [noteId],
            description: null,
            options: {
              newToReviewRatio: 0.5,
              dailyNewCards: 20,
            },
          },
        ],
      },
    }
  );
  if (!deckResponse.ok()) {
    throw new Error(
      `Deck seed failed: ${deckResponse.status()} ${await deckResponse.text()}`
    );
  }

  const noteResponse = await request.post(
    `${apiBaseUrl}/tables/notes/bulk-add`,
    {
      data: {
        rows: [
          {
            id: noteId,
            deck: deckId,
            creation_date: now.toISOString(),
            custom_order: null,
            content: {
              type: "normal",
              front: "Front",
              back: "Back",
            },
            sort_field: "Front",
          },
        ],
      },
    }
  );
  if (!noteResponse.ok()) {
    throw new Error(
      `Note seed failed: ${noteResponse.status()} ${await noteResponse.text()}`
    );
  }

  const cardResponse = await request.post(
    `${apiBaseUrl}/tables/cards/bulk-add`,
    {
      data: {
        rows: [
          {
            id: cardId,
            note: noteId,
            deck: deckId,
            creation_date: now.toISOString(),
            custom_order: null,
            history: [],
            model,
            content: {
              type: "normal",
            },
          },
        ],
      },
    }
  );
  if (!cardResponse.ok()) {
    throw new Error(
      `Card seed failed: ${cardResponse.status()} ${await cardResponse.text()}`
    );
  }

  const statsResponse = await request.post(
    `${apiBaseUrl}/tables/statistics/bulk-add`,
    {
      data: {
        rows: [
          {
            deck: deckId,
            day: today,
            time: {
              total: 60,
              forNew: 10,
              forReview: 40,
              forLearning: 10,
            },
            cards: {
              [State.New]: 1,
              [State.Review]: 2,
              [State.Learning]: 0,
              [State.Relearning]: 0,
            },
            ratings_list: [],
          },
        ],
      },
    }
  );
  if (!statsResponse.ok()) {
    throw new Error(
      `Stats seed failed: ${statsResponse.status()} ${await statsResponse.text()}`
    );
  }

  const dailyResponse = await request.post(
    `${apiBaseUrl}/tables/daily_new_cards/bulk-add`,
    {
      data: {
        rows: [
          {
            day: today,
            count: 1,
          },
        ],
      },
    }
  );
  if (!dailyResponse.ok()) {
    throw new Error(
      `Daily seed failed: ${dailyResponse.status()} ${await dailyResponse.text()}`
    );
  }

  return { deckId, noteId, cardId };
}

async function ensureRegistered(page: any) {
  await page.goto("/#/home");
  await page.evaluate(() => {
    localStorage.setItem("registered", JSON.stringify(true));
  });
  await page.reload();
}

test("import and statistics load", async ({ page, request }) => {
  await clearDatabase(request);
  const seed = await seedBasicData(request);

  const response = await request.post(
    `${apiBaseUrl}/statistics/review-summary`,
    {
      data: {
        deckId: seed.deckId,
        days: 7,
      },
    }
  );
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.rows.length).toBe(7);

  await ensureRegistered(page);
  await page.goto("/#/stats");
  await expect(
    page.getByRole("heading", { name: /统计|statistics/i })
  ).toBeVisible();
});

test("manage cards list and delete", async ({ page, request }) => {
  await clearDatabase(request);
  const seed = await seedBasicData(request);

  await ensureRegistered(page);
  await page.goto("/#/notes");
  await expect(page.getByText("Front")).toBeVisible();

  await request.post(`${apiBaseUrl}/tables/cards/bulk-delete`, {
    data: { keys: [seed.cardId] },
  });
  await request.post(`${apiBaseUrl}/tables/notes/bulk-delete`, {
    data: { keys: [seed.noteId] },
  });

  await page.reload();
  await expect(page.getByText("Front")).toHaveCount(0);
});

test("today view shows due deck", async ({ page, request }) => {
  await clearDatabase(request);
  await seedBasicData(request);

  await ensureRegistered(page);
  await page.goto("/#/today");
  await expect(page.getByText("Demo Deck")).toBeVisible();
});
