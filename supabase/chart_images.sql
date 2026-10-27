-- The Image drawing tool's pictures (27 Oct 2026; TradingView's Content > Image on Back Testing and Live Charts).
-- Repo mirror. APPLIED 27 Oct 2026 as the migration chart_images (Supabase MCP apply_migration); DB changes do not deploy via git.
-- Checked after: security advisors show nothing new; as two other uids in a rolled-back transaction, B read 0 of A's files,
-- B's file into A's folder was refused by RLS, a direct delete was refused, anon read 0; the public URL answers Bucket not found.
--
-- A private bucket: each member's files under <uid>/charts/..., read, added and removed by their owner only (no public
-- URLs; the app reads a file once per device and keeps it in its Cache Storage). The app shrinks a picture to about 1600 px
-- on its long side, WebP or JPEG at about 0.85, before it uploads; 2 MB is the hard cap here. A drawing holds only the
-- file's path, so the drawings row (practice_drawings, owner-only) stays small. Mentor view does not read practice
-- drawings, so it shows none of these.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chart-images', 'chart-images', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chart-images read own"   on storage.objects;
drop policy if exists "chart-images insert own" on storage.objects;
drop policy if exists "chart-images delete own" on storage.objects;
create policy "chart-images read own" on storage.objects for select to authenticated
  using (bucket_id = 'chart-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "chart-images insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'chart-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "chart-images delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'chart-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
