create table if not exists public.decks (
  id text primary key,
  name text not null,
  sub_decks jsonb not null,
  super_decks jsonb,
  cards jsonb not null,
  notes jsonb not null,
  description text,
  options jsonb not null
);

create table if not exists public.cards (
  id text primary key,
  note text not null,
  deck text not null,
  creation_date timestamptz not null,
  custom_order integer,
  history jsonb not null,
  model jsonb not null,
  content jsonb not null
);

create table if not exists public.notes (
  id text primary key,
  deck text not null,
  creation_date timestamptz not null,
  custom_order integer,
  content jsonb not null,
  sort_field text not null
);

create table if not exists public.statistics (
  deck text not null,
  day date not null,
  time jsonb not null,
  cards jsonb not null,
  ratings_list jsonb not null,
  primary key (deck, day)
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

create table if not exists public.daily_new_cards (
  day date primary key,
  count integer not null
);

create index if not exists idx_cards_note on public.cards (note);
create index if not exists idx_cards_deck on public.cards (deck);
create index if not exists idx_notes_deck on public.notes (deck);
create index if not exists idx_stats_day on public.statistics (day);
create index if not exists idx_stats_deck on public.statistics (deck);
