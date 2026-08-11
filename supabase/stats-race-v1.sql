-- HoopLoop Platform 15 / Stats Race v1
-- Daily scouting reports + synchronized friend/random head-to-head races.
-- Safe additive migration for an existing HoopLoop Supabase project.

create table if not exists public.stats_race_daily_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  challenge_date date not null,
  player_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score integer,
  time_ms integer,
  answers jsonb,
  created_at timestamptz not null default now(),
  constraint stats_race_daily_scores_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint stats_race_daily_score_range check (score is null or score between 0 and 1700),
  constraint stats_race_daily_time_range check (time_ms is null or time_ms between 0 and 90000),
  constraint stats_race_one_daily_attempt unique (user_id, challenge_date)
);

create index if not exists stats_race_daily_date_rank_idx
  on public.stats_race_daily_scores(challenge_date, score desc, time_ms asc)
  where finished_at is not null;

create table if not exists public.stats_race_matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  guest_id uuid,
  status text not null default 'searching',
  player_id text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  host_score integer,
  guest_score integer,
  host_time_ms integer,
  guest_time_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stats_race_matches_host_id_fkey foreign key (host_id) references public.profiles(id) on delete cascade,
  constraint stats_race_matches_guest_id_fkey foreign key (guest_id) references public.profiles(id) on delete cascade,
  constraint stats_race_matches_status_check check (status in ('searching','invited','countdown','live','complete','cancelled')),
  constraint stats_race_host_score_range check (host_score is null or host_score between 0 and 1700),
  constraint stats_race_guest_score_range check (guest_score is null or guest_score between 0 and 1700),
  constraint stats_race_host_time_range check (host_time_ms is null or host_time_ms between 0 and 90000),
  constraint stats_race_guest_time_range check (guest_time_ms is null or guest_time_ms between 0 and 90000),
  constraint stats_race_distinct_players check (guest_id is null or guest_id <> host_id)
);

create index if not exists stats_race_matches_host_idx on public.stats_race_matches(host_id, status, created_at desc);
create index if not exists stats_race_matches_guest_idx on public.stats_race_matches(guest_id, status, created_at desc);
create index if not exists stats_race_matches_searching_idx on public.stats_race_matches(status, created_at) where status='searching';

alter table public.stats_race_daily_scores enable row level security;
alter table public.stats_race_matches enable row level security;

drop policy if exists "stats race users read own daily" on public.stats_race_daily_scores;
create policy "stats race users read own daily"
on public.stats_race_daily_scores for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "stats race participants read matches" on public.stats_race_matches;
create policy "stats race participants read matches"
on public.stats_race_matches for select
to authenticated
using (auth.uid() = host_id or auth.uid() = guest_id);

revoke all on public.stats_race_daily_scores from anon, authenticated;
revoke all on public.stats_race_matches from anon, authenticated;
grant select on public.stats_race_daily_scores to authenticated;
grant select on public.stats_race_matches to authenticated;

-- One official attempt per Central-time Daily. Calling start again returns the same row.
create or replace function public.stats_race_start_daily(p_challenge_date date, p_player_id text)
returns public.stats_race_daily_scores
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  r public.stats_race_daily_scores;
  today_ct date:=(now() at time zone 'America/Chicago')::date;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  if p_challenge_date <> today_ct then raise exception 'Only today''s Stats Race can be an official attempt.'; end if;
  select * into r from public.stats_race_daily_scores where user_id=uid and challenge_date=p_challenge_date;
  if r.id is not null then return r; end if;
  insert into public.stats_race_daily_scores(user_id,challenge_date,player_id)
  values(uid,p_challenge_date,p_player_id)
  returning * into r;
  return r;
end;
$$;

create or replace function public.stats_race_submit_daily(
  p_challenge_date date,
  p_score integer,
  p_time_ms integer,
  p_answers jsonb
)
returns public.stats_race_daily_scores
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  r public.stats_race_daily_scores;
  elapsed_ms integer;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into r from public.stats_race_daily_scores
  where user_id=uid and challenge_date=p_challenge_date for update;
  if r.id is null then raise exception 'Start the Daily report first.'; end if;
  if r.finished_at is not null then return r; end if;
  elapsed_ms:=greatest(0,least(90000,round(extract(epoch from (now()-r.started_at))*1000)::integer));
  if now() > r.started_at + interval '90 seconds' then
    update public.stats_race_daily_scores
    set score=0,time_ms=90000,answers='{}'::jsonb,finished_at=now()
    where id=r.id returning * into r;
    return r;
  end if;
  update public.stats_race_daily_scores
  set score=greatest(0,least(1700,coalesce(p_score,0))),
      time_ms=greatest(elapsed_ms,least(90000,greatest(0,coalesce(p_time_ms,elapsed_ms)))),
      answers=coalesce(p_answers,'{}'::jsonb),finished_at=now()
  where id=r.id returning * into r;
  return r;
end;
$$;

-- Safe public leaderboard: no guesses/answers are exposed.
create or replace function public.stats_race_daily_leaderboard(p_challenge_date date)
returns table(rank bigint, username text, score integer, time_ms integer)
language sql
stable
security definer
set search_path=public
as $$
  select row_number() over(order by d.score desc,d.time_ms asc,d.finished_at asc) as rank,
         p.username,d.score,d.time_ms
  from public.stats_race_daily_scores d
  join public.profiles p on p.id=d.user_id
  where d.challenge_date=p_challenge_date and d.finished_at is not null
  order by d.score desc,d.time_ms asc,d.finished_at asc
  limit 100;
$$;

