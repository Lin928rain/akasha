-- 创建预聚合统计表，用于快速查询卡组卡片统计
create table if not exists public.deck_card_counts (
  user_id text not null,
  deck_id text not null,
  new_count integer not null default 0,
  learning_count integer not null default 0,
  review_count integer not null default 0,
  not_due_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, deck_id)
);

-- 创建索引加速查询
create index if not exists idx_deck_card_counts_user on public.deck_card_counts (user_id);
create index if not exists idx_deck_card_counts_deck on public.deck_card_counts (deck_id);

-- 创建触发器函数：计算单个卡片的统计贡献
create or replace function get_card_state_counts(p_user_id text, p_deck_id text)
returns table (new_count integer, learning_count integer, review_count integer, not_due_count integer) as $$
declare
  v_now timestamptz := now();
begin
  return query
  select
    count(*) filter (where (model->>'state')::integer = 0)::integer as new_count,
    count(*) filter (where (model->>'state')::integer in (1, 3))::integer as learning_count,
    count(*) filter (where (model->>'state')::integer = 2 and (model->>'due')::timestamptz <= v_now)::integer as review_count,
    count(*) filter (where (model->>'state')::integer = 2 and (model->>'due')::timestamptz > v_now)::integer as not_due_count
  from cards
  where user_id = p_user_id
    and deck = p_deck_id;
end;
$$ language plpgsql stable;

-- 创建触发器函数：更新或插入 deck_card_counts
create or replace function update_deck_card_counts()
returns trigger as $$
declare
  v_deck_id text;
  v_user_id text;
  v_counts record;
begin
  -- 处理 UPDATE 时 deck 变化的情况
  if tg_op = 'UPDATE' and old.deck is distinct from new.deck then
    -- 更新旧 deck 的统计
    select * into v_counts
    from get_card_state_counts(old.user_id, old.deck);

    insert into deck_card_counts (user_id, deck_id, new_count, learning_count, review_count, not_due_count, updated_at)
    values (old.user_id, old.deck, v_counts.new_count, v_counts.learning_count, v_counts.review_count, v_counts.not_due_count, now())
    on conflict (user_id, deck_id)
    do update set
      new_count = v_counts.new_count,
      learning_count = v_counts.learning_count,
      review_count = v_counts.review_count,
      not_due_count = v_counts.not_due_count,
      updated_at = now();

    -- 更新新 deck 的统计
    select * into v_counts
    from get_card_state_counts(new.user_id, new.deck);

    insert into deck_card_counts (user_id, deck_id, new_count, learning_count, review_count, not_due_count, updated_at)
    values (new.user_id, new.deck, v_counts.new_count, v_counts.learning_count, v_counts.review_count, v_counts.not_due_count, now())
    on conflict (user_id, deck_id)
    do update set
      new_count = v_counts.new_count,
      learning_count = v_counts.learning_count,
      review_count = v_counts.review_count,
      not_due_count = v_counts.not_due_count,
      updated_at = now();
  else
    -- 确定要更新的 deck_id 和 user_id
    if tg_op = 'DELETE' then
      v_deck_id := old.deck;
      v_user_id := old.user_id;
    else
      v_deck_id := new.deck;
      v_user_id := new.user_id;
    end if;

    -- 计算新的统计数据
    select * into v_counts
    from get_card_state_counts(v_user_id, v_deck_id);

    -- 插入或更新统计记录
    insert into deck_card_counts (user_id, deck_id, new_count, learning_count, review_count, not_due_count, updated_at)
    values (v_user_id, v_deck_id, v_counts.new_count, v_counts.learning_count, v_counts.review_count, v_counts.not_due_count, now())
    on conflict (user_id, deck_id)
    do update set
      new_count = v_counts.new_count,
      learning_count = v_counts.learning_count,
      review_count = v_counts.review_count,
      not_due_count = v_counts.not_due_count,
      updated_at = now();
  end if;

  return null;
end;
$$ language plpgsql;

-- 创建触发器：卡片变化时自动更新统计
create trigger trg_update_deck_card_counts_after_insert
  after insert on cards
  for each row execute function update_deck_card_counts();

create trigger trg_update_deck_card_counts_after_update
  after update on cards
  for each row execute function update_deck_card_counts();

create trigger trg_update_deck_card_counts_after_delete
  after delete on cards
  for each row execute function update_deck_card_counts();

-- 初始化现有数据
insert into deck_card_counts (user_id, deck_id, new_count, learning_count, review_count, not_due_count, updated_at)
select
  user_id,
  deck,
  count(*) filter (where (model->>'state')::integer = 0)::integer as new_count,
  count(*) filter (where (model->>'state')::integer in (1, 3))::integer as learning_count,
  count(*) filter (where (model->>'state')::integer = 2 and (model->>'due')::timestamptz <= now())::integer as review_count,
  count(*) filter (where (model->>'state')::integer = 2 and (model->>'due')::timestamptz > now())::integer as not_due_count,
  now() as updated_at
from cards
group by user_id, deck
on conflict (user_id, deck_id) do update set
  new_count = excluded.new_count,
  learning_count = excluded.learning_count,
  review_count = excluded.review_count,
  not_due_count = excluded.not_due_count,
  updated_at = excluded.updated_at;

-- 创建刷新函数，用于手动刷新统计数据（例如批量导入后）
create or replace function refresh_deck_card_counts()
returns void as $$
begin
  -- 删除孤立的统计记录（对应的卡片已不存在）
  delete from deck_card_counts dcc
  where not exists (
    select 1 from cards c
    where c.user_id = dcc.user_id and c.deck = dcc.deck_id
  );

  -- 重新计算所有卡组的统计数据
  insert into deck_card_counts (user_id, deck_id, new_count, learning_count, review_count, not_due_count, updated_at)
  select
    user_id,
    deck,
    count(*) filter (where (model->>'state')::integer = 0)::integer as new_count,
    count(*) filter (where (model->>'state')::integer in (1, 3))::integer as learning_count,
    count(*) filter (where (model->>'state')::integer = 2 and (model->>'due')::timestamptz <= now())::integer as review_count,
    count(*) filter (where (model->>'state')::integer = 2 and (model->>'due')::timestamptz > now())::integer as not_due_count,
    now() as updated_at
  from cards
  group by user_id, deck
  on conflict (user_id, deck_id) do update set
    new_count = excluded.new_count,
    learning_count = excluded.learning_count,
    review_count = excluded.review_count,
    not_due_count = excluded.not_due_count,
    updated_at = excluded.updated_at;
end;
$$ language plpgsql;

-- 添加 RLS 策略
alter table deck_card_counts enable row level security;

create policy "Users can view their own deck card counts"
  on deck_card_counts
  for select
  using (auth.uid()::text = user_id);

create policy "Users can insert their own deck card counts"
  on deck_card_counts
  for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update their own deck card counts"
  on deck_card_counts
  for update
  using (auth.uid()::text = user_id);

create policy "Users can delete their own deck card counts"
  on deck_card_counts
  for delete
  using (auth.uid()::text = user_id);
