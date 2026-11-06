-- Drawings history (6 Nov 2026; applied as migrations practice_drawings_history + practice_drawings_hist_device_backup).
-- Nestor's three Live EUR/USD lines were saved away (19:01 UTC) and no earlier copy existed anywhere. Every change to a
-- practice_drawings row now keeps the version it replaced (the last 40 per symbol), and a device about to replace its own
-- drawings with a shorter list from the server keeps its copy here first (src 'device', app.html dwKeepLocal).
create table if not exists public.practice_drawings_hist (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  sym text not null,
  items jsonb not null,
  updated_at timestamptz,
  replaced_at timestamptz not null default now(),
  src text
);
create index if not exists practice_drawings_hist_k on public.practice_drawings_hist (user_id, sym, replaced_at desc);
alter table public.practice_drawings_hist enable row level security;
drop policy if exists pdh_own_read on public.practice_drawings_hist;
create policy pdh_own_read on public.practice_drawings_hist for select to authenticated using (user_id = auth.uid());
drop policy if exists pdh_own_ins on public.practice_drawings_hist;
create policy pdh_own_ins on public.practice_drawings_hist for insert to authenticated with check (user_id = auth.uid());
revoke all on public.practice_drawings_hist from anon;
revoke all on public.practice_drawings_hist from authenticated;
grant select, insert on public.practice_drawings_hist to authenticated;

create or replace function public.st_drawings_keep()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if old.items is distinct from new.items and jsonb_array_length(coalesce(old.items, '[]'::jsonb)) > 0 then
    insert into public.practice_drawings_hist (user_id, sym, items, updated_at) values (old.user_id, old.sym, old.items, old.updated_at);
    delete from public.practice_drawings_hist h where h.user_id = old.user_id and h.sym = old.sym and h.id not in
      (select id from public.practice_drawings_hist where user_id = old.user_id and sym = old.sym order by replaced_at desc limit 40);
  end if;
  return new;
end $$;
revoke all on function public.st_drawings_keep() from public, anon, authenticated;
drop trigger if exists st_drawings_keep on public.practice_drawings;
create trigger st_drawings_keep before update on public.practice_drawings for each row execute function public.st_drawings_keep();
