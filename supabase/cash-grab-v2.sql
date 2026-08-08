-- HoopLoop Platform 10 / Cash Grab v2
-- Run once after the existing HoopLoop Version 7 + Platform 9 migrations.
-- Adds asynchronous friend challenges and random Cash Grab matchmaking.

create table if not exists public.cash_grab_matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete set null,
  winner_id uuid references public.profiles(id) on delete set null,
  match_type text not null check (match_type in ('random','friend')),
  status text not null default 'waiting' check (status in ('waiting','invited','finished','cancelled')),
  board_type text not null check (board_type in ('daily','random')),
  pool_mode text not null check (pool_mode in ('current','alltime','mixed')),
  board_key text not null,
  host_board jsonb not null,
  opponent_board jsonb,
  host_roster jsonb not null,
  opponent_roster jsonb,
  host_metrics jsonb not null,
  opponent_metrics jsonb,
  host_score integer,
  opponent_score integer,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint cash_grab_not_self check (opponent_id is null or host_id <> opponent_id),
  constraint cash_grab_host_board_25 check (jsonb_typeof(host_board)='array' and jsonb_array_length(host_board)=25),
  constraint cash_grab_host_roster_5 check (jsonb_typeof(host_roster)='array' and jsonb_array_length(host_roster)=5)
);

create index if not exists cash_grab_random_waiting_idx
  on public.cash_grab_matches (match_type, status, board_type, pool_mode, created_at);
create index if not exists cash_grab_host_idx on public.cash_grab_matches (host_id, created_at desc);
create index if not exists cash_grab_opponent_idx on public.cash_grab_matches (opponent_id, created_at desc);

alter table public.cash_grab_matches enable row level security;

drop policy if exists "cash grab participants read matches" on public.cash_grab_matches;
create policy "cash grab participants read matches"
on public.cash_grab_matches for select
to authenticated
using ((select auth.uid()) in (host_id, opponent_id));

-- Internal resolver. Player clients cannot call this directly.
create or replace function public.cash_grab_resolve(p_match_id uuid)
returns public.cash_grab_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.cash_grab_matches;
  host_power numeric;
  opponent_power numeric;
  host_chance numeric;
  host_wins boolean;
  hs integer;
  os integer;
begin
  select * into m from public.cash_grab_matches where id=p_match_id for update;
  if m.id is null then raise exception 'Cash Grab match not found.'; end if;
  if m.opponent_id is null or m.opponent_roster is null or m.opponent_metrics is null then
    raise exception 'Both lineups are required.';
  end if;

  host_power := coalesce((m.host_metrics->>'fit')::numeric,0)*0.50
              + coalesce((m.host_metrics->>'talent')::numeric,0)*0.30
              + coalesce((m.host_metrics->>'versatility')::numeric,0)*0.20;
  opponent_power := coalesce((m.opponent_metrics->>'fit')::numeric,0)*0.50
                  + coalesce((m.opponent_metrics->>'talent')::numeric,0)*0.30
                  + coalesce((m.opponent_metrics->>'versatility')::numeric,0)*0.20;

  host_chance := greatest(0.08, least(0.92, 1.0/(1.0 + exp(-(host_power-opponent_power)/6.8))));
  host_wins := random() < host_chance;

  hs := round(93 + host_power*0.28 + (random()-0.5)*16)::integer;
  os := round(93 + opponent_power*0.28 + (random()-0.5)*16)::integer;
  hs := greatest(82, hs);
  os := greatest(82, os);

  if host_wins and hs <= os then hs := os + 1 + floor(random()*7)::integer; end if;
  if not host_wins and os <= hs then os := hs + 1 + floor(random()*7)::integer; end if;

  update public.cash_grab_matches
  set status='finished',
      winner_id=case when host_wins then host_id else opponent_id end,
      host_score=hs,
      opponent_score=os,
      finished_at=now()
  where id=p_match_id
  returning * into m;

  return m;
end;
$$;

revoke all on function public.cash_grab_resolve(uuid) from public, anon, authenticated;

