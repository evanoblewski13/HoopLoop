-- HoopLoop Platform 12 / Cash Grab v4
-- Adds account-synced Hall of Five records. Safe to run after cash-grab-v3.sql.

create extension if not exists pgcrypto;

create table if not exists public.cash_grab_hof (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pool_mode text not null check (pool_mode in ('current','alltime')),
  board_type text not null check (board_type in ('daily','random')),
  roster jsonb not null,
  roster_key text not null,
  rounds_cleared integer not null check (rounds_cleared between 0 and 10),
  point_diff integer not null default 0,
  points_for integer not null default 0,
  points_against integer not null default 0,
  achieved_at timestamptz not null default now(),
  unique (user_id,pool_mode,roster_key),
  constraint cash_grab_hof_roster_5 check (jsonb_typeof(roster)='array' and jsonb_array_length(roster)=5)
);

create index if not exists cash_grab_hof_user_rank_idx
  on public.cash_grab_hof (user_id, rounds_cleared desc, point_diff desc, points_for desc, achieved_at asc);

alter table public.cash_grab_hof enable row level security;
drop policy if exists "cash grab hof owner read" on public.cash_grab_hof;
create policy "cash grab hof owner read" on public.cash_grab_hof for select to authenticated using ((select auth.uid())=user_id);
grant select on public.cash_grab_hof to authenticated;

create or replace function public.record_cash_grab_hof(
  p_pool_mode text,
  p_board_type text,
  p_roster jsonb,
  p_rounds_cleared integer,
  p_point_diff integer,
  p_points_for integer,
  p_points_against integer
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  rkey text;
  existing public.cash_grab_hof;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  if p_pool_mode not in ('current','alltime') or p_board_type not in ('daily','random') then raise exception 'Invalid Cash Grab mode.'; end if;
  if jsonb_typeof(p_roster)<>'array' or jsonb_array_length(p_roster)<>5 then raise exception 'A five-player roster is required.'; end if;
  if p_rounds_cleared<0 or p_rounds_cleared>10 then raise exception 'Invalid Gauntlet result.'; end if;
  rkey := md5(p_roster::text);
  select * into existing from public.cash_grab_hof where user_id=uid and pool_mode=p_pool_mode and roster_key=rkey for update;
  if existing.id is null then
    insert into public.cash_grab_hof(user_id,pool_mode,board_type,roster,roster_key,rounds_cleared,point_diff,points_for,points_against)
    values(uid,p_pool_mode,p_board_type,p_roster,rkey,p_rounds_cleared,p_point_diff,p_points_for,p_points_against);
  elsif (p_rounds_cleared,p_point_diff,p_points_for) > (existing.rounds_cleared,existing.point_diff,existing.points_for) then
    update public.cash_grab_hof set board_type=p_board_type,rounds_cleared=p_rounds_cleared,point_diff=p_point_diff,points_for=p_points_for,points_against=p_points_against,achieved_at=now() where id=existing.id;
  end if;
  delete from public.cash_grab_hof h where h.user_id=uid and h.id in (
    select id from public.cash_grab_hof where user_id=uid order by rounds_cleared desc,point_diff desc,points_for desc,achieved_at asc offset 5
  );
  return true;
end;
$$;
revoke all on function public.record_cash_grab_hof(text,text,jsonb,integer,integer,integer,integer) from public, anon;
grant execute on function public.record_cash_grab_hof(text,text,jsonb,integer,integer,integer,integer) to authenticated;

create or replace function public.cash_grab_version()
returns text language sql stable security definer set search_path=public
as $$ select 'cash-grab-v4'; $$;
grant execute on function public.cash_grab_version() to anon, authenticated;

select 'cash_grab_hof' as created_table;
