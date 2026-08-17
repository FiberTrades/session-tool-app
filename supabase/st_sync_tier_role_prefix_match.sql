-- ─────────────────────────────────────────────────────────────────────────────
--  st_sync_tier_role — match the mentorship role by PREFIX, not by exact name
--  Applied to production 2026-08-16 (migration: sync_tier_role_match_mentorship_by_prefix)
--
--  WHAT WAS WRONG
--  The function resolved the mentorship tier by the literal name 'Mentorship 💎'
--  — with a space. The role is actually called 'Mentorship💎', no space. The
--  lookup therefore returned null and broke in BOTH directions:
--
--    * nobody was ever GRANTED it — `tid` was null, so the insert never ran, and a
--      paying mentorship subscriber silently kept whatever tier they already had;
--    * nobody was ever STRIPPED of it — the same wrong name was in the tier_ids
--      set, so the real role was treated as a cosmetic one and never revoked. An
--      EXPIRED subscriber was found still holding 'Mentorship💎' next to
--      'Free Trial', advertising a subscription that had lapsed.
--
--  It failed silently because of the delete's null semantics: with `tid` null,
--  `mr.role_id <> tid` is null, so no rows matched and nothing looked broken.
--
--  THE FIX
--  A display emoji is cosmetic and belongs to whoever edits roles in the community
--  UI; matching a functional identifier against it couples server logic to a string
--  that can be re-picked at any time. Mentorship is now resolved with
--  `name ilike 'Mentorship%'`, and '#MENTORSHIP' is an internal sentinel that cannot
--  collide with a real role name. The emoji can now change freely.
--
--  CONSTRAINT THIS INTRODUCES: 'Mentorship' must remain the first word of that
--  role's name, and no other role may start with it.
--
--  Everything else was already correct — 'Admin', 'Bundle Pro', 'Free Trial' and
--  'ST Journal' all matched exactly, and non-tier roles (e.g. 'Experienced Member🎓')
--  are still left completely alone.
--
--  AFTER APPLYING, backfill — the trigger only fires on INSERT/UPDATE OF is_paid,
--  plan, so profiles whose billing fields never changed had never been synced at all
--  (one comped member was holding no tier role whatsoever):
--
--      select public.st_sync_tier_role(id) from public.profiles;
--
--  That run reconciled 17 profiles and left 0 drifting.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.st_sync_tier_role(p_uid uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  target text;
  tid uuid;
  tier_ids uuid[];
  v_email text;
begin
  select email into v_email from auth.users where id = p_uid;

  if lower(coalesce(v_email,'')) = 'be.o2@hotmail.com' then
    target := 'Admin';
  else
    select case
      when p.is_paid and p.plan in ('bundle','comp') then 'Bundle Pro'
      when p.is_paid and p.plan = 'mentorship'       then '#MENTORSHIP'
      when p.is_paid and p.plan = 'premium'          then 'ST Journal'
      else 'Free Trial'
    end
    into target
    from public.profiles p
    where p.id = p_uid;
    if target is null then target := 'Free Trial'; end if;
  end if;

  -- The mentorship role carries a DISPLAY emoji in its name (currently 'Mentorship<diamond>').
  -- That emoji used to be hardcoded here as 'Mentorship <diamond>' WITH a space, which matched
  -- nothing: the lookup returned null, so no mentorship subscriber was ever granted the role, and
  -- because the name was likewise absent from tier_ids below it was never revoked either - an
  -- expired subscriber kept it alongside Free Trial. Matching a functional identifier against a
  -- cosmetic string is the bug; the emoji belongs to the community UI and may be re-picked at any
  -- time. So mentorship is resolved by PREFIX and '#MENTORSHIP' is only an internal sentinel that
  -- can never collide with a real role name. Keep 'Mentorship' as the first word of that role.
  if target = '#MENTORSHIP' then
    select id into tid from public.roles
     where name ilike 'Mentorship%' order by position desc limit 1;
  else
    select id into tid from public.roles where name = target limit 1;
  end if;

  -- The set of mutually exclusive tier roles. A user holds exactly one; any other
  -- role (custom, cosmetic, moderator) is left completely alone.
  select array_agg(id) into tier_ids
    from public.roles
   where name in ('Free Trial','ST Journal','Bundle Pro','Admin')
      or name ilike 'Mentorship%';

  -- NOTE: when tid is null (target role genuinely absent) `role_id <> tid` is null, so nothing is
  -- deleted. That is deliberate and conservative - a missing role should not strip a member of the
  -- tier they already hold - but it is also why the mismatch above failed silently.
  delete from public.member_roles mr
   where mr.user_id = p_uid
     and mr.role_id = any(tier_ids)
     and mr.role_id <> tid;

  if tid is not null and not exists (
    select 1 from public.member_roles where user_id = p_uid and role_id = tid
  ) then
    insert into public.member_roles (user_id, role_id) values (p_uid, tid);
  end if;
end $function$;
