-- Judge me on (26 Nov 2026, Nestor: "it should use the lead account but maybe in here we could select what account we want to be
-- judged on"). Applied as migration lb_judge_account; kept here as the record.
--
-- Settings -> Profile -> Privacy, under "Show me on the leaderboard": which of the member's accounts a COPIED setup (one trade the
-- copier placed on several accounts) is judged on for Net R, win rate and the trade count. No row / NULL = the copier's Lead (the
-- default). st_rebuild_leaderboard's ded CTE reads it: the picked account's copy when it has one, else the Lead's, else the earliest.
-- Max risk and daily loss are still judged on every copy (chk / acc_days), whatever is picked. Closed periods stay as they were.

alter table public.lb_prefs add column if not exists judge_acc text;

create or replace function public.st_set_leaderboard_judge(p_acc text) returns text
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); a text := nullif(left(trim(coalesce(p_acc, '')), 80), '');
begin
  if u is null then raise exception 'sign in'; end if;
  insert into public.lb_prefs (user_id, hidden, judge_acc, updated_at) values (u, false, a, now())
    on conflict (user_id) do update set judge_acc = excluded.judge_acc, updated_at = now();
  perform public.st_bump_leaderboard();   -- the live boards, rebuilt on the account picked
  return a;
end $$;
revoke all on function public.st_set_leaderboard_judge(text) from public, anon;
grant execute on function public.st_set_leaderboard_judge(text) to authenticated;