create or replace function public.stats_race_create_friend_match(p_friend_username text,p_player_id text)
returns public.stats_race_matches
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid(); target uuid; r public.stats_race_matches;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select id into target from public.profiles where lower(username)=lower(trim(p_friend_username)) limit 1;
  if target is null or target=uid then raise exception 'Friend not found.'; end if;
  if not exists(
    select 1 from public.friendships f
    where f.status='accepted' and ((f.requester_id=uid and f.addressee_id=target) or (f.requester_id=target and f.addressee_id=uid))
  ) then raise exception 'You can only send a Stats Race invite to an accepted friend.'; end if;
  insert into public.stats_race_matches(host_id,guest_id,status,player_id)
  values(uid,target,'invited',p_player_id)
  returning * into r;
  return r;
end;
$$;

create or replace function public.stats_race_accept_match(p_match_id uuid)
returns public.stats_race_matches
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); r public.stats_race_matches;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into r from public.stats_race_matches where id=p_match_id for update;
  if r.id is null or r.guest_id<>uid or r.status<>'invited' then raise exception 'This race invite is no longer available.'; end if;
  update public.stats_race_matches
  set status='countdown',starts_at=now()+interval '5 seconds',ends_at=now()+interval '95 seconds',updated_at=now()
  where id=r.id returning * into r;
  return r;
end;
$$;

create or replace function public.stats_race_find_random_match(p_player_id text)
returns public.stats_race_matches
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); r public.stats_race_matches;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  update public.stats_race_matches set status='cancelled',updated_at=now()
  where host_id=uid and status='searching';
  select * into r from public.stats_race_matches
  where status='searching' and guest_id is null and host_id<>uid and created_at>now()-interval '10 minutes'
  order by created_at for update skip locked limit 1;
  if r.id is not null then
    update public.stats_race_matches
    set guest_id=uid,status='countdown',starts_at=now()+interval '5 seconds',ends_at=now()+interval '95 seconds',updated_at=now()
    where id=r.id returning * into r;
    return r;
  end if;
  insert into public.stats_race_matches(host_id,status,player_id)
  values(uid,'searching',p_player_id)
  returning * into r;
  return r;
end;
$$;

create or replace function public.stats_race_submit_match(
  p_match_id uuid,
  p_score integer,
  p_time_ms integer
)
returns public.stats_race_matches
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); r public.stats_race_matches; s integer; t integer;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into r from public.stats_race_matches where id=p_match_id for update;
  if r.id is null or uid not in (r.host_id,r.guest_id) then raise exception 'Race not found.'; end if;
  if r.status not in ('countdown','live') then return r; end if;
  if r.starts_at is null or now()<r.starts_at-interval '2 seconds' then raise exception 'The race has not started yet.'; end if;
  s:=greatest(0,least(1700,coalesce(p_score,0))); t:=greatest(0,least(90000,round(extract(epoch from (now()-r.starts_at))*1000)::integer));
  if uid=r.host_id and r.host_score is null then
    update public.stats_race_matches set host_score=s,host_time_ms=t,status='live',updated_at=now() where id=r.id;
  elsif uid=r.guest_id and r.guest_score is null then
    update public.stats_race_matches set guest_score=s,guest_time_ms=t,status='live',updated_at=now() where id=r.id;
  end if;
  select * into r from public.stats_race_matches where id=p_match_id for update;
  if r.host_score is not null and r.guest_score is not null then
    update public.stats_race_matches set status='complete',updated_at=now() where id=r.id returning * into r;
  end if;
  return r;
end;
$$;

create or replace function public.stats_race_finalize_match(p_match_id uuid)
returns public.stats_race_matches
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); r public.stats_race_matches;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into r from public.stats_race_matches where id=p_match_id for update;
  if r.id is null or uid not in (r.host_id,r.guest_id) then raise exception 'Race not found.'; end if;
  if r.status='complete' then return r; end if;
  if r.ends_at is null or now()<r.ends_at then return r; end if;
  update public.stats_race_matches
  set host_score=coalesce(host_score,0),guest_score=coalesce(guest_score,0),
      host_time_ms=coalesce(host_time_ms,90000),guest_time_ms=coalesce(guest_time_ms,90000),
      status='complete',updated_at=now()
  where id=r.id returning * into r;
  return r;
end;
$$;

revoke all on function public.stats_race_start_daily(date,text) from public,anon;
revoke all on function public.stats_race_submit_daily(date,integer,integer,jsonb) from public,anon;
revoke all on function public.stats_race_create_friend_match(text,text) from public,anon;
revoke all on function public.stats_race_accept_match(uuid) from public,anon;
revoke all on function public.stats_race_find_random_match(text) from public,anon;
revoke all on function public.stats_race_submit_match(uuid,integer,integer) from public,anon;
revoke all on function public.stats_race_finalize_match(uuid) from public,anon;

grant execute on function public.stats_race_start_daily(date,text) to authenticated;
grant execute on function public.stats_race_submit_daily(date,integer,integer,jsonb) to authenticated;
grant execute on function public.stats_race_daily_leaderboard(date) to anon,authenticated;
grant execute on function public.stats_race_create_friend_match(text,text) to authenticated;
grant execute on function public.stats_race_accept_match(uuid) to authenticated;
grant execute on function public.stats_race_find_random_match(text) to authenticated;
grant execute on function public.stats_race_submit_match(uuid,integer,integer) to authenticated;
grant execute on function public.stats_race_finalize_match(uuid) to authenticated;

-- Add the match table to Realtime once. This block is safe to rerun.
do $$
begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='stats_race_matches'
  ) then
    alter publication supabase_realtime add table public.stats_race_matches;
  end if;
end $$;

create or replace function public.stats_race_version()
returns text language sql stable security definer set search_path=public
as $$ select 'stats-race-v1'; $$;
grant execute on function public.stats_race_version() to anon,authenticated;

select 'stats_race_daily_scores + stats_race_matches v1' as installed_feature;