create or replace function public.create_cash_grab_friend_match(
  p_friend_username text,
  p_board_type text,
  p_pool_mode text,
  p_board_key text,
  p_host_board jsonb,
  p_host_roster jsonb,
  p_host_metrics jsonb
)
returns public.cash_grab_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target_id uuid;
  result public.cash_grab_matches;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select id into target_id from public.profiles where username=p_friend_username::citext;
  if target_id is null then raise exception 'Username not found.'; end if;
  if target_id=uid then raise exception 'You cannot challenge yourself.'; end if;
  if not exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and least(f.requester_id,f.addressee_id)=least(uid,target_id)
      and greatest(f.requester_id,f.addressee_id)=greatest(uid,target_id)
  ) then raise exception 'You can only directly challenge accepted friends.'; end if;
  if p_board_type not in ('daily','random') or p_pool_mode not in ('current','alltime','mixed') then raise exception 'Invalid Cash Grab mode.'; end if;
  if jsonb_typeof(p_host_board)<>'array' or jsonb_array_length(p_host_board)<>25 then raise exception 'A 25-player board is required.'; end if;
  if jsonb_typeof(p_host_roster)<>'array' or jsonb_array_length(p_host_roster)<>5 then raise exception 'A five-player roster is required.'; end if;

  insert into public.cash_grab_matches (
    host_id,opponent_id,match_type,status,board_type,pool_mode,board_key,host_board,host_roster,host_metrics
  ) values (
    uid,target_id,'friend','invited',p_board_type,p_pool_mode,p_board_key,p_host_board,p_host_roster,p_host_metrics
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.submit_cash_grab_friend_lineup(
  p_match_id uuid,
  p_opponent_roster jsonb,
  p_opponent_metrics jsonb
)
returns public.cash_grab_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.cash_grab_matches;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  if jsonb_typeof(p_opponent_roster)<>'array' or jsonb_array_length(p_opponent_roster)<>5 then raise exception 'A five-player roster is required.'; end if;
  update public.cash_grab_matches
  set opponent_roster=p_opponent_roster,
      opponent_metrics=p_opponent_metrics,
      opponent_board=host_board
  where id=p_match_id and opponent_id=uid and match_type='friend' and status='invited';
  if not found then raise exception 'This challenge is no longer available.'; end if;
  select * into result from public.cash_grab_resolve(p_match_id);
  return result;
end;
$$;

create or replace function public.join_cash_grab_random(
  p_board_type text,
  p_pool_mode text,
  p_board_key text,
  p_board jsonb,
  p_roster jsonb,
  p_metrics jsonb
)
returns public.cash_grab_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  found_match public.cash_grab_matches;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  if p_board_type not in ('daily','random') or p_pool_mode not in ('current','alltime','mixed') then raise exception 'Invalid Cash Grab mode.'; end if;
  if jsonb_typeof(p_board)<>'array' or jsonb_array_length(p_board)<>25 then raise exception 'A 25-player board is required.'; end if;
  if jsonb_typeof(p_roster)<>'array' or jsonb_array_length(p_roster)<>5 then raise exception 'A five-player roster is required.'; end if;

  -- Do not leave several old queues open for the same user.
  update public.cash_grab_matches set status='cancelled'
  where host_id=uid and match_type='random' and status='waiting';

  select * into found_match
  from public.cash_grab_matches
  where match_type='random'
    and status='waiting'
    and opponent_id is null
    and host_id<>uid
    and board_type=p_board_type
    and pool_mode=p_pool_mode
    and created_at>now()-interval '10 minutes'
  order by created_at
  for update skip locked
  limit 1;

  if found_match.id is not null then
    update public.cash_grab_matches
    set opponent_id=uid,
        opponent_board=p_board,
        opponent_roster=p_roster,
        opponent_metrics=p_metrics
    where id=found_match.id
    returning * into found_match;
    select * into found_match from public.cash_grab_resolve(found_match.id);
    return found_match;
  end if;

  insert into public.cash_grab_matches (
    host_id,match_type,status,board_type,pool_mode,board_key,host_board,host_roster,host_metrics
  ) values (
    uid,'random','waiting',p_board_type,p_pool_mode,p_board_key,p_board,p_roster,p_metrics
  ) returning * into found_match;
  return found_match;
end;
$$;

create or replace function public.cancel_cash_grab_match(p_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  changed integer;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  update public.cash_grab_matches
  set status='cancelled'
  where id=p_match_id
    and uid in (host_id,opponent_id)
    and status in ('waiting','invited');
  get diagnostics changed=row_count;
  return changed>0;
end;
$$;

revoke all on function public.create_cash_grab_friend_match(text,text,text,text,jsonb,jsonb,jsonb) from public, anon;
revoke all on function public.submit_cash_grab_friend_lineup(uuid,jsonb,jsonb) from public, anon;
revoke all on function public.join_cash_grab_random(text,text,text,jsonb,jsonb,jsonb) from public, anon;
revoke all on function public.cancel_cash_grab_match(uuid) from public, anon;
grant execute on function public.create_cash_grab_friend_match(text,text,text,text,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.submit_cash_grab_friend_lineup(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.join_cash_grab_random(text,text,text,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.cancel_cash_grab_match(uuid) to authenticated;

-- Realtime is useful so a user waiting in random matchmaking can see a result immediately.
do $$
begin
  alter publication supabase_realtime add table public.cash_grab_matches;
exception
  when duplicate_object then null;
end $$;

select 'cash_grab_matches' as created_table;

create or replace function public.cash_grab_version()
returns text
language sql
stable
security definer
set search_path = public
as $$ select 'cash-grab-v2'; $$;
grant execute on function public.cash_grab_version() to anon, authenticated;
