-- A copy a Follow account did not take (EA 9.19, 2 Nov 2026). On 30 Oct OneFunded's MT5 journal said "failed market buy 1.11 EURUSD ...
-- [AutoTrading disabled by server]" and the app said nothing. The EA now tells live-trade (event "copy_fail") and the app shows it at
-- once: one row per Follow account and Lead trade; taken back ({ok:true}) if the copy turned out to be there or got copied later.
-- Few rows, kept 7 days (live-trade clears a member's older ones when a new one arrives).
create table if not exists public.copy_refusals (
  user_id   uuid not null references auth.users(id) on delete cascade,
  login     text not null,            -- the Follow account
  ticket    text not null,            -- the Lead's position
  lead      text,                     -- the Lead account
  symbol    text,
  direction text,
  lots      numeric,
  retcode   integer,                  -- the broker's answer (10026 = AutoTrading disabled by server); 0 when the EA itself held back
  kind      text,                     -- refused (the broker said no) | skip (the EA's own rule) | wait (could still be copied)
  why       text,                     -- the EA's words
  at        timestamptz not null default now(),
  primary key (user_id, login, ticket)
);
alter table public.copy_refusals enable row level security;
revoke all on public.copy_refusals from anon, authenticated;
grant select on public.copy_refusals to authenticated;
drop policy if exists copy_refusals_own on public.copy_refusals;
create policy copy_refusals_own on public.copy_refusals for select to authenticated using (user_id = auth.uid());
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'copy_refusals') then
    alter publication supabase_realtime add table public.copy_refusals;
  end if;
end $$;
