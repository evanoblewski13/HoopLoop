-- HoopLoop Platform 11 / Cash Grab v3
-- Adds one-attempt Daily Gauntlet standings and realtime snake-draft battles.
-- Safe to run after the existing HoopLoop + Cash Grab v2 migrations.

create extension if not exists pgcrypto;

create table if not exists public.cash_grab_daily_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_date date not null,
  pool_mode text not null check (pool_mode in ('current','alltime')),
  board_key text not null,
  roster jsonb not null,
  status text not null default 'active' check (status in ('active','finished')),
  rounds_cleared integer not null default 0 check (rounds_cleared between 0 and 10),
  failed_round integer check (failed_round between 1 and 10),
  point_diff integer not null default 0,
  points_for integer not null default 0,
  points_against integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, challenge_date, pool_mode),
  constraint cash_grab_daily_roster_5 check (jsonb_typeof(roster)='array' and jsonb_array_length(roster)=5)
);

create index if not exists cash_grab_daily_board_idx
  on public.cash_grab_daily_runs (challenge_date desc, pool_mode, status, rounds_cleared desc, point_diff desc, points_for desc, completed_at);

alter table public.cash_grab_daily_runs enable row level security;
drop policy if exists "cash grab daily standings readable" on public.cash_grab_daily_runs;
create policy "cash grab daily standings readable"
on public.cash_grab_daily_runs for select
to anon, authenticated
using (true);

grant select on public.cash_grab_daily_runs to anon, authenticated;

create or replace function public.start_cash_grab_daily_run(
  p_challenge_date date,
  p_pool_mode text,
  p_board_key text,
  p_roster jsonb
)
returns public.cash_grab_daily_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today_chicago date := timezone('America/Chicago', now())::date;
  result public.cash_grab_daily_runs;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  if p_challenge_date <> today_chicago then raise exception 'Official Daily attempts are only available on the live day.'; end if;
  if p_pool_mode not in ('current','alltime') then raise exception 'Invalid player pool.'; end if;
  if jsonb_typeof(p_roster)<>'array' or jsonb_array_length(p_roster)<>5 then raise exception 'A five-player roster is required.'; end if;
  begin
    insert into public.cash_grab_daily_runs(user_id,challenge_date,pool_mode,board_key,roster)
    values(uid,p_challenge_date,p_pool_mode,p_board_key,p_roster)
    returning * into result;
  exception when unique_violation then
    raise exception 'Your official attempt for this Daily board has already been used.';
  end;
  return result;
end;
$$;

create or replace function public.finish_cash_grab_daily_run(
  p_run_id uuid,
  p_rounds_cleared integer,
  p_failed_round integer,
  p_point_diff integer,
  p_points_for integer,
  p_points_against integer
)
returns public.cash_grab_daily_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.cash_grab_daily_runs;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  if p_rounds_cleared < 0 or p_rounds_cleared > 10 then raise exception 'Invalid round total.'; end if;
  if p_failed_round is not null and (p_failed_round < 1 or p_failed_round > 10) then raise exception 'Invalid failed round.'; end if;
  update public.cash_grab_daily_runs
  set status='finished', rounds_cleared=p_rounds_cleared, failed_round=p_failed_round,
      point_diff=p_point_diff, points_for=p_points_for, points_against=p_points_against,
      completed_at=now()
  where id=p_run_id and user_id=uid and status='active'
  returning * into result;
  if result.id is null then raise exception 'This Daily attempt could not be finalized.'; end if;
  return result;
end;
$$;

revoke all on function public.start_cash_grab_daily_run(date,text,text,jsonb) from public, anon;
revoke all on function public.finish_cash_grab_daily_run(uuid,integer,integer,integer,integer,integer) from public, anon;
grant execute on function public.start_cash_grab_daily_run(date,text,text,jsonb) to authenticated;
grant execute on function public.finish_cash_grab_daily_run(uuid,integer,integer,integer,integer,integer) to authenticated;

create table if not exists public.cash_grab_drafts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete cascade,
  match_type text not null check (match_type in ('friend','random')),
  status text not null check (status in ('invited','waiting','drafting','ready','finished','cancelled')),
  board_type text not null check (board_type in ('daily','random')),
  pool_mode text not null check (pool_mode in ('current','alltime')),
  board_key text not null,
  board jsonb not null,
  first_picker uuid references public.profiles(id),
  turn_user uuid references public.profiles(id),
  pick_number integer not null default 0 check (pick_number between 0 and 10),
  host_picks jsonb not null default '[]'::jsonb,
  opponent_picks jsonb not null default '[]'::jsonb,
  host_budget integer not null default 15 check (host_budget between 0 and 15),
  opponent_budget integer not null default 15 check (opponent_budget between 0 and 15),
  resolution_seed uuid not null default gen_random_uuid(),
  winner_id uuid references public.profiles(id),
  host_score integer,
  opponent_score integer,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint cash_grab_draft_not_self check (opponent_id is null or host_id<>opponent_id),
  constraint cash_grab_draft_board_25 check (jsonb_typeof(board)='array' and jsonb_array_length(board)=25),
  constraint cash_grab_host_picks_max check (jsonb_typeof(host_picks)='array' and jsonb_array_length(host_picks)<=5),
  constraint cash_grab_opponent_picks_max check (jsonb_typeof(opponent_picks)='array' and jsonb_array_length(opponent_picks)<=5)
);

