-- The weeks ahead of the public calendar feed (11 Oct 2026). The feed the app reads only ever holds ONE week, so a
-- "Next Week" view had nothing to show. The coming weeks (High / Medium / Holiday) are collected into this table - see
-- docs/calendar-ahead.md - and the app reads them through st_calendar_ahead(). About five weeks are kept ahead, so a
-- missed collection does not leave next week empty. Applied as migrations calendar_ahead + calendar_ahead_put_lines.
create table if not exists public.calendar_ahead (
  at          timestamptz not null,
  currency    text        not null,
  title       text        not null,
  impact      text        not null,
  timed       boolean     not null default true,
  forecast    text,
  previous    text,
  url         text,
  week_start  date        not null,          -- the Sunday that opens the collected week
  captured_at timestamptz not null default now(),
  primary key (at, currency, title)
);
create index if not exists calendar_ahead_week on public.calendar_ahead (week_start, captured_at);
alter table public.calendar_ahead enable row level security;
revoke all on public.calendar_ahead from anon, authenticated;

-- Reader: only the rows of each week's LATEST collection, so an event that was moved or dropped since an earlier
-- collection is not shown twice (nothing is deleted).
create or replace function public.st_calendar_ahead(p_from timestamptz, p_to timestamptz)
returns table(at timestamptz, currency text, title text, impact text, timed boolean, forecast text, previous text, url text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select a.at, a.currency, a.title, a.impact, a.timed, a.forecast, a.previous, a.url
    from public.calendar_ahead a
    join (select week_start, max(captured_at) as cap from public.calendar_ahead group by week_start) l
      on l.week_start = a.week_start and l.cap = a.captured_at
   where a.at >= p_from and a.at < p_to
     and p_to - p_from <= interval '45 days'
   order by a.at, a.currency, a.title;
$function$;
revoke all on function public.st_calendar_ahead(timestamptz, timestamptz) from public, anon;
grant execute on function public.st_calendar_ahead(timestamptz, timestamptz) to authenticated;

-- Writer (service role only): one whole week per call. A row is an object, an array, or one
-- 'at|currency|title|impact|forecast|previous|url' line; impact in any case; a site-relative link is made absolute.
-- Refuses an empty list and any event outside the week, so a page that failed to load or the wrong week can never be
-- stored as "the latest".
create or replace function public.st_calendar_ahead_put(p_week_start date, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n      integer;
  ts     timestamptz := clock_timestamp();
  bad    integer;
  v_rows jsonb;
begin
  if p_week_start is null or extract(dow from p_week_start) <> 0 then
    raise exception 'week_start must be a Sunday';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'no rows';
  end if;
  select jsonb_agg(case jsonb_typeof(r)
           when 'object' then r
           when 'array'  then jsonb_build_object('at', r->>0, 'currency', r->>1, 'title', r->>2, 'impact', r->>3,
                                                 'forecast', r->>4, 'previous', r->>5, 'url', r->>6)
           else (select jsonb_build_object('at', p[1], 'currency', p[2], 'title', p[3], 'impact', p[4],
                                           'forecast', p[5], 'previous', p[6], 'url', p[7])
                   from (select string_to_array(r #>> '{}', '|') as p) x)
         end)
    into v_rows
    from jsonb_array_elements(p_rows) r;
  select count(*) into bad
    from jsonb_array_elements(v_rows) r
   where coalesce(r->>'at', '') = ''
      or (r->>'at')::timestamptz <  (p_week_start::timestamp at time zone 'UTC') - interval '14 hours'
      or (r->>'at')::timestamptz >= (p_week_start::timestamp at time zone 'UTC') + interval '7 days 14 hours'
      or initcap(lower(trim(coalesce(r->>'impact', '')))) not in ('High', 'Medium', 'Holiday')
      or coalesce(trim(r->>'title'), '') = ''
      or coalesce(trim(r->>'currency'), '') = '';
  if bad > 0 then
    raise exception '% row(s) outside the week or incomplete', bad;
  end if;
  insert into public.calendar_ahead (at, currency, title, impact, timed, forecast, previous, url, week_start, captured_at)
  select distinct on (1, 2, 3)
         (r->>'at')::timestamptz, upper(trim(r->>'currency')), trim(r->>'title'), initcap(lower(trim(r->>'impact'))),
         coalesce((r->>'timed')::boolean, true),
         nullif(trim(r->>'forecast'), ''), nullif(trim(r->>'previous'), ''),
         case when trim(coalesce(r->>'url', '')) like '/%' then 'https://www.forexfactory.com' || trim(r->>'url')
              else nullif(trim(r->>'url'), '') end,
         p_week_start, ts
    from jsonb_array_elements(v_rows) r
  on conflict (at, currency, title) do update
     set impact = excluded.impact, timed = excluded.timed, forecast = excluded.forecast, previous = excluded.previous,
         url = excluded.url, week_start = excluded.week_start, captured_at = excluded.captured_at;
  get diagnostics n = row_count;
  return n;
end
$function$;
revoke all on function public.st_calendar_ahead_put(date, jsonb) from public, anon, authenticated;
