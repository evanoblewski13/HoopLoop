-- HoopLoop Platform 13 / Cash Grab v5
-- Live 60-second snake-draft clock + lineup position/offensive-option configuration.
-- Safe to run after cash-grab-v3.sql and cash-grab-v4.sql.

alter table public.cash_grab_drafts
  add column if not exists turn_deadline timestamptz,
  add column if not exists host_lineup jsonb,
  add column if not exists opponent_lineup jsonb;

alter table public.cash_grab_drafts drop constraint if exists cash_grab_drafts_status_check;
alter table public.cash_grab_drafts
  add constraint cash_grab_drafts_status_check
  check (status in ('invited','waiting','drafting','configuring','ready','finished','cancelled'));

alter table public.cash_grab_drafts drop constraint if exists cash_grab_host_lineup_5;
alter table public.cash_grab_drafts
  add constraint cash_grab_host_lineup_5 check (host_lineup is null or (jsonb_typeof(host_lineup)='array' and jsonb_array_length(host_lineup)=5));
alter table public.cash_grab_drafts drop constraint if exists cash_grab_opponent_lineup_5;
alter table public.cash_grab_drafts
  add constraint cash_grab_opponent_lineup_5 check (opponent_lineup is null or (jsonb_typeof(opponent_lineup)='array' and jsonb_array_length(opponent_lineup)=5));

-- Give any draft already in progress a fresh clock when this migration is run.
update public.cash_grab_drafts
set turn_deadline=now()+interval '60 seconds'
where status='drafting' and turn_deadline is null;


create or replace function public.cash_grab_joint_feasible(p_a jsonb,p_b jsonb,p_board jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  a_slots integer:=5-jsonb_array_length(p_a); b_slots integer:=5-jsonb_array_length(p_b);
  a_budget integer:=15-coalesce((select sum((x->>'price')::integer) from jsonb_array_elements(p_a)x),0);
  b_budget integer:=15-coalesce((select sum((x->>'price')::integer) from jsonb_array_elements(p_b)x),0);
  ok boolean;
begin
  if a_slots<0 or b_slots<0 or a_budget<0 or b_budget<0 then return false; end if;
  with recursive
  remaining as (
    select (x->>'price')::integer price
    from jsonb_array_elements(p_board)x
    where not exists(select 1 from jsonb_array_elements(p_a||p_b)u where u->>'id'=x->>'id')
  ),
  counts as (
    select p price,count(r.price)::integer cnt
    from generate_series(1,5)p left join remaining r on r.price=p
    group by p order by p
  ),
  dp(step,aslots,acost,bslots,bcost) as (
    select 0,0,0,0,0
    union all
    select d.step+1,d.aslots+ga.n,d.acost+ga.n*c.price,d.bslots+gb.n,d.bcost+gb.n*c.price
    from dp d join counts c on c.price=d.step+1
    cross join lateral generate_series(0,c.cnt)ga(n)
    cross join lateral generate_series(0,c.cnt-ga.n)gb(n)
    where d.aslots+ga.n<=a_slots and d.bslots+gb.n<=b_slots
      and d.acost+ga.n*c.price<=a_budget and d.bcost+gb.n*c.price<=b_budget
  )
  select exists(select 1 from dp where step=5 and aslots=a_slots and bslots=b_slots) into ok;
  return ok;
end;
$$;

create or replace function public.accept_cash_grab_friend_draft(p_draft_id uuid)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); d public.cash_grab_drafts; fp uuid;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.id is null or d.opponent_id<>uid or d.status<>'invited' then raise exception 'This draft invite is no longer available.'; end if;
  fp:=case when random()<0.5 then d.host_id else d.opponent_id end;
  update public.cash_grab_drafts
  set status='drafting',first_picker=fp,turn_user=fp,pick_number=0,
      host_picks='[]'::jsonb,opponent_picks='[]'::jsonb,host_budget=15,opponent_budget=15,
      host_lineup=null,opponent_lineup=null,turn_deadline=now()+interval '60 seconds',updated_at=now()
  where id=d.id returning * into d;
  return d;
