-- Journal version history: archive the PREVIOUS copy whenever a journal really changes.
--
-- Mirrored here on 2026-09-03. It had lived only in the database, which is how the fault below
-- survived unnoticed: nothing in the repo described what the safety net actually did.
--
-- WHAT WAS WRONG. The trigger tested
--
--     OLD.data is distinct from NEW.data
--
-- but stored
--
--     OLD.data - '_calendarCache'
--
-- so a save that changed nothing except that cache archived a snapshot byte-identical to the one
-- before it. Worse, every high-churn machine-written key had the same effect: _greetSync alone
-- accounted for 6 of one trader's 30 retained versions. With a 30-row cap, that history covered
-- SEVENTY SECONDS. When two real trades were lost on 3 Sept there was nothing to roll back to, and
-- recovery took direct surgery across three ledgers, a server-side consumed flag and a trigger that
-- silently reverts it.
--
-- THE FIX. Compare exactly what gets stored, and strip the volatile keys from both sides. They
-- change constantly, are worthless in a restore, and each one left in spends a retention slot on a
-- duplicate. Retention also goes 30 -> 60: duplicates no longer eat slots, so the extra rows buy
-- real history rather than more copies of the same thing.
--
-- Deliberately NOT stripped: _newDayCleared. It is volatile but it records that a clear happened,
-- it only changes once a day, and it always moves alongside real content anyway.

create or replace function public.archive_journal_version()
returns trigger
language plpgsql
security definer
as $function$
declare
  old_keep jsonb;
  new_keep jsonb;
begin
  if TG_OP <> 'UPDATE' then
    return NEW;
  end if;

  -- Compare EXACTLY what gets stored. Testing the full blob while storing a stripped one is what
  -- archived byte-identical snapshots and flushed the useful history.
  old_keep := OLD.data - '_calendarCache' - '_greetSync' - '_aiSmartDay'
              - '_sessionAlertFired' - '_lastSessionStartAlert' - '_lastSessionEndAlert';
  new_keep := NEW.data - '_calendarCache' - '_greetSync' - '_aiSmartDay'
              - '_sessionAlertFired' - '_lastSessionStartAlert' - '_lastSessionEndAlert';

  if old_keep is distinct from new_keep then
    insert into public.journal_versions (user_id, data, trade_count)
    values (OLD.user_id, old_keep, public.st_trade_count(OLD.data));

    delete from public.journal_versions
    where id in (
      select id from public.journal_versions
      where user_id = OLD.user_id
      order by archived_at desc
      offset 60
    );
  end if;

  return NEW;
end;
$function$;

-- The trigger itself is unchanged and is NOT recreated here; only the function body is replaced:
--   create trigger archive_journal_version_trg
--     before update on public.journals
--     for each row execute function public.archive_journal_version();
