drop policy if exists "allow anon full access decks" on public.decks;
drop policy if exists "allow anon full access cards" on public.cards;
drop policy if exists "allow anon full access notes" on public.notes;
drop policy if exists "allow anon full access statistics" on public.statistics;
drop policy if exists "allow anon full access settings" on public.settings;
drop policy if exists "allow anon full access daily_new_cards" on public.daily_new_cards;

create policy "user scoped decks"
on public.decks
for all
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "user scoped cards"
on public.cards
for all
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "user scoped notes"
on public.notes
for all
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "user scoped statistics"
on public.statistics
for all
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "user scoped settings"
on public.settings
for all
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "user scoped daily_new_cards"
on public.daily_new_cards
for all
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);