end;
$$;

create or replace function public.join_cash_grab_random_draft(
  p_board_type text,p_pool_mode text,p_board_key text,p_board jsonb
)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); d public.cash_grab_drafts; fp uuid;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  if p_board_type not in ('daily','random') or p_pool_mode not in ('current','alltime') then raise exception 'Invalid Cash Grab mode.'; end if;
  if jsonb_typeof(p_board)<>'array' or jsonb_array_length(p_board)<>25 then raise exception 'A 25-player board is required.'; end if;
  update public.cash_grab_drafts set status='cancelled',updated_at=now() where host_id=uid and match_type='random' and status='waiting';
  select * into d from public.cash_grab_drafts
  where match_type='random' and status='waiting' and opponent_id is null and host_id<>uid
    and pool_mode=p_pool_mode and board_type=p_board_type and created_at>now()-interval '10 minutes'
    and (p_board_type='random' or board_key=p_board_key)
  order by created_at for update skip locked limit 1;
  if d.id is not null then
    fp:=case when random()<0.5 then d.host_id else uid end;
    update public.cash_grab_drafts
    set opponent_id=uid,status='drafting',first_picker=fp,turn_user=fp,turn_deadline=now()+interval '60 seconds',updated_at=now()
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
set search_path=public
as $$
declare
  uid uuid:=auth.uid(); d public.cash_grab_drafts; price integer; new_pick integer; next_side integer; other_id uuid; candidate jsonb;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.id is null or d.status<>'drafting' then raise exception 'This draft is not accepting picks.'; end if;
  if uid not in (d.host_id,d.opponent_id) or d.turn_user<>uid then raise exception 'It is not your turn.'; end if;
  if d.turn_deadline is not null and now()>d.turn_deadline then raise exception 'Your pick clock expired.'; end if;
  price:=public.cash_grab_pick_price(d.board,p_player_id);
  if price is null then raise exception 'That player is not on this draft board.'; end if;
  if exists(select 1 from jsonb_array_elements(d.host_picks||d.opponent_picks) x where x->>'id'=p_player_id) then raise exception 'That player has already been drafted.'; end if;
  candidate:=jsonb_build_object('id',p_player_id,'price',price);
  if uid=d.host_id then
    if jsonb_array_length(d.host_picks)>=5 then raise exception 'Your roster is full.'; end if;
    if d.host_budget-price<0 then raise exception 'That pick exceeds your $15 budget.'; end if;
    if not public.cash_grab_joint_feasible(d.host_picks||jsonb_build_array(candidate),d.opponent_picks,d.board) then raise exception 'That pick would make it impossible to finish both rosters under $15.'; end if;
    update public.cash_grab_drafts set host_picks=host_picks||jsonb_build_array(jsonb_build_object('id',p_player_id,'price',price)),host_budget=host_budget-price where id=d.id;
  else
    if jsonb_array_length(d.opponent_picks)>=5 then raise exception 'Your roster is full.'; end if;
    if d.opponent_budget-price<0 then raise exception 'That pick exceeds your $15 budget.'; end if;
    if not public.cash_grab_joint_feasible(d.host_picks,d.opponent_picks||jsonb_build_array(candidate),d.board) then raise exception 'That pick would make it impossible to finish both rosters under $15.'; end if;
    update public.cash_grab_drafts set opponent_picks=opponent_picks||jsonb_build_array(jsonb_build_object('id',p_player_id,'price',price)),opponent_budget=opponent_budget-price where id=d.id;
  end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  new_pick:=d.pick_number+1;
  if new_pick>=10 then
    update public.cash_grab_drafts set pick_number=10,status='configuring',turn_user=null,turn_deadline=null,updated_at=now() where id=d.id returning * into d;
    return d;
  end if;
  other_id:=case when d.first_picker=d.host_id then d.opponent_id else d.host_id end;
  next_side:=(array[0,1,1,0,0,1,1,0,0,1])[new_pick+1];
  update public.cash_grab_drafts
  set pick_number=new_pick,turn_user=case when next_side=0 then d.first_picker else other_id end,
      turn_deadline=now()+interval '60 seconds',updated_at=now()
  where id=d.id returning * into d;
  return d;
