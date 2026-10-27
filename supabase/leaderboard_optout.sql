-- Leaderboard opt-out (27 Oct 2026, Nestor: "there needs to be a way in settings to opt out being on the leaderboard, some users might
-- want to have more privacy about their trading"). Applied as migration leaderboard_optout; kept here as the record.
--
-- Settings -> Profile -> Privacy -> "Show me on the leaderboard" (on by default: no row = shown). Off:
--   * leaderboard_entries rows of a hidden member are readable by nobody (RLS lb_select), so every board, the community medals, the
--     month's podium and the assistant's standing - all readers of that table - leave them out;
--   * st_rebuild_leaderboard leaves them out of `people` (and the all-time board), so the live boards rank without them
--     (see supabase/st_rebuild_leaderboard.sql);
--   * st_set_leaderboard_hidden rebuilds the live boards at once and closes up (or, back on, makes room in) the closed periods
--     they were on (st_lb_rerank). Their rows are kept, never deleted, so turning it back on loses nothing.
-- Their own statistics are not touched.

create table if not exists public.lb_prefs (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  hidden     boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.lb_prefs enable row level security;
drop policy if exists "lb prefs: own row" on public.lb_prefs;
create policy "lb prefs: own row" on public.lb_prefs for select to authenticated using (auth.uid() = user_id);
revoke all on public.lb_prefs from anon, authenticated;
grant select on public.lb_prefs to authenticated;

create or replace function public.st_lb_hidden(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lb_prefs where user_id = p_user and hidden)
$$;
grant execute on function public.st_lb_hidden(uuid) to anon, authenticated;

drop policy if exists lb_select on public.leaderboard_entries;
create policy lb_select on public.leaderboard_entries for select using (not public.st_lb_hidden(user_id));

create or replace function public.st_lb_rerank(p_user uuid) returns void
language sql security definer set search_path = public as $$
  with per as (select distinct period, period_start from public.leaderboard_entries where user_id = p_user),
  r as (
    select e.period, e.period_start, e.user_id,
      dense_rank() over (partition by e.period, e.period_start
        order by e.points desc, (case when e.period = 'alltime' then null else e.best_series_r end) desc nulls last) nr
    from public.leaderboard_entries e join per using (period, period_start)
    where not public.st_lb_hidden(e.user_id)
  )
  update public.leaderboard_entries e set rank = r.nr from r
   where e.period = r.period and e.period_start = r.period_start and e.user_id = r.user_id and e.rank is distinct from r.nr;
$$;
revoke all on function public.st_lb_rerank(uuid) from public, anon, authenticated;

create or replace function public.st_set_leaderboard_hidden(p_hidden boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'sign in'; end if;
  insert into public.lb_prefs (user_id, hidden, updated_at) values (u, coalesce(p_hidden, false), now())
    on conflict (user_id) do update set hidden = excluded.hidden, updated_at = now();
  perform public.st_bump_leaderboard();   -- the live boards, rebuilt with or without them
  perform public.st_lb_rerank(u);          -- the closed periods they were on: everyone else's places close up, or make room again
  return coalesce(p_hidden, false);
end $$;
revoke all on function public.st_set_leaderboard_hidden(boolean) from public, anon;
grant execute on function public.st_set_leaderboard_hidden(boolean) to authenticated;

-- Tested 27 Oct 2026 inside a rolled-back block, as Nestor (request.jwt.claims): hide -> 0 of his 23 rows readable, 46 rows left with
-- no rank gaps; show again -> his 23 rows back. A plain rebuild with nobody hidden matched the untouched function's (9 rows differing
-- from the snapshot either way: live activity since the nightly rebuild). Snapshot st_backup.lb_entries_20261027.
