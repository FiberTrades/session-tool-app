-- ═══════════════════════════════════════════════════════════════════════════
-- st_rebuild_leaderboard() — nightly (+ st_bump_leaderboard) rebuild of the
-- Discipline Leaderboard into public.leaderboard_entries (period = week/month/
-- year, plus an 'alltime' Best-Months board). Run this in the Supabase SQL
-- editor to deploy; git push does NOT deploy DB functions.
--
-- 2026-08-03 change: the weekly-review penalty (−20 per pledged week with no
-- weekend review) now only applies to CALENDAR weeks that have fully ended. The
-- current, in-progress week is exempt until the new week commences — see the
-- WHERE clause in `weeks_pledged` below. Posting a review early still rewards
-- (+20); only the penalty is deferred.
--
-- 2026-08-04 fix (COST DOUBLE-COUNT): trades_verified.pnl is stored NET of costs
-- (gross = pnl + costs). The `t` CTE was doing `pnl - costs`, subtracting costs a
-- SECOND time — inflating every loss / deflating every win by the trade's costs.
-- This produced e.g. a phantom max-daily-drawdown breach (a −£126.65 day read as
-- −£145.93 vs a £140 limit). All net figures now use `pnl` as-is. Also corrects
-- Net R, win/BE classification, and broken-stop / TP-pulled detection.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.st_rebuild_leaderboard()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_period    text;
  v_start     date;
  v_end       date;
  ch_bias     uuid := st_channel_id('pre-session-bias');
  ch_review   uuid := st_channel_id('post-session-review');
  ch_weekly   uuid := st_channel_id('weekend-review');
  ch_series   uuid := st_channel_id('series-of-10-trades');
