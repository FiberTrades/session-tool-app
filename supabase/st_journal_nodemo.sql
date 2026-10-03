-- st_journal_nodemo(d jsonb) - a journal with the EXAMPLE journal taken out (3 Oct 2026).
--
-- New trial members get an example journal (data.demo set, every example item flagged "demo": true:
-- the example account, its trades in currentSeries / history, its weekly reviews) so the app is not
-- empty on day one. It lives in the cloud journal so every device shows it, and the app removes it
-- the moment the member sets up their own account. Until then it must never count anywhere outside
-- their own screens: st_rebuild_leaderboard reads every journal through this function.
--
-- A journal without data.demo (or data.demoDone, in case a sync merge brought example pieces back) comes back untouched (no rebuild, so it costs nothing for everyone
-- else). With it: the example account, the example trades (and any history series left empty by
-- that), and the example weekly / monthly reviews are dropped, and so is the demo key itself.
create or replace function public.st_journal_nodemo(d jsonb)
returns jsonb
language sql
immutable
parallel safe
as $$
  select case when d is null or jsonb_typeof(d) <> 'object' or not (d ? 'demo' or d ? 'demoDone') then d else
    (d - 'demo') || jsonb_build_object(
      'accounts', coalesce((
        select jsonb_agg(a.value order by a.n)
          from jsonb_array_elements(case when jsonb_typeof(d -> 'accounts') = 'array' then d -> 'accounts' else '[]'::jsonb end) with ordinality a(value, n)
         where coalesce(a.value ->> 'demo', '') <> 'true'), '[]'::jsonb),
      'currentSeries', coalesce((
        select jsonb_agg(t.value order by t.n)
          from jsonb_array_elements(case when jsonb_typeof(d -> 'currentSeries') = 'array' then d -> 'currentSeries' else '[]'::jsonb end) with ordinality t(value, n)
         where coalesce(t.value ->> 'demo', '') <> 'true'), '[]'::jsonb),
      'history', coalesce((
        select jsonb_agg(s.value || jsonb_build_object('trades', coalesce((
                 select jsonb_agg(t.value order by t.n)
                   from jsonb_array_elements(case when jsonb_typeof(s.value -> 'trades') = 'array' then s.value -> 'trades' else '[]'::jsonb end) with ordinality t(value, n)
                  where coalesce(t.value ->> 'demo', '') <> 'true'), '[]'::jsonb)) order by s.n)
          from jsonb_array_elements(case when jsonb_typeof(d -> 'history') = 'array' then d -> 'history' else '[]'::jsonb end) with ordinality s(value, n)
         where exists (select 1 from jsonb_array_elements(case when jsonb_typeof(s.value -> 'trades') = 'array' then s.value -> 'trades' else '[]'::jsonb end) t
                        where coalesce(t.value ->> 'demo', '') <> 'true')), '[]'::jsonb),
      'weeklyReviews', coalesce((
        select jsonb_agg(w.value order by w.n)
          from jsonb_array_elements(case when jsonb_typeof(d -> 'weeklyReviews') = 'array' then d -> 'weeklyReviews' else '[]'::jsonb end) with ordinality w(value, n)
         where coalesce(w.value ->> 'demo', '') <> 'true'), '[]'::jsonb),
      'monthlyReviews', coalesce((
        select jsonb_agg(m.value order by m.n)
          from jsonb_array_elements(case when jsonb_typeof(d -> 'monthlyReviews') = 'array' then d -> 'monthlyReviews' else '[]'::jsonb end) with ordinality m(value, n)
         where coalesce(m.value ->> 'demo', '') <> 'true'), '[]'::jsonb)
    )
  end
$$;

revoke all on function public.st_journal_nodemo(jsonb) from public, anon;
grant execute on function public.st_journal_nodemo(jsonb) to authenticated, service_role;
