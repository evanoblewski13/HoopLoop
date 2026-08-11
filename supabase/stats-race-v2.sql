-- HoopLoop Platform 16 / Stats Race v2
-- Adds Current/Retired pools, variable max scores, multi-answer reports.
alter table public.stats_race_daily_scores add column if not exists pool text not null default 'retired';
alter table public.stats_race_daily_scores add column if not exists max_score integer not null default 1700;
alter table public.stats_race_matches add column if not exists pool text not null default 'retired';
alter table public.stats_race_matches add column if not exists host_max_score integer;
alter table public.stats_race_matches add column if not exists guest_max_score integer;

do $$ begin
  alter table public.stats_race_daily_scores drop constraint if exists stats_race_daily_score_range;
  alter table public.stats_race_daily_scores drop constraint if exists stats_race_pool_check;
  alter table public.stats_race_daily_scores drop constraint if exists stats_race_daily_score_range_v2;
  alter table public.stats_race_daily_scores drop constraint if exists stats_race_daily_max_range_v2;
  alter table public.stats_race_matches drop constraint if exists stats_race_match_pool_check;
  alter table public.stats_race_matches drop constraint if exists stats_race_host_score_range_v2;
  alter table public.stats_race_matches drop constraint if exists stats_race_guest_score_range_v2;
  alter table public.stats_race_daily_scores drop constraint if exists stats_race_one_daily_attempt;
  alter table public.stats_race_matches drop constraint if exists stats_race_host_score_range;
  alter table public.stats_race_matches drop constraint if exists stats_race_guest_score_range;
exception when others then null; end $$;

alter table public.stats_race_daily_scores add constraint stats_race_pool_check check (pool in ('retired','current'));
alter table public.stats_race_matches add constraint stats_race_match_pool_check check (pool in ('retired','current'));
alter table public.stats_race_daily_scores add constraint stats_race_daily_score_range_v2 check (score is null or score between 0 and 1800);
alter table public.stats_race_daily_scores add constraint stats_race_daily_max_range_v2 check (max_score between 100 and 1800);
alter table public.stats_race_matches add constraint stats_race_host_score_range_v2 check (host_score is null or host_score between 0 and 1800);
alter table public.stats_race_matches add constraint stats_race_guest_score_range_v2 check (guest_score is null or guest_score between 0 and 1800);
create unique index if not exists stats_race_one_daily_attempt_v2 on public.stats_race_daily_scores(user_id,challenge_date,pool);
create index if not exists stats_race_matches_pool_searching_idx on public.stats_race_matches(pool,status,created_at) where status='searching';

create or replace function public.stats_race_start_daily_v2(p_challenge_date date,p_pool text,p_player_id text,p_max_score integer)
returns public.stats_race_daily_scores language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.stats_race_daily_scores; today_ct date:=(now() at time zone 'America/Chicago')::date;
begin
 if uid is null then raise exception 'Authentication required.'; end if;
 if p_challenge_date<>today_ct then raise exception 'Only today can be official.'; end if;
 if p_pool not in ('retired','current') then raise exception 'Invalid pool.'; end if;
 select * into r from public.stats_race_daily_scores where user_id=uid and challenge_date=p_challenge_date and pool=p_pool;
 if r.id is not null then return r; end if;
 insert into public.stats_race_daily_scores(user_id,challenge_date,player_id,pool,max_score) values(uid,p_challenge_date,p_player_id,p_pool,greatest(100,least(1800,p_max_score))) returning * into r; return r;
end $$;

create or replace function public.stats_race_submit_daily_v2(p_challenge_date date,p_pool text,p_score integer,p_max_score integer,p_time_ms integer,p_answers jsonb)
returns public.stats_race_daily_scores language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.stats_race_daily_scores; elapsed_ms integer;
begin
 if uid is null then raise exception 'Authentication required.'; end if;
 select * into r from public.stats_race_daily_scores where user_id=uid and challenge_date=p_challenge_date and pool=p_pool for update;
 if r.id is null then raise exception 'Start the Daily report first.'; end if;
 if r.finished_at is not null then return r; end if;
 elapsed_ms:=greatest(0,least(90000,round(extract(epoch from (now()-r.started_at))*1000)::integer));
 if now()>r.started_at+interval '90 seconds' then update public.stats_race_daily_scores set score=0,time_ms=90000,answers='{}'::jsonb,finished_at=now() where id=r.id returning * into r; return r; end if;
 update public.stats_race_daily_scores set score=greatest(0,least(r.max_score,coalesce(p_score,0))),max_score=r.max_score,time_ms=greatest(elapsed_ms,least(90000,greatest(0,coalesce(p_time_ms,elapsed_ms)))),answers=coalesce(p_answers,'{}'::jsonb),finished_at=now() where id=r.id returning * into r; return r;
end $$;

