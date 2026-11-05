-- The firms' rules (Nestor, 5 Nov 2026: "when someone connects a new firm you need to make sure the app also tries to learn and remember these
-- parameters"). One row per firm + program + plan. Every member reads them; only the firm-rules function writes them (service role).
--   trust 'firm':  read on the firm's own pages, or confirmed by the admin. 'found': found online, the firm has not confirmed it, the app says so.
--   rules: { target: { Challenge: 10, Verification: 5, Funded: null }, daily, dd, ddType, cons, split, bySize }
--          null = not known, left as the member has it. daily 0 = the firm has no daily limit. cons: one number, or one per stage.
--          bySize: { "100000": { cons: ... } } a size and up that differs.
--   proposed: what the weekly check found that differs, waiting for the admin; nothing changes until he accepts it.
create table if not exists public.firm_rules (
  id bigserial primary key,
  firm text not null,
  program text not null check (program in ('1step', '2step', '3step', 'instant')),
  plan text not null default '',
  rules jsonb not null,
  trust text not null check (trust in ('firm', 'found')),
  source_url text,
  checked_at date not null default current_date,
  proposed jsonb,
  proposed_url text,
  proposed_at timestamptz,
  unique (firm, program, plan)
);
-- every firm the app has looked up, so it is searched for once and remembered: is_prop false is a broker
create table if not exists public.firm_lookups (
  firm text primary key,
  company text,
  is_prop boolean,
  status text not null default 'busy' check (status in ('busy', 'ok', 'none', 'error')),
  looked_at timestamptz not null default now(),
  note text
);
alter table public.firm_rules enable row level security;
alter table public.firm_lookups enable row level security;
drop policy if exists firm_rules_read on public.firm_rules;
create policy firm_rules_read on public.firm_rules for select to authenticated using (true);
drop policy if exists firm_lookups_read on public.firm_lookups;
create policy firm_lookups_read on public.firm_lookups for select to authenticated using (true);
revoke insert, update, delete on public.firm_rules, public.firm_lookups from anon, authenticated;

insert into public.firm_lookups (firm, company, is_prop, status, note) values
  ('FTMO', 'FTMO Global Markets Ltd', true, 'ok', 'seeded 5 Nov 2026'),
  ('OneFunded', 'OneFunded Capital Ltd.', true, 'ok', 'seeded 5 Nov 2026'),
  ('TTT', 'TTT Markets Ltd.', true, 'ok', 'seeded 5 Nov 2026'),
  ('Tradeify', 'Tradeify Ventures Limited', true, 'ok', 'seeded 5 Nov 2026')
on conflict (firm) do nothing;

