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

update public.decks set user_id = 'legacy' where user_id is null;
update public.cards set user_id = 'legacy' where user_id is null;
update public.notes set user_id = 'legacy' where user_id is null;
update public.statistics set user_id = 'legacy' where user_id is null;
update public.settings set user_id = 'legacy' where user_id is null;
update public.daily_new_cards set user_id = 'legacy' where user_id is null;

alter table public.decks alter column user_id set not null;
alter table public.cards alter column user_id set not null;
alter table public.notes alter column user_id set not null;
alter table public.statistics alter column user_id set not null;
alter table public.settings alter column user_id set not null;
alter table public.daily_new_cards alter column user_id set not null;

alter table public.statistics drop constraint if exists statistics_pkey;
alter table public.settings drop constraint if exists settings_pkey;
alter table public.daily_new_cards drop constraint if exists daily_new_cards_pkey;

alter table public.statistics add primary key (user_id, deck, day);
alter table public.settings add primary key (user_id, key);
alter table public.daily_new_cards add primary key (user_id, day);

create index if not exists idx_decks_user_id on public.decks (user_id);
create index if not exists idx_cards_user_id on public.cards (user_id);
create index if not exists idx_notes_user_id on public.notes (user_id);
create index if not exists idx_statistics_user_id on public.statistics (user_id);
create index if not exists idx_settings_user_id on public.settings (user_id);
create index if not exists idx_daily_new_cards_user_id on public.daily_new_cards (user_id);