end;
$$;

create or replace function public.timeout_cash_grab_draft_pick(p_draft_id uuid)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid(); d public.cash_grab_drafts; pick_id text; price integer; new_pick integer; next_side integer; other_id uuid; budget_left integer;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.id is null or uid not in (d.host_id,d.opponent_id) then raise exception 'Draft not found.'; end if;
  if d.status<>'drafting' then return d; end if;
  if d.turn_deadline is null or now()<d.turn_deadline then return d; end if;
  budget_left:=case when d.turn_user=d.host_id then d.host_budget else d.opponent_budget end;
  -- Prefer a legal available $1 player. If all $1 options are gone or would make the shared draft impossible
  -- to finish under both caps, use the cheapest legal fallback.
  for pick_id,price in
    select x->>'id',(x->>'price')::integer
    from jsonb_array_elements(d.board)x
    where (x->>'price')::integer<=budget_left
      and not exists(select 1 from jsonb_array_elements(d.host_picks||d.opponent_picks)u where u->>'id'=x->>'id')
    order by case when (x->>'price')::integer=1 then 0 else 1 end,(x->>'price')::integer,md5((x->>'id')||d.id::text||d.pick_number::text)
  loop
    if d.turn_user=d.host_id then
      if public.cash_grab_joint_feasible(d.host_picks||jsonb_build_array(jsonb_build_object('id',pick_id,'price',price)),d.opponent_picks,d.board) then exit; end if;
    else
      if public.cash_grab_joint_feasible(d.host_picks,d.opponent_picks||jsonb_build_array(jsonb_build_object('id',pick_id,'price',price)),d.board) then exit; end if;
    end if;
    pick_id:=null;price:=null;
  end loop;
  if pick_id is null then raise exception 'No legal timeout pick is available.'; end if;
  if d.turn_user=d.host_id then
    update public.cash_grab_drafts set host_picks=host_picks||jsonb_build_array(jsonb_build_object('id',pick_id,'price',price)),host_budget=host_budget-price where id=d.id;
  else
    update public.cash_grab_drafts set opponent_picks=opponent_picks||jsonb_build_array(jsonb_build_object('id',pick_id,'price',price)),opponent_budget=opponent_budget-price where id=d.id;
  end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  new_pick:=d.pick_number+1;
  if new_pick>=10 then
    update public.cash_grab_drafts set pick_number=10,status='configuring',turn_user=null,turn_deadline=null,updated_at=now() where id=d.id returning * into d;
    return d;
  end if;
  other_id:=case when d.first_picker=d.host_id then d.opponent_id else d.host_id end;
  next_side:=(array[0,1,1,0,0,1,1,0,0,1])[new_pick+1];
  update public.cash_grab_drafts
  set pick_number=new_pick,turn_user=case when next_side=0 then d.first_picker else other_id end,
      turn_deadline=now()+interval '60 seconds',updated_at=now()
  where id=d.id returning * into d;
  return d;
end;
$$;