-- All read on the firms' own pages, 5 Nov 2026. Without paid add-ons (TTT's Drawdown Upgrade makes 4/8 into 5/10). Tradeify Classic really is 5% then 10%.
insert into public.firm_rules (firm, program, plan, rules, trust, source_url) values
  ('FTMO', '2step', '', '{"target":{"Challenge":10,"Verification":5,"Funded":null},"daily":5,"dd":10,"ddType":"static","cons":null,"split":80}', 'firm', 'https://ftmo.com/en/trading-objectives/'),
  ('FTMO', '1step', '', '{"target":{"Challenge":10,"Funded":null},"daily":3,"dd":10,"ddType":"trailing","cons":50,"split":80}', 'firm', 'https://ftmo.com/en/1-step-challenge/'),
  ('OneFunded', '1step', 'Flash', '{"target":{"Challenge":10,"Funded":null},"daily":4,"dd":8,"ddType":"static","cons":{"Challenge":50,"Funded":50},"split":80,"bySize":{"100000":{"cons":{"Challenge":50,"Funded":30}}}}', 'firm', 'https://help.onefunded.com/flash-challenge/'),
  ('OneFunded', '2step', 'Core', '{"target":{"Challenge":8,"Verification":5,"Funded":null},"daily":5,"dd":10,"ddType":"static","cons":{"Funded":50},"split":80,"bySize":{"100000":{"cons":{"Challenge":50,"Verification":50,"Funded":30}}}}', 'firm', 'https://help.onefunded.com/core-challenge/'),
  ('OneFunded', '2step', 'Value', '{"target":{"Challenge":8,"Verification":6,"Funded":null},"daily":4,"dd":8,"ddType":"static","cons":{"Funded":50},"split":80,"bySize":{"100000":{"cons":{"Challenge":40,"Verification":40,"Funded":30}}}}', 'firm', 'https://help.onefunded.com/value-challenge/'),
  ('OneFunded', 'instant', 'Instant', '{"target":{"Funded":null},"daily":3,"dd":6,"ddType":"static","cons":15,"split":60}', 'firm', 'https://help.onefunded.com/instant-challenge/'),
  ('TTT', '1step', 'Standard', '{"target":{"Challenge":10,"Funded":null},"daily":4,"dd":8,"ddType":"trailing","cons":null,"split":80}', 'firm', 'https://help.tttmarkets.com/help/1-step-challenge/what-are-the-drawdown-limits-on-the-1-step-challenge'),
  ('TTT', '1step', 'Lite', '{"target":{"Challenge":5,"Funded":null},"daily":3,"dd":5,"ddType":"trailing","cons":null,"split":80}', 'firm', 'https://help.tttmarkets.com/help/1-step-lite/what-are-the-drawdown-limits-on-the-1-step-lite-challenge'),
  ('TTT', '2step', 'Standard', '{"target":{"Challenge":8,"Verification":5,"Funded":null},"daily":4,"dd":8,"ddType":"static","cons":null,"split":80}', 'firm', 'https://help.tttmarkets.com/help/2-step-challenge/what-are-the-drawdown-limits-on-the-2-step-challenge'),
  ('TTT', '2step', 'Lite', '{"target":{"Challenge":5,"Verification":5,"Funded":null},"daily":3,"dd":5,"ddType":"static","cons":null,"split":80}', 'firm', 'https://help.tttmarkets.com/help/2-step-lite/what-are-the-drawdown-limits-on-the-2-step-lite-challenge'),
  ('TTT', 'instant', 'Instant Funding', '{"target":{"Funded":null},"daily":0,"dd":6,"ddType":"static","cons":null,"split":70}', 'firm', 'https://tttmarkets.com/'),
  ('TTT', 'instant', 'Instant Lite', '{"target":{"Funded":null},"daily":0,"dd":3,"ddType":"static","cons":null,"split":80}', 'firm', 'https://tttmarkets.com/'),
  ('Tradeify', '1step', 'Daily', '{"target":{"Challenge":10,"Funded":null},"daily":0,"dd":5,"ddType":"trailing_lock","cons":{"Challenge":40},"split":80}', 'firm', 'https://help.tradeifyfx.co/en/articles/16975953-daily-1-step-guide'),
  ('Tradeify', '2step', 'Classic', '{"target":{"Challenge":5,"Verification":10,"Funded":null},"daily":3,"dd":10,"ddType":"static","cons":null,"split":80}', 'firm', 'https://help.tradeifyfx.co/en/articles/16976039-classic-2-step-guide'),
  ('Tradeify', 'instant', 'Direct', '{"target":{"Funded":null},"daily":3,"dd":6,"ddType":"trailing_lock","cons":20,"split":80}', 'firm', 'https://help.tradeifyfx.co/en/articles/16976051-direct-instant-funding-guide')
on conflict (firm, program, plan) do nothing;

-- The weekly check: once a day it looks at the two firms looked at longest ago, each at most once a week.
-- select cron.schedule('firm-rules-check', '30 3 * * *', $job$
--   select net.http_post(
--     url := 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/firm-rules',
--     headers := jsonb_build_object('content-type', 'application/json',
--                                   'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nudge_cron_key')),
--     body := '{"op":"check"}'::jsonb,
--     timeout_milliseconds := 300000);
-- $job$);
