-- Practice Replay drawings across devices (15 Oct 2026). Nestor: "yes sync drawings between devices too".
-- Repo mirror; applied with `supabase db query --linked -f supabase/practice_drawings.sql` (DB changes do not deploy via git).
--
-- One row per member and symbol: the whole list of that symbol's drawings (lines, zones, fibs, measures, pen strokes,
-- notes), as the app keeps it. updated_at is the time of the last change on the device that made it; the newer copy
-- wins when a device opens practice. Own rows only; nothing else reads this table.

create table if not exists public.practice_drawings (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sym        text not null check (length(sym) between 1 and 32),
  items      jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and octet_length(items::text) <= 600000),
  updated_at timestamptz not null default now(),
  primary key (user_id, sym)
);

alter table public.practice_drawings enable row level security;

drop policy if exists practice_drawings_own_read   on public.practice_drawings;
drop policy if exists practice_drawings_own_insert on public.practice_drawings;
drop policy if exists practice_drawings_own_update on public.practice_drawings;
create policy practice_drawings_own_read   on public.practice_drawings for select to authenticated using (user_id = auth.uid());
create policy practice_drawings_own_insert on public.practice_drawings for insert to authenticated with check (user_id = auth.uid());
create policy practice_drawings_own_update on public.practice_drawings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.practice_drawings from anon;
revoke delete, truncate on public.practice_drawings from authenticated;
grant select, insert, update on public.practice_drawings to authenticated;