create index if not exists cash_grab_drafts_waiting_idx on public.cash_grab_drafts(match_type,status,pool_mode,board_type,created_at);
create index if not exists cash_grab_drafts_host_idx on public.cash_grab_drafts(host_id,created_at desc);
create index if not exists cash_grab_drafts_opponent_idx on public.cash_grab_drafts(opponent_id,created_at desc);

alter table public.cash_grab_drafts enable row level security;
drop policy if exists "cash grab draft participants read" on public.cash_grab_drafts;
create policy "cash grab draft participants read"
on public.cash_grab_drafts for select
to authenticated
using ((select auth.uid()) in (host_id,opponent_id));
grant select on public.cash_grab_drafts to authenticated;

create or replace function public.cash_grab_pick_price(p_board jsonb,p_player_id text)
returns integer
language sql
immutable
as $$
  select (x->>'price')::integer
  from jsonb_array_elements(p_board) x
  where x->>'id'=p_player_id
  limit 1;
$$;

create or replace function public.create_cash_grab_friend_draft(
  p_friend_username text,
  p_board_type text,
  p_pool_mode text,
  p_board_key text,
  p_board jsonb
)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid(); target_id uuid; result public.cash_grab_drafts;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select id into target_id from public.profiles where username=p_friend_username::citext;
  if target_id is null then raise exception 'Username not found.'; end if;
  if target_id=uid then raise exception 'You cannot challenge yourself.'; end if;
  if not exists (
    select 1 from public.friendships f where f.status='accepted'
      and least(f.requester_id,f.addressee_id)=least(uid,target_id)
      and greatest(f.requester_id,f.addressee_id)=greatest(uid,target_id)
  ) then raise exception 'You can only directly invite accepted friends.'; end if;
  if p_board_type not in ('daily','random') or p_pool_mode not in ('current','alltime') then raise exception 'Invalid Cash Grab mode.'; end if;
  if jsonb_typeof(p_board)<>'array' or jsonb_array_length(p_board)<>25 then raise exception 'A 25-player board is required.'; end if;
  insert into public.cash_grab_drafts(host_id,opponent_id,match_type,status,board_type,pool_mode,board_key,board)
  values(uid,target_id,'friend','invited',p_board_type,p_pool_mode,p_board_key,p_board)
  returning * into result;
  return result;
end;
$$;

create or replace function public.accept_cash_grab_friend_draft(p_draft_id uuid)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid(); d public.cash_grab_drafts; fp uuid;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.id is null or d.opponent_id<>uid or d.status<>'invited' then raise exception 'This draft invite is no longer available.'; end if;
  fp := case when random()<0.5 then d.host_id else d.opponent_id end;
  update public.cash_grab_drafts set status='drafting',first_picker=fp,turn_user=fp,updated_at=now() where id=d.id returning * into d;
  return d;
end;
$$;

create or replace function public.join_cash_grab_random_draft(
  p_board_type text,
  p_pool_mode text,
  p_board_key text,
  p_board jsonb
)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid(); d public.cash_grab_drafts; fp uuid;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  if p_board_type not in ('daily','random') or p_pool_mode not in ('current','alltime') then raise exception 'Invalid Cash Grab mode.'; end if;
  if jsonb_typeof(p_board)<>'array' or jsonb_array_length(p_board)<>25 then raise exception 'A 25-player board is required.'; end if;
  update public.cash_grab_drafts set status='cancelled',updated_at=now()
  where host_id=uid and match_type='random' and status='waiting';

  select * into d from public.cash_grab_drafts
  where match_type='random' and status='waiting' and opponent_id is null and host_id<>uid
    and pool_mode=p_pool_mode and board_type=p_board_type and created_at>now()-interval '10 minutes'
    and (p_board_type='random' or board_key=p_board_key)
  order by created_at for update skip locked limit 1;

  if d.id is not null then
    fp := case when random()<0.5 then d.host_id else uid end;
    update public.cash_grab_drafts set opponent_id=uid,status='drafting',first_picker=fp,turn_user=fp,updated_at=now()
    where id=d.id returning * into d;
    return d;
  end if;

  insert into public.cash_grab_drafts(host_id,match_type,status,board_type,pool_mode,board_key,board)
  values(uid,'random','waiting',p_board_type,p_pool_mode,p_board_key,p_board)
  returning * into d;
  return d;
end;
$$;

