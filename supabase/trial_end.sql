-- End a member's free trial early, from Settings > Business (Nestor, 22 Oct 2026: "i need to have a way to end someones trial from
-- here"). Applied as the migration trial_end_by_admin; this file keeps a copy.
--
-- profiles.trial_ended_at: set when the admin ends a trial. A trial ends at the earlier of that and created_at + its days
-- (trial_days, 14 unless set) - st_trial_end(), the one rule every function below now uses. They had their own copies,
-- and st_has_access even ignored trial_days.

alter table public.profiles add column if not exists trial_ended_at timestamptz;
comment on column public.profiles.trial_ended_at is
  'Set when the admin ends a free trial early (Settings > Business > End trial). The trial ends at the earlier of this and created_at + trial days.';

create or replace function public.st_trial_end(p_created timestamptz, p_days integer, p_ended timestamptz)
returns timestamptz language sql immutable set search_path = public as $$
  -- the moment a free trial ends: its days (14 unless set) after sign-up, or earlier when the admin ended it
  select least(coalesce(p_ended, 'infinity'::timestamptz), p_created + make_interval(days => coalesce(nullif(p_days, 0), 14)))
$$;

-- the functions that decide whether a trial is running, rewritten in place (their bodies are not in git: the live definition is
-- read, the trial expression swapped, and the result executed; each pattern must be found exactly as many times as expected)
do $mig$
declare d text;
  function_rewrites constant text[][] := array[
    ['public.st_has_access()', '(p.created_at + interval ''14 days'') > now()', 'public.st_trial_end(p.created_at, p.trial_days, p.trial_ended_at) > now()', '1'],
    ['public.st_sync_account(text)', 'now() < p.created_at + make_interval(days => coalesce(nullif(p.trial_days, 0), 14))', 'now() < public.st_trial_end(p.created_at, p.trial_days, p.trial_ended_at)', '1'],
    ['public.st_members()', 'p.created_at + make_interval(days => coalesce(p.trial_days, 14)) > now()', 'public.st_trial_end(p.created_at, p.trial_days, p.trial_ended_at) > now()', '1']];
  r text[]; n int;
begin
  foreach r slice 1 in array function_rewrites loop
    d := pg_get_functiondef(r[1]::regprocedure);
    n := (length(d) - length(replace(d, r[2], ''))) / length(r[2]);
    if n <> r[4]::int then raise exception '%: pattern found % times, expected %', r[1], n, r[4]; end if;
    execute replace(d, r[2], r[3]);
  end loop;

  -- the Business panel: its trial counts and "trial ends" rows, and the members on a running trial (each row's End trial button)
  d := pg_get_functiondef('public.st_admin_business(date,date)'::regprocedure);
  n := (length(d) - length(replace(d, 'created_at + make_interval(days => coalesce(trial_days, 14))', ''))) / length('created_at + make_interval(days => coalesce(trial_days, 14))');
  if n <> 3 then raise exception 'st_admin_business: unqualified pattern found % times', n; end if;
  n := (length(d) - length(replace(d, 'p.created_at + make_interval(days => coalesce(p.trial_days, 14))', ''))) / length('p.created_at + make_interval(days => coalesce(p.trial_days, 14))');
  if n <> 3 then raise exception 'st_admin_business: qualified pattern found % times', n; end if;
  if position('''members'',       (select count(*) from public.profiles)' in d) = 0 then raise exception 'st_admin_business: members line not found'; end if;
  d := replace(d, 'p.created_at + make_interval(days => coalesce(p.trial_days, 14))', 'public.st_trial_end(p.created_at, p.trial_days, p.trial_ended_at)');
  d := replace(d, 'created_at + make_interval(days => coalesce(trial_days, 14))', 'public.st_trial_end(created_at, trial_days, trial_ended_at)');
  d := replace(d, '''members'',       (select count(*) from public.profiles)',
    '''members'',       (select count(*) from public.profiles),' || chr(10) ||
    '    ''on_trial'',      (select coalesce(jsonb_agg(lower(email)), ''[]''::jsonb) from public.profiles' || chr(10) ||
    '                       where not coalesce(is_paid, false) and coalesce(plan, '''') <> ''comp'' and email is not null' || chr(10) ||
    '                         and public.st_trial_end(created_at, trial_days, trial_ended_at) > now())');
  execute d;
end $mig$;

-- the admin's button: ends one member's running trial now, and says so in Latest changes
create or replace function public.st_admin_end_trial(p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.profiles%rowtype; n int;
begin
  if not public.st_is_admin() then raise exception 'not authorised'; end if;
  select count(*) into n from public.profiles where lower(email) = lower(trim(p_email));
  if n <> 1 then raise exception 'member not found'; end if;
  select * into v from public.profiles where lower(email) = lower(trim(p_email));
  if coalesce(v.is_paid, false) or v.plan = 'comp' then raise exception 'not on a free trial'; end if;
  if public.st_trial_end(v.created_at, v.trial_days, v.trial_ended_at) <= now() then return jsonb_build_object('ok', true, 'already', true); end if;
  update public.profiles set trial_ended_at = now(), updated_at = now() where id = v.id;
  insert into public.st_sub_events (at, user_id, email, kind) values (now(), v.id, v.email, 'trial_ended');
  return jsonb_build_object('ok', true, 'at', now());
end $$;
revoke all on function public.st_admin_end_trial(text) from public, anon;
grant execute on function public.st_admin_end_trial(text) to authenticated;
