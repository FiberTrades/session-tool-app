# MT5 in the cloud

Session Terminal's own server runs members' MT5 terminals with the EA, day and night, so trading from the app, live
charts, alerts, nudges and the copier keep working with the member's computer off. Started 23 Oct 2026, in testing:
only the admin can add an account.

## The host

- Contabo Cloud VPS 6 (6 cores, 12 GB, UK), Ubuntu 24.04, `uk1`, 81.0.249.218. Root by SSH key only (`~/.ssh/st_cloud`).
- `setup-base.sh` (root, once): updates, key-only SSH, firewall (SSH only), automatic security updates, UTC clock,
  user `st` (runs the terminals, no sudo), Wine 10 stable and **Wine staging 11.20**, all held.
- `install-mt5.sh` (user `st`): the template prefix `/home/st/mt5-template` with MetaQuotes' MT5, Windows 11 mode.

**Why staging:** an MT5 update on 18 Oct 2026 makes the terminal report "A debugger has been found running in your
system" under Wine 9/10/11 stable. Wine staging in Windows 11 mode starts it (tested 23 Oct 2026). Mono and Gecko are
switched off (`WINEDLLOVERRIDES=mscoree,mshtml=`) because their installers open a dialog nobody can click.

## How an account runs

1. The member adds it in Settings > MT5 > MT5 in the cloud. The password is sealed in the browser with the host's
   public key (`cloud_hosts.public_key`, RSA-OAEP SHA-256) and stored as ciphertext in `cloud_mt5`
   (`supabase/cloud_mt5.sql`).
2. `agent/st_agent.py` (root, `st-agent.service`) asks the `cloud-agent` edge function every 10 s which accounts to
   run. The function checks the agent secret (`CLOUD_AGENT_KEY`) and returns the accounts with the member's sync token
   and time zone.
3. Per member: one Wine prefix (`/home/st/members/<user>`), so all their accounts share MT5's Common folder, where the
   EA's Lead/Follow copier files live. Per account: a portable MT5 (`C:\ST\<login>`), the EA
   (`/opt/st/ea/MinimalistManager.ex5`, Nestor's own build) and a preset with the token and App trading.
4. MT5 starts with a start file holding the login. That file is deleted once MT5 has signed in, or after 2 minutes.
   Each terminal runs in the member's time zone, because the EA's daily reset follows the machine's clock.
5. Status goes back to the card: starting, running (signed in), or error (with MT5's reason).
6. When the member removes the account, the terminal stops and its folder is deleted. A member with no accounts
   left loses their prefix too.

## Secrets (never in the repo)

- `/etc/st-agent/host_key.pem`: the host's private key. Root only.
- `/etc/st-agent/agent.key` and `config.json`: the agent secret. It is also the `CLOUD_AGENT_KEY` function secret.

## A new EA build

Nestor compiles it. It is copied to `/opt/st/ea/MinimalistManager.ex5` only with his OK, and the agent puts it into
each account at the next start.
