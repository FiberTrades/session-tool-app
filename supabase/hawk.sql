-- The hawk (5 Nov 2026): live ST Method setup alerts for the admin only.
-- Nestor: "build like a hawk to watch the market live and send me nudges when the perfect conditions to enter a trade present
-- themselves and that way i can give you feedback and you can learn from my judgment" - "keep this exclusively for me the admin".
--
-- cloud/hawk/hawk.py (uk1) reads the demo MT5's EURUSD candles over the local relay, runs the tested rules (cloud/hawk/engine.py)
-- every minute of the London window and posts each alert to the st-hawk edge function, which stores it here and pushes it to the
-- admin's phone. hawk.html lists them with Good call / Not my trade so the rules can be tuned to his judgement.
-- Applied as migration hawk_signals.

create table if not exists public.hawk_signals (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  day         date not null,                -- London date of the session
  key         text not null,                -- dedupe, e.g. "sweep:s:1793908680"
  kind        text not null,                -- brief | sweep | pocket | setup | initiation | done
  symbol      text not null default 'EURUSD',
  side        smallint,                     -- 1 buy, -1 sell, null for a brief
  title       text not null,
  body        text not null,
  data        jsonb not null default '{}'::jsonb,   -- levels, phase, location, model, the bar it fired on
  push        text,                         -- sent | filtered | no-device | failed
  feedback    text check (feedback in ('good', 'bad', 'late', 'early')),
  note        text,
  feedback_at timestamptz,
  unique (day, key)
);
create index if not exists hawk_signals_created on public.hawk_signals (created_at desc);

alter table public.hawk_signals enable row level security;
drop policy if exists hawk_admin_read on public.hawk_signals;
create policy hawk_admin_read on public.hawk_signals for select to authenticated using (public.st_is_admin());
drop policy if exists hawk_admin_feedback on public.hawk_signals;
create policy hawk_admin_feedback on public.hawk_signals for update to authenticated using (public.st_is_admin()) with check (public.st_is_admin());
revoke all on public.hawk_signals from anon;
revoke all on public.hawk_signals from authenticated;
grant select, update (feedback, note, feedback_at) on public.hawk_signals to authenticated;

-- The admin's user id, for the edge function's push (service role only).
create or replace function public.st_admin_uid()
returns uuid language sql stable security definer set search_path to 'public', 'auth'
as $$ select id from auth.users where lower(email) = 'be.o2@hotmail.com' limit 1 $$;
revoke all on function public.st_admin_uid() from public, anon, authenticated;
grant execute on function public.st_admin_uid() to service_role;
