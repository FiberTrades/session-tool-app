-- 3 Oct 2026 (Nestor: "i am the admin i need permission to do whatever i want"). Applied as migration
-- cm_update_admin_can_edit. Members still cannot edit their posts in the four channels the app posts
-- into (the leaderboard scores them); the admin can edit any message anywhere. Delete (cm_delete via
-- st_is_mod) and react (cr_insert via st_can_access) already allowed the admin everything.
alter policy cm_update on public.channel_messages
  using (
    st_is_admin()
    or (
      (sender_id = auth.uid())
      and not exists (
        select 1 from channels c
        where c.id = channel_messages.channel_id
          and lower(c.slug) = any (array['pre-session-bias','post-session-review','weekend-review','series-of-10-trades'])
      )
    )
  );
