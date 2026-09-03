-- The database owns journals.content_score.
--
-- Deployed 2026-09-03. WHY IT MOVED SERVER-SIDE: the destructive-write guard in cloudPush()
-- downloaded the ENTIRE journal before every save - up to 203kB, 532 times a day - purely to
-- compare contentScore, and in the common case never used the copy for anything else. The column
-- already held that number, but the CLIENT wrote it, so any writer that bypassed the app (a SQL
-- fix, a restore) changed data and left the score describing an older version. A score reading LOW
-- is the dangerous direction: the guard under-detects a removal, which is the failure that loses
-- trades. Computed here, it cannot describe anything but the row as stored, whoever wrote it.
--
-- st_content_score is a faithful mirror of contentScore() in app.html. It was validated against the
-- SHIPPED JS on 13 fixtures BEFORE the guard was switched over, because agreement on real data was
-- not evidence: across all ten journals the reviewTradeCount term contributes ZERO, so production
-- rows cannot tell a correct mirror from a broken one. 12 of 13 matched exactly. The 13th feeds
-- `history` the string "nope", where the JS returns 4 - seriesCount does (d.history || []).length,
-- which counts characters - and this returns 0. A well-formed journal cannot produce it.
--
-- The reviewTradeCount branch mirrors one quirk deliberately: `committed` is keyed by TRADE ids but
-- tested against a review trade's seriesId. That is what the JS does, and a mirror that quietly
-- "fixed" it would disagree with the client, which is the entire thing being guarded against.

create or replace function public.st_content_score(d jsonb)
returns integer language sql immutable as $$
  with arr as (select
      case when jsonb_typeof(d->'history')       = 'array' then d->'history'       else '[]'::jsonb end as hist,
      case when jsonb_typeof(d->'currentSeries') = 'array' then d->'currentSeries' else '[]'::jsonb end as cur,
      case when jsonb_typeof(d#>'{review,trades}') = 'array' then d#>'{review,trades}' else '[]'::jsonb end as rev),
  committed as (
      select tr->>'id' as id from arr, jsonb_array_elements(arr.cur) tr
      union all
      select tr->>'id' from arr, jsonb_array_elements(arr.hist) s,
             jsonb_array_elements(case when jsonb_typeof(s->'trades')='array' then s->'trades' else '[]'::jsonb end) tr)
  select
      coalesce((select sum(jsonb_array_length(case when jsonb_typeof(s->'trades')='array' then s->'trades' else '[]'::jsonb end))
                from arr, jsonb_array_elements(arr.hist) s), 0)
    + (select jsonb_array_length(cur) from arr)
    + (select count(*) from arr, jsonb_array_elements(arr.rev) t
        where t->>'result' in ('Win','Lose','BE')
          and not (coalesce(t->>'seriesId','') <> ''
                   and (t->>'seriesId') in (select id from committed where id is not null)))
    + case when jsonb_typeof(d#>'{customTags,concepts}')='array' then jsonb_array_length(d#>'{customTags,concepts}') else 0 end
    + case when jsonb_typeof(d#>'{customTags,mindset}') ='array' then jsonb_array_length(d#>'{customTags,mindset}')  else 0 end
    + (select jsonb_array_length(hist) from arr)
    + case when jsonb_typeof(d->'biasHistory')    ='array' then jsonb_array_length(d->'biasHistory')    else 0 end
    + case when jsonb_typeof(d->'weeklyReviews')  ='array' then jsonb_array_length(d->'weeklyReviews')  else 0 end
    + case when jsonb_typeof(d->'monthlyReviews') ='array' then jsonb_array_length(d->'monthlyReviews') else 0 end
$$;

create or replace function public.st_set_content_score()
returns trigger language plpgsql as $$
begin
  -- The client still sends a value and it is ignored on purpose. See the header.
  new.content_score := public.st_content_score(new.data);
  return new;
end;
$$;

drop trigger if exists journals_set_content_score on public.journals;
create trigger journals_set_content_score
  before insert or update on public.journals
  for each row execute function public.st_set_content_score();

-- Backfill (already run): update public.journals set data = data where content_score is null;
