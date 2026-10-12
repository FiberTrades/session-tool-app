-- Community members list: members on their free trial are listed too, with their Free Trial role (12 Oct 2026).
--
-- Nestor, 11 Oct 2026: "i have a new member called jamesstrategy, he is on a free trial, how come i dont see him in
-- the community members list?" ... "yes add trial members to the list and tag them with this" (the "Free Trial 👽"
-- role).
--
-- 1. st_members() listed paid and comp members only, so a trial member showed in the list only while online and
--    never under Offline. It now also returns every account whose trial is still running (the same test the Business
--    tab uses: not paid, not comp, created_at + trial_days (14) still ahead). When the trial ends without a
--    subscription the member drops off the list again. The tag is the member's own role: the list already colours a
--    name with its top role and shows the emoji of the role's name.
--
-- 2. st_sync_tier_role() looked the trial role up by its EXACT name, 'Free Trial'. The role is now called
--    'Free Trial 👽', so the lookup found nothing: a new trial member would have got no role at all, and a member who
--    subscribed would have kept the trial role beside the paid one - both silently. Every tier role is now found by
--    the words its name STARTS with ('Free Trial', 'Journal Pro', 'ST Journal', 'Admin', 'Mentorship'), so an emoji
--    can be added to or changed in any of them. Keep those words first in the name, and start no other role with them.
-- Applied as migration members_trial_and_role_prefix, followed by  select st_sync_tier_role(id) from profiles;

create or replace function public.st_members()
 returns table(id uuid, name text, avatar text, plan text, paid boolean, is_admin boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$select p.id,
         nullif(trim(j.data->>'userName'), ''),
         j.data->>'avatarUrl',
         p.plan,
         p.is_paid,
         (u.email = 'be.o2@hotmail.com')
  from public.profiles p
  left join public.journals j on j.user_id = p.id
  left join auth.users u on u.id = p.id
  where (p.is_paid = true or p.plan = 'comp'
         -- on a free trial that is still running
         or (not coalesce(p.is_paid, false)
             and p.created_at + make_interval(days => coalesce(p.trial_days, 14)) > now()))
    and auth.uid() is not null;$function$;

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
      when p.is_paid and p.plan in ('bundle','comp') then 'Journal Pro'
      when p.is_paid and p.plan = 'mentorship'       then 'Mentorship'
      when p.is_paid and p.plan = 'premium'          then 'ST Journal'
      else 'Free Trial'
    end
    into target
    from public.profiles p
    where p.id = p_uid;
    if target is null then target := 'Free Trial'; end if;
  end if;

  -- A tier role is found by the words its name STARTS with, never by its whole name: the name carries a display
  -- emoji that belongs to the community UI and may be re-picked at any time ('Mentorship 💎', 'Free Trial 👽').
  -- Matching the whole name is what broke mentorship in August 2026 and would have broken the trial role in
  -- October: the lookup returns nothing, and nothing is granted or revoked, without any error.
  select id into tid from public.roles
   where name ilike target || '%' order by position desc, created_at limit 1;

  -- The set of mutually exclusive tier roles. A user holds exactly one; any other
  -- role (custom, cosmetic, moderator) is left completely alone.
  select array_agg(id) into tier_ids
    from public.roles
   where name ilike 'Free Trial%' or name ilike 'ST Journal%' or name ilike 'Journal Pro%'
      or name ilike 'Admin%' or name ilike 'Mentorship%';

  -- NOTE: when tid is null (target role genuinely absent) `role_id <> tid` is null, so nothing is
  -- deleted. That is deliberate and conservative - a missing role should not strip a member of the
  -- tier they already hold.
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
