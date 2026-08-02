-- HoopLoop Version 8: Start, Bench, Cut
-- Run this AFTER the existing Version 7 setup.sql.
-- Safe to run again: functions and policies are replaced, existing votes remain.

create table if not exists public.sbc_daily_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_date date not null,
  puzzle_signature text not null,
  start_player_id bigint not null,
  bench_player_id bigint not null,
  cut_player_id bigint not null,
  created_at timestamptz not null default now(),
  constraint sbc_daily_votes_unique_user_day unique (user_id, puzzle_date),
  constraint sbc_daily_votes_distinct_roles check (
    start_player_id <> bench_player_id
    and start_player_id <> cut_player_id
    and bench_player_id <> cut_player_id
  )
);

create index if not exists sbc_daily_votes_puzzle_idx
  on public.sbc_daily_votes (puzzle_date, puzzle_signature);

alter table public.sbc_daily_votes enable row level security;

-- Individual votes stay private. Users can read only their own row.
drop policy if exists "Users can read their own SBC votes" on public.sbc_daily_votes;
create policy "Users can read their own SBC votes"
on public.sbc_daily_votes
for select
to authenticated
using (auth.uid() = user_id);

-- Direct browser writes are disabled. Official votes must use the validated RPC below.
drop policy if exists "Users can insert their own SBC votes" on public.sbc_daily_votes;
revoke insert, update, delete on table public.sbc_daily_votes from anon, authenticated;

create or replace function public.get_sbc_daily_results(
  p_puzzle_date date,
  p_puzzle_signature text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with filtered as (
    select start_player_id, bench_player_id, cut_player_id
    from public.sbc_daily_votes
    where puzzle_date = p_puzzle_date
      and puzzle_signature = p_puzzle_signature
  ),
  role_rows as (
    select start_player_id as player_id, 'start'::text as role from filtered
    union all
    select bench_player_id, 'bench'::text from filtered
    union all
    select cut_player_id, 'cut'::text from filtered
  ),
  role_counts as (
    select player_id,
      count(*) filter (where role = 'start')::int as start_count,
      count(*) filter (where role = 'bench')::int as bench_count,
      count(*) filter (where role = 'cut')::int as cut_count
    from role_rows
    group by player_id
  ),
  lineup_counts as (
    select start_player_id, bench_player_id, cut_player_id, count(*)::int as vote_count
    from filtered
    group by start_player_id, bench_player_id, cut_player_id
    order by vote_count desc, start_player_id, bench_player_id, cut_player_id
  )
  select jsonb_build_object(
    'totalVotes', (select count(*)::int from filtered),
    'roles', coalesce(
      (select jsonb_object_agg(
        player_id::text,
        jsonb_build_object(
          'start', start_count,
          'bench', bench_count,
          'cut', cut_count
        )
      ) from role_counts),
      '{}'::jsonb
    ),
    'lineups', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'startPlayerId', start_player_id,
        'benchPlayerId', bench_player_id,
        'cutPlayerId', cut_player_id,
        'count', vote_count
      )) from lineup_counts),
      '[]'::jsonb
    )
  );
$$;

create or replace function public.get_my_sbc_daily_vote(
  p_puzzle_date date
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    else (
      select jsonb_build_object(
        'puzzleDate', puzzle_date,
        'puzzleSignature', puzzle_signature,
        'startPlayerId', start_player_id,
        'benchPlayerId', bench_player_id,
        'cutPlayerId', cut_player_id,
        'createdAt', created_at
      )
      from public.sbc_daily_votes
      where user_id = auth.uid()
        and puzzle_date = p_puzzle_date
      limit 1
    )
  end;
$$;

create or replace function public.submit_sbc_daily_vote(
  p_puzzle_date date,
  p_puzzle_signature text,
  p_start_player_id bigint,
  p_bench_player_id bigint,
  p_cut_player_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted boolean := false;
  v_row_count integer := 0;
  v_vote jsonb;
  v_results jsonb;
  v_signature_parts text[];
  v_signature_player_ids bigint[];
begin
  if v_user_id is null then
    raise exception 'You must be logged in to save an official Start, Bench, Cut vote.';
  end if;

  if p_puzzle_signature is null or length(trim(p_puzzle_signature)) < 6 then
    raise exception 'Invalid puzzle signature.';
  end if;

  -- The browser signature encodes the date, mode, position pool, and the exact
  -- three player IDs. Validate it before allowing the vote into community totals.
  v_signature_parts := regexp_match(
    p_puzzle_signature,
    '^sbc8-([0-9]{4}-[0-9]{2}-[0-9]{2})-(modern|allstars|random)-(all|guards|forwards|bigs)-([0-9]+)-([0-9]+)-([0-9]+)$'
  );

  if v_signature_parts is null
     or v_signature_parts[1] <> p_puzzle_date::text then
    raise exception 'Puzzle signature does not match this Daily.';
  end if;

  v_signature_player_ids := array[
    v_signature_parts[4]::bigint,
    v_signature_parts[5]::bigint,
    v_signature_parts[6]::bigint
  ];

  if p_start_player_id <= 0 or p_bench_player_id <= 0 or p_cut_player_id <= 0
     or not (p_start_player_id = any(v_signature_player_ids))
     or not (p_bench_player_id = any(v_signature_player_ids))
     or not (p_cut_player_id = any(v_signature_player_ids)) then
    raise exception 'Vote contains a player outside this Daily matchup.';
  end if;

  if p_start_player_id = p_bench_player_id
     or p_start_player_id = p_cut_player_id
     or p_bench_player_id = p_cut_player_id then
    raise exception 'Start, Bench, and Cut must be three different players.';
  end if;

  insert into public.sbc_daily_votes (
    user_id,
    puzzle_date,
    puzzle_signature,
    start_player_id,
    bench_player_id,
    cut_player_id
  ) values (
    v_user_id,
    p_puzzle_date,
    p_puzzle_signature,
    p_start_player_id,
    p_bench_player_id,
    p_cut_player_id
  )
  on conflict (user_id, puzzle_date) do nothing;

  get diagnostics v_row_count = row_count;
  v_inserted := v_row_count > 0;

  select jsonb_build_object(
    'puzzleDate', puzzle_date,
    'puzzleSignature', puzzle_signature,
    'startPlayerId', start_player_id,
    'benchPlayerId', bench_player_id,
    'cutPlayerId', cut_player_id,
    'createdAt', created_at
  )
  into v_vote
  from public.sbc_daily_votes
  where user_id = v_user_id
    and puzzle_date = p_puzzle_date
  limit 1;

  v_results := public.get_sbc_daily_results(p_puzzle_date, p_puzzle_signature);

  return jsonb_build_object(
    'inserted', v_inserted,
    'vote', v_vote,
    'results', v_results
  );
end;
$$;

revoke all on function public.get_sbc_daily_results(date, text) from public;
revoke all on function public.get_my_sbc_daily_vote(date) from public;
revoke all on function public.submit_sbc_daily_vote(date, text, bigint, bigint, bigint) from public;

grant execute on function public.get_sbc_daily_results(date, text) to anon, authenticated;
grant execute on function public.get_my_sbc_daily_vote(date) to authenticated;
grant execute on function public.submit_sbc_daily_vote(date, text, bigint, bigint, bigint) to authenticated;

-- Verification result: one row named sbc_daily_votes should appear.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'sbc_daily_votes';
