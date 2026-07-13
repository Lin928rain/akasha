alter table if exists public.decks
  add column if not exists user_id text;

alter table if exists public.cards
  add column if not exists user_id text;

alter table if exists public.notes
  add column if not exists user_id text;

alter table if exists public.statistics
  add column if not exists user_id text;

alter table if exists public.settings
  add column if not exists user_id text;

alter table if exists public.daily_new_cards
  add column if not exists user_id text;
