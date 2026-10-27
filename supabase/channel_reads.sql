-- Where each member has read up to in each Community channel (27 Oct 2026, Nestor: "everytime i reload the charts it says i have
-- 80 unread messages, fix this. i have already read them"). Applied as migration channel_reads; kept here as the record.
--
-- One row per member and channel: the newest message's time they have had on screen. The app moves it on while a channel is on
-- screen (the Community tab, or the Charts chat with its panel open) and never back; the Charts chat's icon counts the messages
-- after it from other people. Synced per member, so what was read on the phone is read on the computer too.

create table if not exists public.channel_reads (
  user_id    uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (user_id, channel_id)
);
alter table public.channel_reads enable row level security;
drop policy if exists "channel reads: own rows" on public.channel_reads;
create policy "channel reads: own rows" on public.channel_reads for select to authenticated using (auth.uid() = user_id);
revoke all on public.channel_reads from anon, authenticated;
grant select on public.channel_reads to authenticated;

-- moves the caller's mark on (never back); a time from the future is held to now
create or replace function public.st_mark_channel_read(p_channel uuid, p_at timestamptz default now()) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v timestamptz;
begin
  if auth.uid() is null or p_channel is null then return null; end if;
  insert into public.channel_reads (user_id, channel_id, read_at)
  values (auth.uid(), p_channel, least(coalesce(p_at, now()), now()))
  on conflict (user_id, channel_id) do update set read_at = greatest(public.channel_reads.read_at, excluded.read_at)
  returning read_at into v;
  return v;
end $$;
revoke all on function public.st_mark_channel_read(uuid, timestamptz) from public, anon;
grant execute on function public.st_mark_channel_read(uuid, timestamptz) to authenticated;
