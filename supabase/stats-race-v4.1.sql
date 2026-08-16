-- HoopLoop Platform 21 / Stats Race v4.1
-- Additive only: stores both racers' submitted answer sheets so the completed race can show a field-by-field comparison.

alter table public.stats_race_matches add column if not exists host_answers jsonb;
alter table public.stats_race_matches add column if not exists guest_answers jsonb;

create or replace function public.stats_race_submit_match_v4(
  p_match_id uuid,
  p_score integer,
  p_max_score integer,
  p_time_ms integer,
  p_answers jsonb
)
returns public.stats_race_matches
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  r public.stats_race_matches;
  s integer;
  t integer;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into r from public.stats_race_matches where id=p_match_id for update;
  if r.id is null or uid not in (r.host_id,r.guest_id) then raise exception 'Race not found.'; end if;
  if r.status not in ('countdown','live') then return r; end if;

  s:=greatest(0,least(3000,coalesce(p_score,0)));
  t:=greatest(0,least(90000,round(extract(epoch from (now()-r.starts_at))*1000)::integer));

  if uid=r.host_id and r.host_score is null then
    update public.stats_race_matches
      set host_score=s,host_max_score=p_max_score,host_time_ms=t,host_answers=coalesce(p_answers,'{}'::jsonb),status='live',updated_at=now()
      where id=r.id;
  elsif uid=r.guest_id and r.guest_score is null then
    update public.stats_race_matches
      set guest_score=s,guest_max_score=p_max_score,guest_time_ms=t,guest_answers=coalesce(p_answers,'{}'::jsonb),status='live',updated_at=now()
      where id=r.id;
  end if;

  select * into r from public.stats_race_matches where id=p_match_id for update;
  if r.host_score is not null and r.guest_score is not null then
    update public.stats_race_matches set status='complete',updated_at=now() where id=r.id returning * into r;
  end if;
  return r;
end $$;

revoke all on function public.stats_race_submit_match_v4(uuid,integer,integer,integer,jsonb) from public,anon;
grant execute on function public.stats_race_submit_match_v4(uuid,integer,integer,integer,jsonb) to authenticated;

create or replace function public.stats_race_version()
returns text language sql stable security definer set search_path=public
as $$ select 'stats-race-v4.1'; $$;
grant execute on function public.stats_race_version() to anon,authenticated;

select 'Stats Race v4.1 answer comparison installed' as installed_feature;
