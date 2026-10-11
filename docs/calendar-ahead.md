# The calendar's coming weeks (`calendar_ahead`)

The public feed the app reads (`ff_calendar_thisweek.xml`) only ever holds **one** week: the current one until some
time at the weekend, then the coming one. There is no next-week feed (`ff_calendar_nextweek.xml` answers 404). So:

- **Next Week** in the Economic calendar reads the coming weeks from the Supabase table `calendar_ahead`
  (through `st_calendar_ahead(p_from, p_to)`), which is filled by the collection below.
- **This Week** at the weekend, after the feed has rolled over, reads the week that just ended from
  `calendar_events` (the worker's own record of every week the feed has shown, with the released figures).

In the app this is `calendarWithExtra()` / `_calExtraLoad()` in `app.html`: the extra rows are laid over the feed's
events when the calendar is drawn and are never written into `data._calendarCache`. The feed always wins for a week
it covers. `window.__stCalExtra()` shows what is held; `window.__stCalExtra.refresh()` reads it again.

## Collecting (Claude, in the built-in browser)

A scheduled task (`calendar-ahead-weekly`, Wednesday and Saturday 09:30) does this. Five weeks are collected on a
Saturday, two on a Wednesday, so a missed run - the computer was off - never leaves Next Week empty.

For each week, starting from the first Sunday on or after today:

1. Open `https://www.forexfactory.com/calendar?week=oct18.2026` (lowercase three-letter month, day without a leading
   zero, `.year`; the date is the week's **Sunday**).
2. Run this on the page:

```js
(function(){ var st = window.calendarComponentStates && window.calendarComponentStates[1]; if (!st || !st.days || !st.days.length) return {error:'no calendar data on this page'}; var m = /week=([a-z]{3})(\d{1,2})\.(\d{4})/i.exec(location.search), mo = m ? 'janfebmaraprmayjunjulaugsepoctnovdec'.indexOf(m[1].toLowerCase()) / 3 + 1 : 0; if (!m || mo < 1 || mo % 1) return {error:'open the page as calendar?week=oct18.2026'}; var rows = []; st.days.forEach(function(d){ (d.events||[]).forEach(function(e){ if (!/^(high|medium|holiday)$/.test(e.impactName||'') || !e.currency || !e.name || !e.dateline) return; rows.push([new Date(e.dateline*1000).toISOString().slice(0,16)+'Z', e.currency, e.name, e.impactName, e.forecast||'', e.previous||'', e.soloUrl||''].join('|')); }); }); return {week_start: m[3] + '-' + ('0'+mo).slice(-2) + '-' + ('0'+m[2]).slice(-2), first_day_on_page: String(st.days[0].date||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(), days: st.days.length, total_on_page: st.days.reduce(function(a,d){return a+(d.events||[]).length;},0), n: rows.length, rows: JSON.stringify(rows)}; })()
```

3. Check `week_start` is the Sunday asked for and `first_day_on_page` is that same day ("Sun Oct 18").
4. Store it (Supabase, project `figozyxoyobixadhqewr`):
   `select public.st_calendar_ahead_put('2026-10-18', $j$<the rows array>$j$::jsonb) as stored;` - `stored` equals `n`.

Notes

- An event's time is `dateline` (absolute). The page's own day datelines are wrong in a week with a clock change, so
  the week comes from the address, not from them. Verified against the feed on 11 Oct 2026: the same 26 events, times,
  forecasts and links.
- Only the facts are kept (when, currency, name, impact, forecast, previous, link). What an event *is* comes from the
  app's own records (`EVENT_SPEC_ROWS`).
- Forecast and Previous are often empty more than a few days ahead; the Wednesday run fills in what has been
  published since.
- The writer refuses an empty list and any event outside the week. The reader returns only each week's latest
  collection, so a moved or dropped event is not shown twice; nothing is ever deleted.
