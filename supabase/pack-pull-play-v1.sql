-- HoopLoop Platform 22 / Pack, Pull, Play v1
-- Additive only. Does not modify Name Rush, SBC, Cash Grab, Stats Race, or HoopLoopSim tables.
create extension if not exists pgcrypto;

create table if not exists public.ppp_matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  guest_id uuid references public.profiles(id) on delete cascade,
  match_type text not null check (match_type in ('friend','random')),
  status text not null default 'invited' check (status in ('invited','searching','building','configuring','series','finished','cancelled')),
  build_deadline timestamptz,
  host_roster jsonb,
  guest_roster jsonb,
  host_plan jsonb,
  guest_plan jsonb,
  host_wins integer not null default 0 check (host_wins between 0 and 4),
  guest_wins integer not null default 0 check (guest_wins between 0 and 4),
  game_no integer not null default 1 check (game_no between 1 and 7),
  host_game_ready boolean not null default false,
  guest_game_ready boolean not null default false,
  game_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists ppp_matches_users_idx on public.ppp_matches(host_id,guest_id,status,updated_at desc);

alter table public.ppp_matches enable row level security;
drop policy if exists "ppp participants read" on public.ppp_matches;
create policy "ppp participants read" on public.ppp_matches for select to authenticated
using (auth.uid() in (host_id,guest_id));
grant select on public.ppp_matches to authenticated;

create or replace function public.ppp_create_friend_match(p_friend_username text)
returns public.ppp_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); target uuid; r public.ppp_matches;
begin
 if uid is null then raise exception 'Authentication required.'; end if;
 select id into target from public.profiles where lower(username)=lower(trim(p_friend_username)) limit 1;
 if target is null or target=uid then raise exception 'Friend not found.'; end if;
 if not exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=uid and f.addressee_id=target) or (f.requester_id=target and f.addressee_id=uid))) then raise exception 'Accepted friend required.'; end if;
 insert into public.ppp_matches(host_id,guest_id,match_type,status) values(uid,target,'friend','invited') returning * into r; return r;
end $$;

create or replace function public.ppp_accept_match(p_match_id uuid)
returns public.ppp_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.ppp_matches;
begin
 select * into r from public.ppp_matches where id=p_match_id for update;
 if r.id is null or r.guest_id<>uid or r.status<>'invited' then raise exception 'Invite unavailable.'; end if;
 update public.ppp_matches set status='building',build_deadline=now()+interval '5 minutes',updated_at=now() where id=r.id returning * into r; return r;
end $$;

create or replace function public.ppp_find_random_match()
returns public.ppp_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.ppp_matches;
begin
 if uid is null then raise exception 'Authentication required.'; end if;
 update public.ppp_matches set status='cancelled',updated_at=now() where host_id=uid and match_type='random' and status='searching';
 select * into r from public.ppp_matches where match_type='random' and status='searching' and guest_id is null and host_id<>uid and created_at>now()-interval '10 minutes' order by created_at for update skip locked limit 1;
 if r.id is not null then update public.ppp_matches set guest_id=uid,status='building',build_deadline=now()+interval '5 minutes',updated_at=now() where id=r.id returning * into r; return r; end if;
 insert into public.ppp_matches(host_id,match_type,status) values(uid,'random','searching') returning * into r; return r;
end $$;

create or replace function public.ppp_submit_roster(p_match_id uuid,p_roster jsonb)
returns public.ppp_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.ppp_matches;
begin
 select * into r from public.ppp_matches where id=p_match_id for update;
 if r.id is null or uid not in (r.host_id,r.guest_id) or r.status<>'building' then raise exception 'Build room unavailable.'; end if;
 if jsonb_typeof(p_roster)<>'object' or jsonb_array_length(coalesce(p_roster->'cards','[]'::jsonb))<>12 then raise exception 'A 12-player roster is required.'; end if;
 if uid=r.host_id then update public.ppp_matches set host_roster=p_roster,updated_at=now() where id=r.id; else update public.ppp_matches set guest_roster=p_roster,updated_at=now() where id=r.id; end if;
 update public.ppp_matches set status='configuring',updated_at=now() where id=r.id and host_roster is not null and guest_roster is not null;
 select * into r from public.ppp_matches where id=r.id; return r;
end $$;

