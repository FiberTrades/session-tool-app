-- Repo mirror of public.st_post_review (DB functions do not deploy via git - apply this by migration).
-- The app's own structured posts (bias, review, series of 10, weekend review, shared playbooks, Challenge passed) go through here.
--
-- 12 Oct 2026 (Nestor: "i unselected the LTF and resent the bias to community and now is correct but the old bias stays
-- in community and i have to delete it manually, shouldn't reposting it get rid of the old bias and just show the new
-- corrected bias?"). p_replace = the id of the earlier post this one corrects. The new post goes out as before, then the
-- earlier one is removed - but only where that cannot change what the leaderboard scores, which reads these channels
-- by the time each post was made:
--   bias     same day, and NOT when the earlier one was posted before the session started and it has started since:
--            that earlier post is the pre-session record the points and the direction match come from, so it stays
--            and the update is added under it, as before.
--   review   same day (a later post the same day counts wherever the earlier one did).
--   weekly   same week, both by the calendar week and by the week it reviews.
--   series   the new post names the same series.
-- A member could always delete their own post and post again, so this gives nobody anything new. Editing the earlier
-- post in place is NOT done: it would keep the earlier time on changed content (see cm_update in community_admin.sql).
-- The old five-argument function is dropped in the same migration: two overloads make the API refuse the call.
DROP FUNCTION IF EXISTS public.st_post_review(text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.st_post_review(p_slug text, p_body text, p_body_es text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_avatar text DEFAULT NULL::text, p_replace uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid  uuid := auth.uid();
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_body text := btrim(coalesce(p_body, ''));
  c      public.channels%rowtype;
  v_id   uuid;
  o      public.channel_messages%rowtype;
  v_tz   text;
  v_sess time;
  v_old  timestamp;
  v_now  timestamp;
  v_sn   text;
  v_ok   boolean := false;
begin
  if v_uid is null then raise exception 'signed out'; end if;
  if v_body = '' then raise exception 'empty body'; end if;

  -- The channels the app posts into. Kept in step with _APP_POST_CHANS in app.html; anything else
  -- must go through the normal composer path and its post_policy. 'playbooks' = a shared playbook card; 'prop-firm-passes' = the Challenge-passed card (1 Oct 2026).
  if v_slug not in ('pre-session-bias','post-session-review','weekend-review','series-of-10-trades','playbooks','prop-firm-passes') then
    raise exception 'not an app-post channel: %', v_slug;
  end if;

  if public.st_is_banned() then raise exception 'banned'; end if;

  select * into c from public.channels where lower(slug) = v_slug;
  if not found then raise exception 'no such channel: %', v_slug; end if;

  -- Reading the channel is not enough to post into it; this is the same access test cm_insert
  -- would have applied, minus the post_policy half that this path deliberately skips.
  if not (public.st_can_access(c.access_policy)
          and (c.required_role is null or public.st_has_role(c.required_role))) then
    raise exception 'no access to %', v_slug;
  end if;

  -- Duplicate guard (Nestor, 28 Sep 2026). Aurora's bias went out twice when she pressed Post again two minutes
  -- later, and Troy's weekend review 13 Sep was a double click 4 ms apart. An exact repeat of the same post by
  -- the same member in the same channel within a day now returns the first post instead of storing a second.
  -- A post that was changed is a different body and goes out as normal. The lock makes two simultaneous calls
  -- from one member to one channel queue, so a double click cannot slip both through.
  perform pg_advisory_xact_lock(hashtextextended('st_post_review:' || v_uid::text || ':' || c.id::text, 0));
  select m.id into v_id from public.channel_messages m
   where m.channel_id = c.id and m.sender_id = v_uid and m.body = v_body
     and m.created_at > now() - interval '24 hours'
   order by m.created_at desc limit 1;

  if v_id is null then
    insert into public.channel_messages
      (channel_id, sender_id, body, body_es, sender_name, sender_avatar)
    values
      (c.id, v_uid, v_body,
       nullif(btrim(coalesce(p_body_es, '')), ''),
       nullif(btrim(coalesce(p_name, '')), ''),
       nullif(btrim(coalesce(p_avatar, '')), ''))
    returning id into v_id;
  end if;

  -- The post this one corrects: removed where the leaderboard cannot be changed by it (see the top of this file).
  -- Never allowed to fail the post itself.
  if p_replace is not null and p_replace <> v_id then
    begin
      select * into o from public.channel_messages m
       where m.id = p_replace and m.sender_id = v_uid and m.channel_id = c.id;
      if found then
        -- the member's clock and first session start, read as st_rebuild_leaderboard reads them
        select coalesce(nullif(j.data -> 'settings' ->> 'tz', ''), 'Europe/London'),
               coalesce((select min(e ->> 'start')
                           from jsonb_array_elements(coalesce(j.data -> 'settings' -> 'sessions', '[]'::jsonb)) e
                          where nullif(e ->> 'start', '') is not null),
                        nullif(j.data -> 'settings' ->> 'windowStart', ''), '08:00')::time
          into v_tz, v_sess
          from public.journals j where j.user_id = v_uid;
        v_tz   := coalesce(v_tz, 'Europe/London');
        v_sess := coalesce(v_sess, time '08:00');
        v_old  := o.created_at at time zone v_tz;
        v_now  := now() at time zone v_tz;
        if v_slug = 'pre-session-bias' then
          v_ok := v_old::date = v_now::date and not (v_old::time < v_sess and v_now::time >= v_sess);
        elsif v_slug = 'post-session-review' then
          v_ok := v_old::date = v_now::date;
        elsif v_slug = 'weekend-review' then
          v_ok := date_trunc('week', v_old) = date_trunc('week', v_now)
              and date_trunc('week', v_old - interval '3 days') = date_trunc('week', v_now - interval '3 days');
        elsif v_slug = 'series-of-10-trades' then
          v_sn := substring(o.body from 'Series #([0-9]+)');
          v_ok := v_sn is null or v_body ~ ('Series #' || v_sn || '([^0-9]|$)');
        end if;
        if v_ok then delete from public.channel_messages where id = o.id; end if;
      end if;
    exception when others then null;
    end;
  end if;

  return v_id;
end;
$function$;