create or replace function public.submit_cash_grab_draft_lineup(p_draft_id uuid,p_lineup jsonb)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); d public.cash_grab_drafts; mine jsonb;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.id is null or uid not in (d.host_id,d.opponent_id) then raise exception 'Draft not found.'; end if;
  if d.status<>'configuring' then raise exception 'Lineups cannot be set or changed now.'; end if;
  if jsonb_typeof(p_lineup)<>'array' or jsonb_array_length(p_lineup)<>5 then raise exception 'Five lineup assignments are required.'; end if;
  if (uid=d.host_id and d.host_lineup is not null) or (uid=d.opponent_id and d.opponent_lineup is not null) then raise exception 'Your lineup is already locked.'; end if;
  mine:=case when uid=d.host_id then d.host_picks else d.opponent_picks end;
  if (select count(distinct x->>'id') from jsonb_array_elements(p_lineup)x)<>5 then raise exception 'Each drafted player must appear once.'; end if;
  if exists(select 1 from jsonb_array_elements(p_lineup)x where not exists(select 1 from jsonb_array_elements(mine)m where m->>'id'=x->>'id')) then raise exception 'Lineup contains a player you did not draft.'; end if;
  if (select count(distinct x->>'slot') from jsonb_array_elements(p_lineup)x)<>5 or exists(select 1 from jsonb_array_elements(p_lineup)x where x->>'slot' not in ('PG','SG','SF','PF','C')) then raise exception 'Use PG, SG, SF, PF, and C exactly once.'; end if;
  if (select count(distinct (x->>'option')::integer) from jsonb_array_elements(p_lineup)x)<>5 or exists(select 1 from jsonb_array_elements(p_lineup)x where (x->>'option')::integer not between 1 and 5) then raise exception 'Use offensive options 1 through 5 exactly once.'; end if;
  if uid=d.host_id then update public.cash_grab_drafts set host_lineup=p_lineup,updated_at=now() where id=d.id;
  else update public.cash_grab_drafts set opponent_lineup=p_lineup,updated_at=now() where id=d.id; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.host_lineup is not null and d.opponent_lineup is not null and d.status='configuring' then
    update public.cash_grab_drafts set status='ready',updated_at=now() where id=d.id returning * into d;
  end if;
  return d;
end;
$$;

create or replace function public.finalize_cash_grab_draft(p_draft_id uuid,p_host_score integer,p_opponent_score integer,p_result jsonb)
returns public.cash_grab_drafts
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); d public.cash_grab_drafts;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  select * into d from public.cash_grab_drafts where id=p_draft_id for update;
  if d.id is null or uid not in (d.host_id,d.opponent_id) then raise exception 'Draft not found.'; end if;
  if d.status='finished' then return d; end if;
  if d.status<>'ready' or jsonb_array_length(d.host_picks)<>5 or jsonb_array_length(d.opponent_picks)<>5 or d.host_lineup is null or d.opponent_lineup is null then raise exception 'Draft is not ready to resolve.'; end if;
  if p_host_score=p_opponent_score then raise exception 'Cash Grab games cannot end tied.'; end if;
  if p_host_score<40 or p_opponent_score<40 or p_host_score>220 or p_opponent_score>220 then raise exception 'Invalid game score.'; end if;
  update public.cash_grab_drafts set status='finished',host_score=p_host_score,opponent_score=p_opponent_score,result=p_result,
    winner_id=case when p_host_score>p_opponent_score then host_id else opponent_id end,finished_at=now(),turn_deadline=null,updated_at=now()
  where id=d.id returning * into d;
  return d;
end;
$$;

create or replace function public.cancel_cash_grab_draft(p_draft_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); changed integer;
begin
  if uid is null then raise exception 'Authentication required.'; end if;
  update public.cash_grab_drafts set status='cancelled',turn_deadline=null,updated_at=now()
  where id=p_draft_id and uid in (host_id,opponent_id) and status in ('invited','waiting','drafting','configuring','ready');
  get diagnostics changed=row_count;return changed>0;
end;
$$;

revoke all on function public.cash_grab_joint_feasible(jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.timeout_cash_grab_draft_pick(uuid) from public,anon;
revoke all on function public.submit_cash_grab_draft_lineup(uuid,jsonb) from public,anon;
grant execute on function public.timeout_cash_grab_draft_pick(uuid) to authenticated;
grant execute on function public.submit_cash_grab_draft_lineup(uuid,jsonb) to authenticated;

create or replace function public.cash_grab_version()
returns text language sql stable security definer set search_path=public
as $$ select 'cash-grab-v5'; $$;
grant execute on function public.cash_grab_version() to anon,authenticated;

select 'cash_grab_drafts v5 timer + lineup config' as updated_feature;