create or replace function public.stats_race_daily_leaderboard_v2(p_challenge_date date,p_pool text)
returns table(rank bigint,username text,score integer,max_score integer,time_ms integer) language sql stable security definer set search_path=public as $$
 select row_number() over(order by (d.score::numeric/nullif(d.max_score,0)) desc,d.time_ms asc,d.finished_at asc),p.username,d.score,d.max_score,d.time_ms
 from public.stats_race_daily_scores d join public.profiles p on p.id=d.user_id
 where d.challenge_date=p_challenge_date and d.pool=p_pool and d.finished_at is not null
 order by (d.score::numeric/nullif(d.max_score,0)) desc,d.time_ms asc,d.finished_at asc limit 100;
$$;

create or replace function public.stats_race_create_friend_match_v2(p_friend_username text,p_pool text,p_player_id text,p_max_score integer)
returns public.stats_race_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); target uuid; r public.stats_race_matches;
begin
 if uid is null then raise exception 'Authentication required.'; end if;
 select id into target from public.profiles where lower(username)=lower(trim(p_friend_username)) limit 1;
 if target is null or target=uid then raise exception 'Friend not found.'; end if;
 if not exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=uid and f.addressee_id=target) or (f.requester_id=target and f.addressee_id=uid))) then raise exception 'Accepted friend required.'; end if;
 insert into public.stats_race_matches(host_id,guest_id,status,player_id,pool,host_max_score,guest_max_score) values(uid,target,'invited',p_player_id,p_pool,p_max_score,p_max_score) returning * into r; return r;
end $$;

create or replace function public.stats_race_find_random_match_v2(p_pool text,p_player_id text,p_max_score integer)
returns public.stats_race_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.stats_race_matches;
begin
 if uid is null then raise exception 'Authentication required.'; end if;
 update public.stats_race_matches set status='cancelled',updated_at=now() where host_id=uid and status='searching';
 select * into r from public.stats_race_matches where status='searching' and pool=p_pool and guest_id is null and host_id<>uid and created_at>now()-interval '10 minutes' order by created_at for update skip locked limit 1;
 if r.id is not null then update public.stats_race_matches set guest_id=uid,status='countdown',starts_at=now()+interval '5 seconds',ends_at=now()+interval '95 seconds',guest_max_score=r.host_max_score,updated_at=now() where id=r.id returning * into r; return r; end if;
 insert into public.stats_race_matches(host_id,status,player_id,pool,host_max_score) values(uid,'searching',p_player_id,p_pool,p_max_score) returning * into r; return r;
end $$;

create or replace function public.stats_race_submit_match_v2(p_match_id uuid,p_score integer,p_max_score integer,p_time_ms integer)
returns public.stats_race_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.stats_race_matches; s integer; t integer;
begin
 if uid is null then raise exception 'Authentication required.'; end if;
 select * into r from public.stats_race_matches where id=p_match_id for update;
 if r.id is null or uid not in (r.host_id,r.guest_id) then raise exception 'Race not found.'; end if;
 if r.status not in ('countdown','live') then return r; end if;
 s:=greatest(0,least(1800,coalesce(p_score,0))); t:=greatest(0,least(90000,round(extract(epoch from (now()-r.starts_at))*1000)::integer));
 if uid=r.host_id and r.host_score is null then update public.stats_race_matches set host_score=s,host_max_score=p_max_score,host_time_ms=t,status='live',updated_at=now() where id=r.id;
 elsif uid=r.guest_id and r.guest_score is null then update public.stats_race_matches set guest_score=s,guest_max_score=p_max_score,guest_time_ms=t,status='live',updated_at=now() where id=r.id; end if;
 select * into r from public.stats_race_matches where id=p_match_id for update;
 if r.host_score is not null and r.guest_score is not null then update public.stats_race_matches set status='complete',updated_at=now() where id=r.id returning * into r; end if; return r;
end $$;

revoke all on function public.stats_race_start_daily_v2(date,text,text,integer) from public,anon;
revoke all on function public.stats_race_submit_daily_v2(date,text,integer,integer,integer,jsonb) from public,anon;
revoke all on function public.stats_race_create_friend_match_v2(text,text,text,integer) from public,anon;
revoke all on function public.stats_race_find_random_match_v2(text,text,integer) from public,anon;
revoke all on function public.stats_race_submit_match_v2(uuid,integer,integer,integer) from public,anon;
grant execute on function public.stats_race_start_daily_v2(date,text,text,integer) to authenticated;
grant execute on function public.stats_race_submit_daily_v2(date,text,integer,integer,integer,jsonb) to authenticated;
grant execute on function public.stats_race_daily_leaderboard_v2(date,text) to anon,authenticated;
grant execute on function public.stats_race_create_friend_match_v2(text,text,text,integer) to authenticated;
grant execute on function public.stats_race_find_random_match_v2(text,text,integer) to authenticated;
grant execute on function public.stats_race_submit_match_v2(uuid,integer,integer,integer) to authenticated;
create or replace function public.stats_race_version() returns text language sql stable security definer set search_path=public as $$ select 'stats-race-v2'; $$;
grant execute on function public.stats_race_version() to anon,authenticated;
select 'Stats Race v2 pools + multi-answer scoring installed' as installed_feature;
