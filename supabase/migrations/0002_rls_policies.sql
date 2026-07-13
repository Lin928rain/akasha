alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.notes enable row level security;
alter table public.statistics enable row level security;
alter table public.settings enable row level security;
alter table public.daily_new_cards enable row level security;

create policy "allow anon full access decks"
on public.decks
for all
to anon
using (true)
with check (true);

create policy "allow anon full access cards"
on public.cards
for all
to anon
using (true)
with check (true);

create policy "allow anon full access notes"
on public.notes
for all
to anon
using (true)
with check (true);

create policy "allow anon full access statistics"
on public.statistics
for all
to anon
using (true)
with check (true);

create policy "allow anon full access settings"
on public.settings
for all
to anon
using (true)
with check (true);

create policy "allow anon full access daily_new_cards"
on public.daily_new_cards
for all
to anon
using (true)
with check (true);