create or replace function public.make_cash_grab_draft_pick(p_draft_id uuid,p_player_id text)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid(); d public.cash_grab_drafts; price integer; mine jsonb; used jsonb; new_pick integer; first_side integer; owner_side integer; next_side integer; other_id uuid;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.id is null or d.status<>'drafting' then raise exception 'This draft is not accepting picks.'; end if;
  if uid not in (d.host_id,d.opponent_id) or d.turn_user<>uid then raise exception 'It is not your turn.'; end if;
  price := public.cash_grab_pick_price(d.board,p_player_id);
  if price is null then raise exception 'That player is not on this draft board.'; end if;
  if exists(select 1 from jsonb_array_elements(d.host_picks||d.opponent_picks) x where x->>'id'=p_player_id) then raise exception 'That player has already been drafted.'; end if;

  if uid=d.host_id then
    if jsonb_array_length(d.host_picks)>=5 then raise exception 'Your roster is full.'; end if;
    if d.host_budget-price<0 then raise exception 'That pick exceeds your $15 budget.'; end if;
    update public.cash_grab_drafts set host_picks=host_picks||jsonb_build_array(jsonb_build_object('id',p_player_id,'price',price)),host_budget=host_budget-price where id=d.id;
  else
    if jsonb_array_length(d.opponent_picks)>=5 then raise exception 'Your roster is full.'; end if;
    if d.opponent_budget-price<0 then raise exception 'That pick exceeds your $15 budget.'; end if;
    update public.cash_grab_drafts set opponent_picks=opponent_picks||jsonb_build_array(jsonb_build_object('id',p_player_id,'price',price)),opponent_budget=opponent_budget-price where id=d.id;
  end if;

  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  new_pick := d.pick_number+1;
  if new_pick>=10 then
    update public.cash_grab_drafts set pick_number=10,status='ready',turn_user=null,updated_at=now() where id=d.id returning * into d;
    return d;
  end if;

  other_id := case when d.first_picker=d.host_id then d.opponent_id else d.host_id end;
  next_side := (array[0,1,1,0,0,1,1,0,0,1])[new_pick+1];
  update public.cash_grab_drafts set pick_number=new_pick,turn_user=case when next_side=0 then d.first_picker else other_id end,updated_at=now() where id=d.id returning * into d;
  return d;
end;
$$;

create or replace function public.finalize_cash_grab_draft(
  p_draft_id uuid,
  p_host_score integer,
  p_opponent_score integer,
  p_result jsonb
)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid(); d public.cash_grab_drafts;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.id is null or uid not in (d.host_id,d.opponent_id) then raise exception 'Draft not found.'; end if;
  if d.status='finished' then return d; end if;
  if d.status<>'ready' or jsonb_array_length(d.host_picks)<>5 or jsonb_array_length(d.opponent_picks)<>5 then raise exception 'Draft is not ready to resolve.'; end if;
  if p_host_score=p_opponent_score then raise exception 'Cash Grab games cannot end tied.'; end if;
  if p_host_score<40 or p_opponent_score<40 or p_host_score>220 or p_opponent_score>220 then raise exception 'Invalid game score.'; end if;
  update public.cash_grab_drafts set status='finished',host_score=p_host_score,opponent_score=p_opponent_score,result=p_result,
    winner_id=case when p_host_score>p_opponent_score then host_id else opponent_id end,finished_at=now(),updated_at=now()
  where id=d.id returning * into d;
  return d;
end;
$$;

create or replace function public.cancel_cash_grab_draft(p_draft_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); changed integer;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  update public.cash_grab_drafts set status='cancelled',updated_at=now()
  where id=p_draft_id and uid in (host_id,opponent_id) and status in ('invited','waiting','drafting');
  get diagnostics changed=row_count; return changed>0;
end;
$$;

revoke all on function public.cash_grab_pick_price(jsonb,text) from public, anon, authenticated;
revoke all on function public.create_cash_grab_friend_draft(text,text,text,text,jsonb) from public, anon;
revoke all on function public.accept_cash_grab_friend_draft(uuid) from public, anon;
revoke all on function public.join_cash_grab_random_draft(text,text,text,jsonb) from public, anon;
revoke all on function public.make_cash_grab_draft_pick(uuid,text) from public, anon;
revoke all on function public.finalize_cash_grab_draft(uuid,integer,integer,jsonb) from public, anon;
revoke all on function public.cancel_cash_grab_draft(uuid) from public, anon;
grant execute on function public.create_cash_grab_friend_draft(text,text,text,text,jsonb) to authenticated;
grant execute on function public.accept_cash_grab_friend_draft(uuid) to authenticated;
grant execute on function public.join_cash_grab_random_draft(text,text,text,jsonb) to authenticated;
grant execute on function public.make_cash_grab_draft_pick(uuid,text) to authenticated;
grant execute on function public.finalize_cash_grab_draft(uuid,integer,integer,jsonb) to authenticated;
grant execute on function public.cancel_cash_grab_draft(uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.cash_grab_drafts;
exception when duplicate_object then null; end $$;

create or replace function public.cash_grab_version()
returns text language sql stable security definer set search_path=public
as $$ select 'cash-grab-v3'; $$;
grant execute on function public.cash_grab_version() to anon, authenticated;

select 'cash_grab_daily_runs' as created_table
union all select 'cash_grab_drafts';
