# MT5 in the cloud

Session Terminal's own server runs members' MT5 terminals with the EA, day and night, so trading from the app, live
charts, alerts, nudges and the copier keep working with the member's computer off. Started 23 Oct 2026; open to every
signed-in member since 24 Oct 2026 (a trial member 1 account, a paid member 5).

## The host

- Contabo Cloud VPS 6 (6 cores, 12 GB, UK), Ubuntu 24.04, `uk1`, 81.0.249.218. Root by SSH key only (`~/.ssh/st_cloud`).
- `setup-base.sh` (root, once): updates, key-only SSH, firewall (SSH only), automatic security updates, UTC clock,
  user `st` (runs the terminals, no sudo), Wine 10 stable and **Wine staging 11.20**, all held.
- `install-mt5.sh` (user `st`): the template prefix `/home/st/mt5-template` with MetaQuotes' MT5, Windows 11 mode.

**Why staging:** an MT5 update on 18 Oct 2026 makes the terminal report "A debugger has been found running in your
system" under Wine 9/10/11 stable. Wine staging in Windows 11 mode starts it (tested 23 Oct 2026). Mono and Gecko are
switched off (`WINEDLLOVERRIDES=mscoree,mshtml=`) because their installers open a dialog nobody can click.

**Once per host, by hand (23 Oct 2026):** MT5 only takes the EA's two web addresses in its own encrypted form, so they
cannot be written into a file. Open one MT5 *without* a start file, then go to Tools > Options > Expert Advisors:
tick Allow algorithmic trading, untick the two "Disable ... when changed" boxes, tick Allow WebRequest, and add
https://figozyxoyobixadhqewr.supabase.co and https://live.sessionterminal.com. Close it, then copy its
`Config/common.ini` to `/opt/st/seed-common.ini` and into the template's MT5. A fresh copy keeps all of it (checked).
To drive a terminal's screen, use `stx <login> <xdotool args>`; `stx <login> shot f.png` takes a screenshot.

Each terminal's screen also runs openbox (`agent/run-in-x.sh`). Without a window manager, windows can't be focused
and menus draw black. Wine's virtual desktop (set in `install-mt5.sh`) draws MT5's layered dialogs.

**Brokers (25 Oct 2026):** MT5 finds a server only through its `Config/servers.dat`. With FTMO's list alone an
ICMarketsSC-Demo account never even tried to connect (tested on uk1). `/opt/st/servers-all.dat` holds FTMO's servers plus
those of IC Markets, Pepperstone, Exness, XM, Vantage, FP Markets, Tickmill, Eightcap, RoboForex, Admirals, Blueberry,
Fusion, Darwinex, OANDA, FundedNext, The5ers, Funding Pips, E8, Alpha Capital, Blue Guardian and FXIFY, demo and live.
The agent copies it into every NEW account; an account already running keeps its own list. `/opt/st/servers-ftmo.dat` is
the first seed, kept as the backup. To add a firm: put its MT5 company name in `cloud/seed/brokers.txt` and run
`bash cloud/seed-servers.sh` (a throwaway MT5 on uk1 searches each name in File > Open an Account; no account, no login).

## How an account runs

1. The member adds it in Settings > MT5 > MT5 in the cloud. The password is sealed in the browser with the host's
   public key (`cloud_hosts.public_key`, RSA-OAEP SHA-256) and stored as ciphertext in `cloud_mt5`
   (`supabase/cloud_mt5.sql`).
2. `agent/st_agent.py` (root, `st-agent.service`) asks the `cloud-agent` edge function every 10 s which accounts to
   run. The function checks the agent secret (`CLOUD_AGENT_KEY`) and returns the accounts with the member's sync token
   and time zone. If a terminal is still running from before an agent restart, the agent adopts it rather than
   starting a second one.
3. Per account: its own Wine prefix (`/home/st/members/<user>.<login>`) with a portable MT5 (`C:\ST\<login>`), the EA
   (`/opt/st/ea/MinimalistManager.ex5`, Nestor's own build) and a preset with the token and App trading. Two MT5s
   in one prefix share its virtual desktop, which lives on the first one's screen, so the second died at start with
   an X `BadWindow` error (23 Oct 2026). A member's accounts share MT5's Common folder, where the EA's Lead/Follow
   copier files live: `/home/st/members/<user>.common`, linked into each prefix.
4. MT5 starts with a start file holding the login. That file is deleted once MT5 has signed in, or after 2 minutes.
   Each terminal runs in the member's time zone, because the EA's daily reset follows the machine's clock.
5. **One chart per symbol.** Before each start the agent writes MT5's chart set `STCloud`: one M15 chart for every
   symbol the account's EA reported from in the last 30 days, plus any in `/etc/st-agent/extra-symbols.json`. Each chart
   carries the EA with that symbol's own settings. MT5 opens the set through `ProfileLast` in the start file. Charts
   opened by a start file's `[StartUp]` were saved and piled up, one more per restart.
6. Status goes back to the card: starting, running (signed in), or error (with MT5's reason).
7. When the member removes the account, the terminal stops and its prefix is deleted. A member with no accounts
   left loses their Common folder too.

## Secrets (never in the repo)

- `/etc/st-agent/host_key.pem`: the host's private key. Root only.
- `/etc/st-agent/agent.key` and `config.json`: the agent secret. It is also the `CLOUD_AGENT_KEY` function secret.

## A new EA build

Nestor compiles it. It is copied to `/opt/st/ea/MinimalistManager.ex5` only with his OK, and the agent puts it into
each account at the next start.

## The live relay (since 23 Oct 2026)

`relay/server.py` runs here too, as `st-relay` (`cloud/relay/st-relay.service`: 127.0.0.1:8080, DynamicUser) behind Caddy
(`cloud/relay/Caddyfile`), which holds the `live.sessionterminal.com` certificate (Let's Encrypt, renewed by Caddy).
DNS: GoDaddy A record `live` -> 81.0.249.218 (was a CNAME to Railway). The firewall allows 80/443 for Caddy only.
`/etc/hosts` maps `live.sessionterminal.com` to 127.0.0.1, so the cloud MT5s reach the relay on the same machine whatever
an outside resolver still caches. Health: `https://live.sessionterminal.com/health` (rooms, conns, msgs, up_s).

## More servers (24 Oct 2026)

- **Room:** each server has `cloud_hosts.capacity` places (~650 MB per MT5 + EA, 1.5 GB kept for the system: 15 on a 12 GB
  server). A new account goes to the active server with the most free places (`st_cloud_pick_host`, asked by the app at
  the moment the account is added; a server that filled meanwhile makes it ask once more).
- **The alarm:** when all active servers together are 80% full, the admin's phone hears it once ("time to add a server"),
  and again when they are full (members then see "the cloud is full"). nudge-cron's `fleetWatch`, through
  `st_cloud_watch_due()` and `cloud_alerts`; the level told resets quietly 10 points lower.
- **A new server:** buy it (Contabo Cloud VPS 6, Ubuntu 24.04, UK) with the st_cloud SSH key for root, then from the repo:
  `bash cloud/new-host.sh <ip> <host-id> "<region>"` (e.g. `uk2`). It sets the server up, copies uk1's MT5 template and
  settings server to server, makes the server's own key pair and starts the agent, which registers the server itself
  (cloud-agent `hello`). About 15-20 minutes. The relay stays on uk1 (`live.sessionterminal.com`); the new server's MT5s
  reach it over the internet.
- **The agent cleans up after itself:** stopping an MT5 ends its whole process group (screen, window manager and all), a
  removed account's Wine is ended with `wineserver -k`, and any screen left without its terminal for 5 minutes is closed.
