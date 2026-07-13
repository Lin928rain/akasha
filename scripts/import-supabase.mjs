import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];
const overwrite = process.argv.includes("--overwrite");

if (!filePath) {
  console.error(
    "Usage: node scripts/import-supabase.mjs <export.json> [--overwrite]"
  );
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const raw = await readFile(filePath, "utf8");
const data = JSON.parse(raw);

const decks = (data.decks ?? []).map((deck) => ({
  id: deck.id,
  name: deck.name,
  sub_decks: deck.subDecks ?? [],
  super_decks: deck.superDecks ?? null,
  cards: deck.cards ?? [],
  notes: deck.notes ?? [],
  description: deck.description ?? null,
  options: deck.options ?? {},
}));

const cards = (data.cards ?? []).map((card) => ({
  id: card.id,
  note: card.note,
  deck: card.deck,
  creation_date: card.creationDate,
  custom_order: card.customOrder ?? null,
  history: card.history ?? [],
  model: card.model ?? {},
  content: card.content ?? {},
}));

const notes = (data.notes ?? []).map((note) => ({
  id: note.id,
  deck: note.deck,
  creation_date: note.creationDate,
  custom_order: note.customOrder ?? null,
  content: note.content ?? {},
  sort_field: note.sortField ?? "",
}));

const statistics = (data.statistics ?? []).map((stat) => ({
  deck: stat.deck,
  day: stat.day,
  time: stat.time ?? {},
  cards: stat.cards ?? {},
  ratings_list: stat.ratingsList ?? [],
}));

const settings = (data.settings ?? []).map((setting) => ({
  key: setting.key,
  value: setting.value ?? null,
}));

const dailyNewCards = (data.dailyNewCards ?? []).map((row) => ({
  day: row.day,
  count: row.count ?? 0,
}));

async function truncateAll() {
  await supabase.from("cards").delete().neq("id", "");
  await supabase.from("notes").delete().neq("id", "");
  await supabase.from("decks").delete().neq("id", "");
  await supabase.from("statistics").delete().neq("deck", "");
  await supabase.from("settings").delete().neq("key", "");
  await supabase.from("daily_new_cards").delete().not("day", "is", null);
}

async function insertAll() {
  if (decks.length) await supabase.from("decks").upsert(decks);
  if (cards.length) await supabase.from("cards").upsert(cards);
  if (notes.length) await supabase.from("notes").upsert(notes);
  if (statistics.length) await supabase.from("statistics").upsert(statistics);
  if (settings.length) await supabase.from("settings").upsert(settings);
  if (dailyNewCards.length)
    await supabase.from("daily_new_cards").upsert(dailyNewCards);
}

if (overwrite) {
  await truncateAll();
}
await insertAll();

console.log("Import completed.");
