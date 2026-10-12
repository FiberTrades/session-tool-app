-- The welcome email (12 Oct 2026).
--
-- Nestor: "when someones creates a new account do we send them a confirmation and welcome email?" The confirmation
-- was sent; there was no welcome. "add it only if you can do it for me" ... "use chrome".
--
-- How it is sent, without any new key or service: the project's own sign-in mailer (Supabase Auth over Resend, the
-- same one that sends the confirmation). The app never uses one-time sign-in links, so the "Magic link or OTP" email
-- template was free: it now holds the welcome email (supabase/email_templates/welcome.html, subject
-- "Welcome to Session Terminal · Bienvenido a Session Terminal") and carries NO sign-in link. Asking the mailer for a
-- one-time sign-in email for a confirmed member therefore sends them the welcome.
--   * welcome_emails records who has been sent it - once per account.
--   * st_welcome_due() = accounts confirmed more than 10 minutes ago (the mailer refuses two emails to one address
--     within a minute, and a welcome a few minutes after confirming reads better than one in the same second), less
--     than 3 days ago, and after this went live - nobody who was already a member gets one.
--   * pg_cron (welcome-email-timer, every 5 minutes) calls the welcome-email function only while someone is due.
-- IF ONE-TIME SIGN-IN LINKS ARE EVER WANTED IN THE APP, this has to move to its own sender first: that template is
-- taken. Its original text was: subject "Your sign-in link", body
--   <h2>Your sign-in link</h2><p>Follow the link below to sign in. This link expires shortly and can only be used
--   once.</p><p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
-- Applied as migrations welcome_email and welcome_email_cron.

create table if not exists public.welcome_emails (
  user_id   uuid primary key,
  status    text        not null default 'pending',     -- pending | sent | failed
  tries     integer     not null default 0,
  last_try  timestamptz not null default now(),
  sent_at   timestamptz,
  error     text
);
alter table public.welcome_emails enable row level security;
revoke all on public.welcome_emails from anon, authenticated;

create or replace function public.st_welcome_due()
returns table(user_id uuid, email text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select u.id, u.email::text
    from auth.users u
   where u.email is not null
     and coalesce(u.is_anonymous, false) = false
     and u.email_confirmed_at is not null
     and u.email_confirmed_at >  timestamptz '2026-10-12 00:30:00+00'     -- went live: earlier members are left alone
     and u.email_confirmed_at <= now() - interval '10 minutes'
     and u.email_confirmed_at >  now() - interval '3 days'
     and not exists (select 1 from public.welcome_emails w
                      where w.user_id = u.id
                        and (w.status = 'sent' or w.tries >= 3 or w.last_try > now() - interval '15 minutes'))
   order by u.email_confirmed_at
   limit 20;
$function$;

-- Take who is due, counting the try in the same statement so two runs never write to the same person twice.
create or replace function public.st_welcome_take()
returns table(user_id uuid, email text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return query
  with due as (select d.user_id, d.email from public.st_welcome_due() d),
  ins as (
    insert into public.welcome_emails (user_id, status, tries, last_try)
    select d.user_id, 'pending', 1, now() from due d
    on conflict (user_id) do update set tries = public.welcome_emails.tries + 1, status = 'pending', last_try = now()
    returning public.welcome_emails.user_id
  )
  select d.user_id, d.email from due d join ins i on i.user_id = d.user_id;
end
$function$;
revoke all on function public.st_welcome_due() from public, anon, authenticated;
revoke all on function public.st_welcome_take() from public, anon, authenticated;

-- ---- the timer (migration welcome_email_cron) ----
select cron.schedule('welcome-email-timer', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/welcome-email',
    headers := jsonb_build_object('content-type', 'application/json',
                                  'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nudge_cron_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000)
  where exists (select 1 from public.st_welcome_due());
$job$);