begin
  foreach v_period in array array['week','month','year'] loop

    v_start := case v_period
                 when 'week'    then date_trunc('week',  (now() at time zone 'Europe/London'))::date
                 when 'month'   then date_trunc('month', (now() at time zone 'Europe/London'))::date
                 when 'year'    then date_trunc('year',  (now() at time zone 'Europe/London'))::date
                 else                date '1970-01-01'
               end;
    v_end := (case v_period
                when 'week'    then v_start + interval '7 days'
                when 'month'   then v_start + interval '1 month'
                when 'year'    then v_start + interval '1 year'
                else                date '2999-01-01'
              end)::date;

    delete from leaderboard_entries e
     where e.period = v_period and e.period_start = v_start;

    with
    sess as (
      select
        j.user_id,
        coalesce(nullif(j.data -> 'settings' ->> 'tz', ''), 'Europe/London') as tz,
        coalesce(
          (select min(e ->> 'start')
             from jsonb_array_elements(coalesce(j.data -> 'settings' -> 'sessions', '[]'::jsonb)) e
            where nullif(e ->> 'start','') is not null),
          nullif(j.data -> 'settings' ->> 'windowStart', ''),
          '08:00'
        )::time as sess_start,
        coalesce(
          (select max(e ->> 'end')
             from jsonb_array_elements(coalesce(j.data -> 'settings' -> 'sessions', '[]'::jsonb)) e
            where nullif(e ->> 'end','') is not null),
          nullif(j.data -> 'settings' ->> 'windowEnd', ''),
          '10:00'
        )::time as sess_end
      from journals j
    ),
    accts as (
      select
        j.user_id,
        a.obj as acc,
        coalesce(
          nullif((a.obj ->> 'startingBalance'), '')::numeric,
          nullif((a.obj ->> 'balance'), '')::numeric,
          nullif((j.data -> 'settings' ->> 'startingBalance'), '')::numeric,
          0
        ) as balance,
        coalesce(a.obj -> 'riskRules', j.data -> 'settings' -> 'riskRules', '{}'::jsonb) as rr
      from journals j
      cross join lateral jsonb_array_elements(coalesce(j.data -> 'accounts', '[]'::jsonb)) a(obj)
      where coalesce(a.obj ->> 'status', 'active') = 'active'
      union all
      select
        j.user_id,
        '{}'::jsonb,
        coalesce(nullif((j.data -> 'settings' ->> 'startingBalance'), '')::numeric, 0),
        coalesce(j.data -> 'settings' -> 'riskRules', '{}'::jsonb)
      from journals j
      where jsonb_array_length(coalesce(j.data -> 'accounts', '[]'::jsonb)) = 0
    ),
    per_acct as (
      select
        x.user_id,
        x.balance,
        case
          when (x.rr ->> 'maxRiskMode') = 'amount'
            then nullif((x.rr ->> 'maxRiskAmount'), '')::numeric
          when nullif((x.rr ->> 'maxRiskPct'), '')::numeric > 0 and x.balance > 0
            then nullif((x.rr ->> 'maxRiskPct'), '')::numeric / 100.0 * x.balance
          else nullif((x.rr ->> 'maxRiskAmount'), '')::numeric
        end as max_risk,
        case
          when (x.rr ->> 'maxLossMode') = 'amount'
            then nullif((x.rr ->> 'maxLossAmount'), '')::numeric
          when nullif((x.rr ->> 'maxLossPct'), '')::numeric > 0 and x.balance > 0
            then nullif((x.rr ->> 'maxLossPct'), '')::numeric / 100.0 * x.balance
          else nullif((x.rr ->> 'maxLossAmount'), '')::numeric
        end as max_loss,
        nullif((x.rr ->> 'maxTrades'), '')::int as max_trades,
        case
          when (x.rr ->> 'beThresholdMode') = 'amount'
            then nullif((x.rr ->> 'beThresholdAmount'), '')::numeric
          when nullif((x.rr ->> 'beThresholdPct'), '')::numeric > 0 and x.balance > 0
            then nullif((x.rr ->> 'beThresholdPct'), '')::numeric / 100.0 * x.balance
          else nullif((x.rr ->> 'beThresholdAmount'), '')::numeric
        end as be_band,
        case
          when nullif((x.rr ->> 'maxRiskPct'), '')::numeric > 0
            then nullif((x.rr ->> 'maxRiskPct'), '')::numeric
          when x.balance > 0 and nullif((x.rr ->> 'maxRiskAmount'), '')::numeric > 0
            then round(nullif((x.rr ->> 'maxRiskAmount'), '')::numeric / x.balance * 100.0, 2)
        end as max_risk_pct,
        case
          when nullif((x.rr ->> 'maxLossPct'), '')::numeric > 0
            then nullif((x.rr ->> 'maxLossPct'), '')::numeric
          when x.balance > 0 and nullif((x.rr ->> 'maxLossAmount'), '')::numeric > 0
            then round(nullif((x.rr ->> 'maxLossAmount'), '')::numeric / x.balance * 100.0, 2)
        end as max_loss_pct,
        case
          when nullif((x.rr ->> 'beThresholdPct'), '')::numeric > 0
            then nullif((x.rr ->> 'beThresholdPct'), '')::numeric
          when x.balance > 0 and nullif((x.rr ->> 'beThresholdAmount'), '')::numeric > 0
            then round(nullif((x.rr ->> 'beThresholdAmount'), '')::numeric / x.balance * 100.0, 2)
        end as be_pct
      from accts x
    ),
    lim as (
      select
        user_id,
        max(balance)         as balance,
        min(max_risk)        as max_risk,
        min(max_loss)        as max_loss,
        min(max_trades)      as max_trades,
        min(be_band)         as be_band,
        min(max_risk_pct)    as max_risk_pct,
        min(max_loss_pct)    as max_loss_pct,
        min(be_pct)          as be_pct,
        count(*)             as n_accounts
      from per_acct
      group by user_id
    ),
    raw as (
      select
        lt.*,
        lag(lt.open_time) over (
          partition by lt.user_id, lt.symbol, lt.direction order by lt.open_time, lt.ticket
        ) as prev_open
      from trades_verified lt
      where lt.close_time is not null
        and lt.pnl is not null
    ),
    grp as (
      select
        r.*,
        sum(case when r.prev_open is null
                   or r.open_time - r.prev_open > interval '5 seconds'
                 then 1 else 0 end)
          over (partition by r.user_id, r.symbol, r.direction
                order by r.open_time, r.ticket
                rows between unbounded preceding and current row) as setup_no
      from raw r
    ),
    ded as (
      select distinct on (user_id, symbol, direction, setup_no) *
      from grp
      order by user_id, symbol, direction, setup_no, open_time, ticket
    ),
    t as (
      select
        lt.user_id,
        lt.direction                              as direction,
        lt.close_time,
        -- IMPORTANT: trades_verified.pnl is ALREADY NET of costs (gross = pnl + costs). Do NOT
        -- subtract costs again — an earlier version did (`pnl - costs`), double-counting costs and
        -- inflating every loss (which e.g. caused a phantom max-daily-drawdown breach). Use pnl as-is.
        lt.pnl::numeric                           as pnl_net,
        coalesce(lt.costs::numeric, 0)            as costs,
        lt.pnl::numeric                           as pnl_gross,   -- = net (kept the name to avoid renaming downstream refs)
        lt.risk_gbp::numeric                      as risk,
        lt.sl_pips::numeric                       as sl_pips,
        coalesce(lt.tp_r::numeric, 0)             as tp_r,
        coalesce(lt.mfe_r::numeric, 0)            as mfe_r,
        (lt.sl_pips is not null and nullif(lt.risk_gbp::numeric,0) is not null) as stamped,
        case when nullif(lt.risk_gbp::numeric,0) is not null
             then (lt.pnl::numeric) / lt.risk_gbp::numeric
        end                                                    as r,
        (lt.sl_pips is not null and coalesce(lt.sl_pips::numeric,0) <= 0)      as no_stop,
        (
          (lt.pnl::numeric) < 0
          and nullif(lt.risk_gbp::numeric,0) is not null
          and coalesce(lt.sl_pips::numeric,0) > 0
          and abs(lt.pnl::numeric)
              > lt.risk_gbp::numeric
                + greatest(
                    lt.risk_gbp::numeric * 0.05,
                    3 * (lt.risk_gbp::numeric / lt.sl_pips::numeric)
                  )
        )                                                      as broken_stop,
        (
          coalesce(lt.tp_r::numeric,0) > 0
          and coalesce(lt.mfe_r::numeric,0) >= lt.tp_r::numeric * 1.02
          and nullif(lt.risk_gbp::numeric,0) is not null
          and ((lt.pnl::numeric) / lt.risk_gbp::numeric)
              < lt.tp_r::numeric * 0.95
        )                                                      as tp_pulled,
        coalesce(l.be_band, 0.005)                             as be_band,
        l.max_risk,
        (
          l.max_risk is not null and l.max_risk > 0
          and lt.risk_gbp is not null
          and lt.risk_gbp::numeric > l.max_risk * 1.05
        )                                                      as over_risk,
        ceil(row_number() over (partition by lt.user_id order by lt.close_time)::numeric / 10.0) as series_no
      from ded lt
      left join lim l on l.user_id = lt.user_id
    ),
    series as (
      select
        user_id, series_no,
        max(close_time)                             as closed_at,
        sum(r)                                      as series_r,
        count(*) filter (where pnl_gross >  be_band)                    as wins,
        count(*) filter (where abs(pnl_gross) <= be_band)               as bes,
        count(*) filter (where pnl_gross < -be_band)                    as losses,
        count(*) filter (where no_stop)             as missing_stops,
        count(*) filter (where broken_stop)         as broken_stops,
        count(*) filter (where tp_pulled)           as tp_pulled,
        count(*) filter (where over_risk)           as over_risk,
        count(*) filter (where not stamped)         as unstamped
      from t
      group by user_id, series_no
      having count(*) = 10
    ),
    clean as (
      select *
      from series s
      where s.unstamped     = 0
        and s.over_risk     = 0
        and s.series_r is not null
        and (s.closed_at at time zone 'Europe/London')::date >= v_start
        and (s.closed_at at time zone 'Europe/London')::date <  v_end
    ),
    best as (
      select distinct on (user_id) user_id, series_r, wins, bes, losses, closed_at
      from clean
      order by user_id, series_r desc, closed_at desc
    ),
    period_trades as (
      select
        user_id,
        count(*)                            as trades,
        count(*) filter (where pnl_gross > be_band)        as wins,
        count(*) filter (where abs(pnl_gross) <= be_band)  as bes,
        count(*) filter (where pnl_gross < -be_band)       as losses,
        count(*) filter (where over_risk)    as over_risk,
        count(*) filter (where no_stop)     as missing_stops,
        count(*) filter (where broken_stop) as broken_stops,
        count(*) filter (where tp_pulled)   as tp_pulled,
        count(*) filter (where not stamped)  as unstamped
      from t
      where (close_time at time zone 'Europe/London')::date >= v_start
        and (close_time at time zone 'Europe/London')::date <  v_end
      group by user_id
    ),
    days as (
      select
        t.user_id,
        (t.close_time at time zone coalesce(s.tz,'Europe/London'))::date as d,
        sum(t.pnl_gross)                                                 as day_pnl,
        count(*)                                                         as day_trades,
        bool_or(t.over_risk)                                            as any_over_risk
      from t
      left join sess s on s.user_id = t.user_id
      where (t.close_time at time zone coalesce(s.tz,'Europe/London'))::date >= v_start
        and (t.close_time at time zone coalesce(s.tz,'Europe/London'))::date <  v_end
      group by 1,2
    ),
    day_breaks as (
      select
        d.user_id,
        count(*) filter (
          where l.max_loss is not null and l.max_loss > 0
            and d.day_pnl < 0 and abs(d.day_pnl) > l.max_loss
        ) as over_loss_days,
        count(*) filter (
          where l.max_trades is not null and l.max_trades > 0
            and d.day_trades > l.max_trades
        ) as over_trade_days
      from days d
      left join lim l on l.user_id = d.user_id
      group by d.user_id
    ),
    bias as (
      select m.sender_id as user_id,
             count(distinct (m.created_at at time zone s.tz)::date) as days
      from channel_messages m
      join sess s on s.user_id = m.sender_id
      where ch_bias is not null and m.channel_id = ch_bias
        and (m.created_at at time zone s.tz)::time <  s.sess_start
        and (m.created_at at time zone s.tz)::date >= v_start
        and (m.created_at at time zone s.tz)::date <  v_end
      group by m.sender_id
    ),
    review as (
      select m.sender_id as user_id,
             count(distinct (m.created_at at time zone s.tz)::date) as days
      from channel_messages m
      join sess s on s.user_id = m.sender_id
      where ch_review is not null and m.channel_id = ch_review
        and (m.created_at at time zone s.tz)::time >= s.sess_end
        and (m.created_at at time zone s.tz)::date >= v_start
        and (m.created_at at time zone s.tz)::date <  v_end
      group by m.sender_id
    ),
    weekly as (
      select m.sender_id as user_id,
             count(distinct date_trunc('week', m.created_at at time zone s.tz)) as n
      from channel_messages m
      join sess s on s.user_id = m.sender_id
      where ch_weekly is not null and m.channel_id = ch_weekly
        and (m.created_at at time zone s.tz)::date >= v_start
        and (m.created_at at time zone s.tz)::date <  v_end
      group by m.sender_id
    ),
    posts as (
      select m.sender_id as user_id,
             count(distinct (m.created_at at time zone s.tz)::date) as n
      from channel_messages m
      join sess s on s.user_id = m.sender_id
      where ch_series is not null and m.channel_id = ch_series
        and (m.created_at at time zone s.tz)::date >= v_start
        and (m.created_at at time zone s.tz)::date <  v_end
      group by m.sender_id
    ),
    commit_pledge as (
      select
        j.user_id,
        (kv.key)::date as monday,
        array(select x::int from jsonb_array_elements_text(kv.value) x) as days
      from journals j
      cross join lateral jsonb_each(coalesce(j.data -> 'weeklyCommitments', '{}'::jsonb)) kv
      where jsonb_typeof(kv.value) = 'array'
        and jsonb_array_length(kv.value) >= 3
        and kv.key ~ '^\d{4}-\d{2}-\d{2}$'
    ),
    commit_dates as (
      select cp.user_id, (cp.monday + ((wd + 6) % 7))::date as commit_date
      from commit_pledge cp
      cross join lateral unnest(cp.days) as wd
    ),
    trade_dates as (
      select distinct t.user_id,
             (t.close_time at time zone coalesce(s.tz,'Europe/London'))::date as d
      from t
      left join sess s on s.user_id = t.user_id
    ),
    bias_dates as (
      select distinct m.sender_id as user_id,
             (m.created_at at time zone coalesce(s.tz,'Europe/London'))::date as d
      from channel_messages m
      left join sess s on s.user_id = m.sender_id
      where ch_bias is not null and m.channel_id = ch_bias
        and (m.created_at at time zone coalesce(s.tz,'Europe/London'))::date >= v_start
        and (m.created_at at time zone coalesce(s.tz,'Europe/London'))::date <  v_end
    ),
    commit_adh as (
      select
        cd.user_id,
        count(*) filter (where (td.d is not null or bd.d is not null) and cd.commit_date >= v_start and cd.commit_date < v_end) as commit_kept,
        count(*) filter (where td.d is null and bd.d is null and cd.commit_date >= v_start and cd.commit_date < v_end)          as commit_missed
      from commit_dates cd
      left join trade_dates td on td.user_id = cd.user_id and td.d = cd.commit_date
      left join bias_dates  bd on bd.user_id = cd.user_id and bd.d = cd.commit_date
      where exists (select 1 from trade_dates tt where tt.user_id = cd.user_id)
         or exists (select 1 from bias_dates  bb where bb.user_id = cd.user_id)
      group by cd.user_id
    ),
    bias_ok_dates as (
      select distinct m.sender_id as user_id,
             (m.created_at at time zone coalesce(s.tz,'Europe/London'))::date as d
      from channel_messages m
      join sess s on s.user_id = m.sender_id
      where ch_bias is not null and m.channel_id = ch_bias
        and (m.created_at at time zone s.tz)::time <  s.sess_start
        and (m.created_at at time zone s.tz)::date >= v_start
        and (m.created_at at time zone s.tz)::date <  v_end
    ),
    review_ok_dates as (
      select distinct m.sender_id as user_id,
             (m.created_at at time zone coalesce(s.tz,'Europe/London'))::date as d
      from channel_messages m
      join sess s on s.user_id = m.sender_id
      where ch_review is not null and m.channel_id = ch_review
        and (m.created_at at time zone s.tz)::time >= s.sess_end
        and (m.created_at at time zone s.tz)::date >= v_start
        and (m.created_at at time zone s.tz)::date <  v_end
    ),
    -- The set of days the per-day rules are scored over.
    --
    -- 2026-08-13: this used to be bias_ok_dates ALONE, which quietly gated every downstream
    -- rule on having posted a pre-session bias. A day you traded without posting a bias was
    -- absent from this set, so cd_adh never examined it: breaking max risk, max trades or max
    -- daily drawdown that day cost nothing, keeping them earned nothing, and a review posted
    -- or missed that day scored nothing either. The effect was backwards for a discipline
    -- board — the trader who skipped the bias also escaped the risk rules for that day.
    --
    -- Now: bias days, trading days, and review days. The risk-rule filters in cd_adh already
    -- require dy.d is not null (a real trading day) AND the limit to be configured, so
    -- widening this set cannot award or deduct anything on a day with no trades.
    -- bias_kept is unaffected: it counts rows where bok.d is not null, which is still exactly
    -- the days carrying an on-time bias.
    cd_period as (
      select distinct user_id, d from bias_ok_dates
      union
      select distinct user_id, d from days
      union
      select distinct user_id, d from review_ok_dates
    ),
    cd_adh as (
      select
        cd.user_id,
        count(*) filter (where bok.d is not null)  as bias_kept,
        count(*) filter (where bok.d is null)      as bias_missed,
        count(*) filter (where dy.d is not null)   as traded_days,
        count(*) filter (where rok.d is not null)  as review_kept,
        count(*) filter (where rok.d is null)      as review_missed,
        count(*) filter (where dy.d is not null and l.max_trades is not null and l.max_trades > 0
                           and dy.day_trades <= l.max_trades)                        as maxtr_kept,
        count(*) filter (where dy.d is not null and l.max_trades is not null and l.max_trades > 0
                           and dy.day_trades >  l.max_trades)                        as maxtr_over,
        count(*) filter (where dy.d is not null and l.max_loss is not null and l.max_loss > 0
                           and not (dy.day_pnl < 0 and abs(dy.day_pnl) > l.max_loss)) as dd_kept,
        count(*) filter (where dy.d is not null and l.max_loss is not null and l.max_loss > 0
                           and dy.day_pnl < 0 and abs(dy.day_pnl) > l.max_loss)       as dd_over,
        count(*) filter (where dy.d is not null and l.max_risk is not null and l.max_risk > 0
                           and not coalesce(dy.any_over_risk,false))                  as risk_kept,
        count(*) filter (where dy.d is not null and l.max_risk is not null and l.max_risk > 0
                           and coalesce(dy.any_over_risk,false))                      as risk_over
      from cd_period cd
      left join bias_ok_dates   bok on bok.user_id = cd.user_id and bok.d = cd.d
      left join review_ok_dates rok on rok.user_id = cd.user_id and rok.d = cd.d
      left join days            dy  on dy.user_id  = cd.user_id and dy.d  = cd.d
      left join lim             l   on l.user_id   = cd.user_id
      group by cd.user_id
    ),
    bias_pen as (
      select dy.user_id, count(*) as bias_missed_traded
      from days dy
      left join bias_ok_dates bok on bok.user_id = dy.user_id and bok.d = dy.d
      where bok.d is null
      group by dy.user_id
    ),
    bias_dir_dates as (
      select distinct on (m.sender_id, (m.created_at at time zone s.tz)::date)
             m.sender_id as user_id,
             (m.created_at at time zone s.tz)::date as d,
             case
               when m.body like '%↑%' or m.body ilike '%bullish%' or m.body ilike '%alcista%' then 'long'
               when m.body like '%↓%' or m.body ilike '%bearish%' or m.body ilike '%bajista%' then 'short'
             end as dir
      from channel_messages m
      join sess s on s.user_id = m.sender_id
      where ch_bias is not null and m.channel_id = ch_bias
        and (m.created_at at time zone s.tz)::time <  s.sess_start
        and (m.created_at at time zone s.tz)::date >= v_start
        and (m.created_at at time zone s.tz)::date <  v_end
      order by m.sender_id, (m.created_at at time zone s.tz)::date, m.created_at desc
    ),
    trade_dirs as (
      select t.user_id,
             (t.close_time at time zone coalesce(s.tz,'Europe/London'))::date as d,
             bool_or(lower(t.direction) like 'buy%'  or lower(t.direction) like 'long%')  as had_long,
             bool_or(lower(t.direction) like 'sell%' or lower(t.direction) like 'short%') as had_short
      from t
      join sess s on s.user_id = t.user_id
      where (t.close_time at time zone coalesce(s.tz,'Europe/London'))::date >= v_start
        and (t.close_time at time zone coalesce(s.tz,'Europe/London'))::date <  v_end
      group by t.user_id, (t.close_time at time zone coalesce(s.tz,'Europe/London'))::date
    ),
    dir_match as (
      select bdd.user_id, count(*) as match_days
      from bias_dir_dates bdd
      join trade_dirs td on td.user_id = bdd.user_id and td.d = bdd.d
      where bdd.dir is not null
        and ((bdd.dir = 'long' and td.had_long) or (bdd.dir = 'short' and td.had_short))
      group by bdd.user_id
    ),
    weeks_pledged as (
      -- A week counts as "pledged" (a weekend review is expected) when the user
      -- posted a valid pre-session bias that week. 2026-08-03: only weeks that have
      -- FULLY ENDED are penalizable — the current, in-progress calendar week is
      -- exempt until the new week begins. A review posted early still credits via
      -- weekly_post_weeks (reward kept); only the missed-week penalty is deferred.
      select distinct user_id, date_trunc('week', d)::date as monday
      from bias_ok_dates
      where date_trunc('week', d)::date
            < date_trunc('week', (now() at time zone 'Europe/London'))::date
    ),
    weekly_post_weeks as (
      -- Credit the week the review is FOR, not when it was posted. Shifting the local
      -- post date back 3 days maps a Thu->Wed window onto each Mon-Sun week, so a review
      -- posted Fri/Sat/Sun (end of the reviewed week) OR Mon/Tue/Wed (once the new week
      -- has begun) both credit that reviewed week. Scan is widened +/-7d; the reviewed
      -- week itself is what must fall inside the period.
      select distinct user_id, monday from (
        select m.sender_id as user_id,
               date_trunc('week', ((m.created_at at time zone coalesce(s.tz,'Europe/London'))::date - 3))::date as monday
        from channel_messages m
        left join sess s on s.user_id = m.sender_id
        where ch_weekly is not null and m.channel_id = ch_weekly
          and (m.created_at at time zone coalesce(s.tz,'Europe/London'))::date >= (v_start - 7)
          and (m.created_at at time zone coalesce(s.tz,'Europe/London'))::date <  (v_end + 7)
      ) z
      where z.monday >= v_start and z.monday < v_end
    ),
    weekly_adh as (
      select u.user_id,
        coalesce(d.done, 0)   as weekly_done,
        coalesce(m.missed, 0) as weekly_missed
      from (
        select user_id from weekly_post_weeks
        union
        select user_id from weeks_pledged
      ) u
      left join (
        select user_id, count(distinct monday) as done
        from weekly_post_weeks group by user_id
      ) d on d.user_id = u.user_id
      left join (
        select wp.user_id, count(*) as missed
        from weeks_pledged wp
        left join weekly_post_weeks wk
          on wk.user_id = wp.user_id and wk.monday = wp.monday
        where wk.monday is null
        group by wp.user_id
      ) m on m.user_id = u.user_id
    ),
    series_done as (
      select user_id, count(*) as n_completed
      from series
      where (closed_at at time zone 'Europe/London')::date >= v_start
        and (closed_at at time zone 'Europe/London')::date <  v_end
      group by user_id
    ),
    streak_bonus as (
      select e1.user_id, 50::numeric as bonus
      from leaderboard_entries e1
      join leaderboard_entries e2
        on  e2.user_id = e1.user_id
        and e2.period = 'month'
        and e2.period_start = (v_start - interval '2 months')::date
        and e2.rank = 1
      where v_period = 'month'
        and e1.period = 'month'
        and e1.period_start = (v_start - interval '1 month')::date
        and e1.rank = 1
    ),
    period_r as (
      select user_id, sum(r) as net_r
      from t
      where r is not null
        and (close_time at time zone 'Europe/London')::date >= v_start
        and (close_time at time zone 'Europe/London')::date <  v_end
      group by user_id
    ),
    people as (
      select user_id from period_trades
      union select user_id from bias
      union select user_id from review
      union select user_id from weekly
      union select user_id from weekly_post_weeks
      union select user_id from posts
      union select user_id from commit_adh
    ),
    scored as (
      select
        p.user_id,
        true                                                as ranked,
        pr.net_r                                            as best_series_r,
        b.closed_at                                         as best_series_at,
        coalesce(pt.wins,0)                                 as series_wins,
        coalesce(pt.bes,0)                                  as series_be,
        coalesce(pt.losses,0)                               as series_losses,
        coalesce(pt.trades,0)                               as trades,
        case when coalesce(pt.wins,0)+coalesce(pt.losses,0) > 0
             then round(100.0 * pt.wins / (pt.wins + pt.losses), 1) end as win_rate,
        coalesce(pt.broken_stops,0)                         as broken_stops,
        coalesce(pt.missing_stops,0)                        as missing_stops,
        coalesce(pt.tp_pulled,0)                            as tp_pulled,
        coalesce(pt.unstamped,0)                            as unstamped,
        coalesce(pt.over_risk,0)                            as over_risk,
        coalesce(db.over_loss_days,0)                       as over_loss_days,
        coalesce(db.over_trade_days,0)                      as over_trade_days,
        l.max_risk_pct                                      as rule_max_risk_pct,
        l.max_loss_pct                                      as rule_max_loss_pct,
        l.max_trades                                        as rule_max_trades,
        l.be_pct                                            as rule_be_pct,
        coalesce(l.n_accounts,1)                            as n_accounts,
        se.sess_start                                       as sess_start,
        se.sess_end                                         as sess_end,
        coalesce(bi.days,0)                                 as bias_days,
        coalesce(rv.days,0)                                 as review_days,
        coalesce(wa.weekly_done,0)                          as weekly_reviews,
        coalesce(ps.n,0)                                    as series_posts,
        coalesce(sd.n_completed,0)                          as series_total,
        round(
            greatest(0, coalesce(pr.net_r,0))     * 10
          + coalesce(cda.bias_kept,0)             *  5
          - coalesce(bpn.bias_missed_traded,0)    *  5
          + coalesce(cda.review_kept,0)           *  5
          - coalesce(cda.review_missed,0)         *  5
          + coalesce(wa.weekly_done,0)            * 20
          - coalesce(wa.weekly_missed,0)          * 20
          + least(coalesce(sd.n_completed,0), coalesce(ps.n,0))        *  5
          - greatest(0, coalesce(sd.n_completed,0) - coalesce(ps.n,0)) *  5
          + coalesce(sb.bonus,0)
          + coalesce(dm.match_days,0)             * 10
          + coalesce(cda.maxtr_kept,0)            * 10
          - coalesce(cda.maxtr_over,0)            * 20
          + coalesce(cda.dd_kept,0)               * 10
          - coalesce(cda.dd_over,0)               * 20
          + coalesce(cda.risk_kept,0)             * 10
          - coalesce(cda.risk_over,0)             * 20
        , 1)                                                as points,
        jsonb_build_object(
          'r',            round(greatest(0, coalesce(pr.net_r,0)) * 10, 1),
          'bias',         coalesce(cda.bias_kept,0)   * 5 - coalesce(bpn.bias_missed_traded,0) * 5,
          'review',       coalesce(cda.review_kept,0) * 5 - coalesce(cda.review_missed,0) * 5,
          'weekly',       coalesce(wa.weekly_done,0)  * 20 - coalesce(wa.weekly_missed,0) * 20,
          'series_post',  least(coalesce(sd.n_completed,0), coalesce(ps.n,0)) * 5
                          - greatest(0, coalesce(sd.n_completed,0) - coalesce(ps.n,0)) * 5,
          'traded_day',   coalesce(dm.match_days,0) * 10,
          'max_trades',   coalesce(cda.maxtr_kept,0) * 10 - coalesce(cda.maxtr_over,0) * 20,
          'drawdown',     coalesce(cda.dd_kept,0)    * 10 - coalesce(cda.dd_over,0)    * 20,
          'max_risk',     coalesce(cda.risk_kept,0)  * 10 - coalesce(cda.risk_over,0)  * 20,
          'streak',       coalesce(sb.bonus,0)
        )                                                   as points_breakdown
      from people p
      left join best          b  on b.user_id  = p.user_id
      left join period_r      pr on pr.user_id = p.user_id
      left join period_trades pt on pt.user_id = p.user_id
      left join bias          bi on bi.user_id = p.user_id
      left join review        rv on rv.user_id = p.user_id
      left join weekly        wk on wk.user_id = p.user_id
      left join posts         ps on ps.user_id = p.user_id
      left join day_breaks    db on db.user_id = p.user_id
      left join lim           l  on l.user_id  = p.user_id
      left join sess          se on se.user_id = p.user_id
      left join commit_adh    ca on ca.user_id = p.user_id
      left join cd_adh        cda on cda.user_id = p.user_id
      left join bias_pen      bpn on bpn.user_id = p.user_id
      left join dir_match     dm  on dm.user_id  = p.user_id
      left join weekly_adh    wa  on wa.user_id  = p.user_id
      left join series_done   sd  on sd.user_id  = p.user_id
      left join streak_bonus  sb  on sb.user_id  = p.user_id
    )
    insert into leaderboard_entries (
      period, period_start, user_id, points, rank, ranked,
      best_series_r, series_wins, series_be, series_losses,
      trades, win_rate, broken_stops, missing_stops, tp_pulled, unstamped,
      over_risk, over_loss_days, over_trade_days,
      rule_max_risk_pct, rule_max_loss_pct, rule_max_trades, rule_be_pct, n_accounts,
      sess_start, sess_end, best_series_at,
      bias_days, review_days, weekly_reviews, series_posts, series_total, points_breakdown, updated_at
    )
    select
      v_period, v_start, s.user_id, s.points,
      dense_rank() over (order by s.points desc, s.best_series_r desc nulls last),
      s.ranked,
      s.best_series_r, s.series_wins, s.series_be, s.series_losses,
      s.trades, s.win_rate, s.broken_stops, s.missing_stops, s.tp_pulled, s.unstamped,
      s.over_risk, s.over_loss_days, s.over_trade_days,
      s.rule_max_risk_pct, s.rule_max_loss_pct, s.rule_max_trades, s.rule_be_pct, s.n_accounts,
      s.sess_start, s.sess_end, s.best_series_at,
      s.bias_days, s.review_days, s.weekly_reviews, s.series_posts, s.series_total, s.points_breakdown, now()
    from scored s;

  end loop;

  delete from leaderboard_entries where period = 'alltime' and period_start = date '1970-01-01';
  insert into leaderboard_entries (
    period, period_start, user_id, points, rank, ranked,
    best_series_r, series_wins, series_be, series_losses,
    trades, win_rate, broken_stops, missing_stops, tp_pulled, unstamped,
    over_risk, over_loss_days, over_trade_days,
    rule_max_risk_pct, rule_max_loss_pct, rule_max_trades, rule_be_pct, n_accounts,
    sess_start, sess_end, best_series_at,
    bias_days, review_days, weekly_reviews, series_posts, series_total, points_breakdown, updated_at
  )
  select
    'alltime', date '1970-01-01', bm.user_id, bm.points,
    dense_rank() over (order by bm.points desc),
    true,
    bm.best_series_r, bm.series_wins, bm.series_be, bm.series_losses,
    bm.trades, bm.win_rate, bm.broken_stops, bm.missing_stops, bm.tp_pulled, bm.unstamped,
    bm.over_risk, bm.over_loss_days, bm.over_trade_days,
    bm.rule_max_risk_pct, bm.rule_max_loss_pct, bm.rule_max_trades, bm.rule_be_pct, bm.n_accounts,
    bm.sess_start, bm.sess_end, bm.period_start,
    bm.bias_days, bm.review_days, bm.weekly_reviews, bm.series_posts, bm.series_total, bm.points_breakdown, now()
  from (
    select distinct on (user_id) *
    from leaderboard_entries
    where period = 'month'
    order by user_id, points desc, period_start desc
  ) bm
  where bm.points > 0;

end;
$function$;
