-- 23 Oct 2026. Two small tables the leaderboard reads (st_rebuild_leaderboard) - neither is open to the app's users.
--
-- channel_message_scored_at: the moment a post is scored at when it is not its own. st_post_review writes it when a
-- member's review takes the place of their own review from ANOTHER day (they corrected Thursday's review on Friday):
-- the new post carries the earlier one's moment, so it still counts for Thursday and Friday's review stays free.
-- Nestor corrected Thursday's review at 00:02 and 00:39 Friday; the copy scored as Friday's and both days lost
-- their review.
--
-- lb_excluded_trades: broker tickets the admin leaves out of every leaderboard rule, count and figure (test trades).
-- First rows: Nestor's three XAUUSD test sells on 19 Oct 2026, placed on a demo login (1514994373) that is linked to
-- no account in his journal, so they were judged as 70K trades: max trades per day broken, and Monday's 12:52 review
-- "before the last close" (18:58). His word, 23 Oct: "yes".

create table if not exists public.channel_message_scored_at (
  message_id uuid primary key references public.channel_messages(id) on delete cascade,
  scored_at  timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.channel_message_scored_at enable row level security;
revoke all on public.channel_message_scored_at from anon, authenticated;

create table if not exists public.lb_excluded_trades (
  user_id    uuid   not null,
  ticket     bigint not null,
  reason     text,
  created_at timestamptz not null default now(),
  primary key (user_id, ticket)
);
alter table public.lb_excluded_trades enable row level security;
revoke all on public.lb_excluded_trades from anon, authenticated;

insert into public.lb_excluded_trades (user_id, ticket, reason) values
  ('ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', 566414500, 'XAUUSD test sell 19 Oct 2026 on unlinked demo login 1514994373 (Nestor, 23 Oct: leave out)'),
  ('ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', 566420427, 'XAUUSD test sell 19 Oct 2026 on unlinked demo login 1514994373 (Nestor, 23 Oct: leave out)'),
  ('ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', 566422998, 'XAUUSD test sell 19 Oct 2026 on unlinked demo login 1514994373 (Nestor, 23 Oct: leave out)')
on conflict (user_id, ticket) do nothing;