create or replace function public.ppp_submit_plan(p_match_id uuid,p_plan jsonb)
returns public.ppp_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.ppp_matches;
begin
 select * into r from public.ppp_matches where id=p_match_id for update;
 if r.id is null or uid not in (r.host_id,r.guest_id) or r.status<>'configuring' then raise exception 'Gameplan unavailable.'; end if;
 if uid=r.host_id then update public.ppp_matches set host_plan=p_plan,updated_at=now() where id=r.id; else update public.ppp_matches set guest_plan=p_plan,updated_at=now() where id=r.id; end if;
 update public.ppp_matches set status='series',updated_at=now() where id=r.id and host_plan is not null and guest_plan is not null;
 select * into r from public.ppp_matches where id=r.id; return r;
end $$;

create or replace function public.ppp_ready_game(p_match_id uuid)
returns public.ppp_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.ppp_matches;
begin
 select * into r from public.ppp_matches where id=p_match_id for update;
 if r.id is null or uid not in (r.host_id,r.guest_id) or r.status<>'series' then raise exception 'Series game unavailable.'; end if;
 if uid=r.host_id then update public.ppp_matches set host_game_ready=true,updated_at=now() where id=r.id; else update public.ppp_matches set guest_game_ready=true,updated_at=now() where id=r.id; end if;
 select * into r from public.ppp_matches where id=r.id; return r;
end $$;

create or replace function public.ppp_record_game(p_match_id uuid,p_game_no integer,p_host_score integer,p_guest_score integer)
returns public.ppp_matches language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.ppp_matches; hw integer; gw integer; winner text;
begin
 select * into r from public.ppp_matches where id=p_match_id for update;
 if r.id is null or uid<>r.host_id or r.status<>'series' or r.game_no<>p_game_no or not(r.host_game_ready and r.guest_game_ready) then raise exception 'Game is not ready to record.'; end if;
 if p_host_score=p_guest_score or p_host_score<50 or p_guest_score<50 or p_host_score>200 or p_guest_score>200 then raise exception 'Invalid game score.'; end if;
 hw:=r.host_wins+(case when p_host_score>p_guest_score then 1 else 0 end); gw:=r.guest_wins+(case when p_guest_score>p_host_score then 1 else 0 end); winner:=case when p_host_score>p_guest_score then 'host' else 'guest' end;
 update public.ppp_matches set host_wins=hw,guest_wins=gw,game_log=r.game_log||jsonb_build_array(jsonb_build_object('game_no',p_game_no,'host_score',p_host_score,'guest_score',p_guest_score,'winner',winner)),host_game_ready=false,guest_game_ready=false,game_no=least(7,p_game_no+1),status=case when hw=4 or gw=4 then 'finished' else 'series' end,finished_at=case when hw=4 or gw=4 then now() else null end,updated_at=now() where id=r.id returning * into r; return r;
end $$;

create or replace function public.ppp_cancel_match(p_match_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); n integer;
begin update public.ppp_matches set status='cancelled',updated_at=now() where id=p_match_id and uid in (host_id,guest_id) and status not in ('finished','cancelled'); get diagnostics n=row_count; return n>0; end $$;

revoke all on function public.ppp_create_friend_match(text) from public,anon;
revoke all on function public.ppp_accept_match(uuid) from public,anon;
revoke all on function public.ppp_find_random_match() from public,anon;
revoke all on function public.ppp_submit_roster(uuid,jsonb) from public,anon;
revoke all on function public.ppp_submit_plan(uuid,jsonb) from public,anon;
revoke all on function public.ppp_ready_game(uuid) from public,anon;
revoke all on function public.ppp_record_game(uuid,integer,integer,integer) from public,anon;
revoke all on function public.ppp_cancel_match(uuid) from public,anon;
grant execute on function public.ppp_create_friend_match(text),public.ppp_accept_match(uuid),public.ppp_find_random_match(),public.ppp_submit_roster(uuid,jsonb),public.ppp_submit_plan(uuid,jsonb),public.ppp_ready_game(uuid),public.ppp_record_game(uuid,integer,integer,integer),public.ppp_cancel_match(uuid) to authenticated;

do $$ begin alter publication supabase_realtime add table public.ppp_matches; exception when duplicate_object then null; end $$;
create or replace function public.ppp_version() returns text language sql stable security definer set search_path=public as $$ select 'pack-pull-play-v1'; $$;
grant execute on function public.ppp_version() to anon,authenticated;
select 'ppp_matches + pack-pull-play-v1' as installed;
