-- Repo mirror of public.st_post_review (DB functions do not deploy via git - apply this by migration).
-- The app's own structured posts (bias, review, series of 10, weekend review, shared playbooks, Challenge passed) go through here.
CREATE OR REPLACE FUNCTION public.st_post_review(p_slug text, p_body text, p_body_es text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_avatar text DEFAULT NULL::text)
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
  if v_id is not null then return v_id; end if;

  insert into public.channel_messages
    (channel_id, sender_id, body, body_es, sender_name, sender_avatar)
  values
    (c.id, v_uid, v_body,
     nullif(btrim(coalesce(p_body_es, '')), ''),
     nullif(btrim(coalesce(p_name, '')), ''),
     nullif(btrim(coalesce(p_avatar, '')), ''))
  returning id into v_id;

  return v_id;
end;
$function$;
