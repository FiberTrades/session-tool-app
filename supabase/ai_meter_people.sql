-- AI Meter (admin only): who each row of usage belongs to. A name for every account that has one in its journal
-- (st_members only names paid members, so a trial member showed as the tail of an id), and whether the account
-- still exists - usage rows outlive a deleted account and showed in the list as unnamed "strange traders"
-- (Nestor, 11 Oct 2026). The app no longer lists the rows of deleted accounts; nothing is deleted, and what they used
-- stays in the All traders total. Applied as migration ai_usage_people.
create or replace function public.st_ai_usage_people()
returns table(user_id uuid, name text, account_exists boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select a.user_id,
         nullif(trim(j.data->>'userName'), '') as name,
         (u.id is not null) as account_exists
    from (select distinct user_id from public.ai_usage where user_id is not null) a
    left join auth.users u on u.id = a.user_id
    left join public.journals j on j.user_id = a.user_id
   where lower(coalesce(auth.jwt() ->> 'email', '')) = 'be.o2@hotmail.com';
$function$;
revoke all on function public.st_ai_usage_people() from public, anon;
grant execute on function public.st_ai_usage_people() to authenticated;
