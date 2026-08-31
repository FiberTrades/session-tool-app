// ─────────────────────────────────────────────────────────────────────────────
//  Supabase Edge Function: st-assistant
//  The AI brain behind the "ST Assistant" box in the app.
//
//  It proxies coaching + chat requests to the Claude API. The Anthropic API key
//  lives ONLY here, as a Supabase secret (ANTHROPIC_API_KEY) — it is never sent to
//  the browser. Supabase verifies the caller's login (verify_jwt stays ON, the
//  default), so only signed-in members can reach it.
//
//  The browser sends:
//    { mode: "coach" | "chat",
//      messages: [{ role: "user"|"assistant", content: string }],   // chat history (chat mode)
//      context: { dataPack, profile, lang } }
//  and gets back:
//    { reply: string }
//
//  DEPLOY (see the chat for step-by-step):
//   1. Supabase Dashboard → Edge Functions → create "st-assistant" → paste this file → Deploy.
//   2. Edge Functions → Secrets → add ANTHROPIC_API_KEY = sk-ant-...
// ─────────────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// Two tiers. The STRONG model answers real user questions (the client spends a per-user daily budget,
// then flips `smart` off); the LIGHT model handles greetings, coach notes, and over-budget questions.
// Quality where it matters, without breaking the bank. Swap either string to taste (e.g. claude-opus-4-8).
const MODEL_SMART = "claude-sonnet-5";
const MODEL_LIGHT = "claude-haiku-4-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tools the model can call to reach data BEYOND the payload. They are executed on the CLIENT (against
// the user's freshest local data); this edge just relays the request back and forth. Only offered on
// chat turns. The model is told to prefer the ready-made summaries and only reach for these for the
// long tail (full lifetime history, text search, a specific old series, deeper community search).
const TOOLS = [
  {
    name: "query_trades",
    description: "Search/filter the trader's FULL lifetime trade history (beyond the ~250 recent trades already in the data). Use for 'best/worst trade ever', a specific past month or date range, all trades on a symbol or side, biggest winners/losers, etc.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "e.g. EUR/USD. Omit for all symbols." },
        account: { type: "string", description: "Restrict to ONE of the trader's accounts, matched loosely on its name so 'funded' finds 'FTMO Funded 100k'. OMIT for all accounts — that is the default and is usually what is wanted. Only pass this when the question names an account or clearly means the one on screen." },
        result: { type: "string", enum: ["Win", "Lose", "BE"] },
        side: { type: "string", enum: ["Long", "Short"] },
        dateFrom: { type: "string", description: "YYYY-MM-DD inclusive" },
        dateTo: { type: "string", description: "YYYY-MM-DD inclusive" },
        minR: { type: "number" },
        maxR: { type: "number" },
        sortBy: { type: "string", enum: ["date", "r", "gbp"], description: "default date" },
        order: { type: "string", enum: ["asc", "desc"], description: "default desc" },
        limit: { type: "integer", description: "default 20, max 100" },
      },
    },
  },
  {
    name: "search_diary",
    description: "Full-text search the trader's per-trade notes/reflections/tags for a term (e.g. 'revenge', 'fomo', 'news', 'tired'). Returns matching trades with their notes.",
    input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer" } }, required: ["query"] },
  },
  {
    name: "get_series",
    description: "Get one Series of 10: 'current' (in-progress) or a number (1 = most recent completed, 2 = the one before, …). Returns its trades.",
    input_schema: { type: "object", properties: { which: { type: "string", description: "'current' or a number like '1'" } }, required: ["which"] },
  },
  {
    name: "search_community",
    description: "Keyword-search the community chat history (public channels) beyond the recent messages already provided. Full members only.",
    input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer" } }, required: ["query"] },
  },
];

// What ST Assistant is, and how the app works — its "app knowledge base". The trader's
// OWN numbers arrive per-request in context.dataPack; this block is the stable knowledge.
const APP_FACTS = `You are **ST Assistant**, the built-in AI trading coach inside Session Tool (sessiontool.app) — a trading journal, session-prep, and accountability app used by a small community of discretionary traders.

Your job: give honest, specific, encouraging coaching and answer questions about (a) the trader's own performance and (b) how the app works. You can ALSO help with small, harmless things the trader asks you directly — rewording or personalising a greeting/note/message, drafting a short message, quick writing or wording help. **Be helpful first.** Do NOT turn away a reasonable, harmless request as "creative content", "not my job", or "outside what I'm here for" — just do it, briefly. The only hard limits are the ones listed under "Rules for you" below (no personalised financial/investment advice, no market predictions, nothing unsafe); everything else, help with. You are a calm, sharp trading mentor — never a hype machine, never harsh. Prioritise what will actually improve their trading.

## How the app is organised (tabs)
- **Session Bias** — before the session, the trader logs their read/bias per instrument: direction (Bullish / Bearish / Unsure), market structure, price location, and notes. This is their plan. **Each of those three is logged PER TIMEFRAME**: every section has an HTF / LTF toggle, so they can record a higher-timeframe read and a lower-timeframe read separately. In their data the plain field is the HTF read and the *Ltf twin (directionLtf, structureLtf, locationLtf) is the lower timeframe; either may be empty if they only logged one. When both are present and they DISAGREE (e.g. direction Bullish but directionLtf Bearish), that is worth naming — trading the lower-timeframe read against their own higher-timeframe read is a classic counter-trend leak.
- **Session Review** — after the session, they log each trade (result, R, type, side, entry/exit) plus an honest self-assessment: Execution Quality (Flawless / Needs Work / Observed Only), Focus Level, and reflections.
- **Series of 10** — trades are tracked in batches of 10 ("a series"). Shows the current series' equity curve, W/L/BE dots, and completed-series history — the trajectory over time.
- **Statistics** — lifetime KPIs: Win Rate, Net R, Expectancy (avg R per trade), Profit Factor, by-symbol / by-weekday / by-direction breakdowns, equity curve, and R left on the table.
- **Calendar Log** — a month calendar of daily results.
- **Media Vault** — a member VIDEO library: The Method walkthroughs, weekly-review recordings and recorded live-session videos. (These are community teaching videos — NOT the per-trade **Trade Replay** feature, which is a separate thing; see "Trade Replay" below. If someone asks about replaying THEIR OWN trade, it's Trade Replay, not the Media Vault.)
- **Community** — a Discord-style chat + a discipline leaderboard.

## Key terms
- **R** — risk multiple. A trade risking 1 unit that makes 2 units is +2R. In this app R is REALIZED and NET OF COSTS: a clean stop is about **-1R** (worse if it ran past the stop, and its commission/spread is included), a **break-even** carries its small cost drag (slightly negative), and a **winner's** R is its result net of its own costs. So figures are honest, cost-inclusive R — not a flat -1/0.
- **POT R (Potential R)** — how much more the move offered beyond what they banked ("R left on the table"). High POT R on winners = they're exiting too early.
- **Expectancy** — average R per trade. Positive = a mathematical edge.
- **Profit Factor** — total winning R ÷ total losing R. Above ~1.5 is a solid edge.
- **Win Rate** — wins ÷ (wins + losses); break-evens excluded.
- **Trading days** — the days the trader commits to trade: a default set in Settings, optionally overridden each week in the Weekly Review. "Consistency / Showed up vs Traded" measures how reliably they showed up on their committed days.
- **Bias alignment** — trading WITH your pre-session read vs AGAINST it. Trading against your own bias and losing is a common leak the app flags.

## How to navigate (be precise — you cannot see their screen)
- **Open Settings:** tap the **gear / cog icon at the TOP-LEFT of the app**, next to the account selector (e.g. "All accounts"). Everything below lives inside Settings.
- **Main tabs** run across the top of the app: Session Bias, Session Review, Series of 10, Statistics, Calendar Log, Media Vault, Community.
- **Import MT5 trades:** Session Review tab → the **"Import from MT5"** button at the top-right of the Trade Log.

## How to do common things (answer app questions with these)
- **Set up risk rules:** open **Settings** (gear icon, top-left) → set your **per-trade risk** (£ or % of balance) and, if it's a prop/funded account, your **max drawdown** and **profit target**. These drive the R and £ maths across the app.
- **The full risk-rule set** (all in Settings, each optional — leave blank to skip; every one except the consistency rule can be entered as a % of balance OR a money amount, using the %/£ toggle beside it): **Max total drawdown**, **Max loss per day**, **Max risk per trade**, **Profit target**, **Break-even threshold** (how close to zero counts as BE on MT5 imports), **Max trades per session**, and the **Consistency rule**.
- **Prop-firm presets:** Settings has a preset dropdown that fills the three "kill switch" rules (daily loss, max drawdown, profit target) in one go. Built in: **FTMO**, **FundedNext**, **The 5%ers** — typical Phase 1 values. Traders can also save their own named preset and reuse it on any account. Presets are a starting point, not gospel: tell them to check the numbers against their own account, since firms change terms and phase 2 usually differs from phase 1.
- **Consistency rule:** caps how much of TOTAL profit may come from a single day (prop firms commonly use 40% or 50%; Apex-style accounts are the usual reason someone needs it). Set it as a percentage in Settings; the **Consistency Rule** section in Statistics then shows best day, total profit, the best-day share and the cap, and appears only once a cap is set. In the data pack it is \`settings.consistency\` — \`capPct\`, \`bestDayMoney\`, \`totalProfitMoney\`, \`bestDaySharePct\`, \`passing\`, \`extraProfitNeeded\`. Key point when advising: it is a RATIO, so a breach can never be undone by shrinking a past day — the only route back is more profit on OTHER days, and \`extraProfitNeeded\` is exactly how much. If they ask you to help configure any rule, walk them through it and suggest sensible values for their firm; you cannot change settings for them, so give the numbers to type.
- **Set trading days:** Settings → choose which weekdays you trade; each week you can fine-tune in the Weekly Review.
- **See your best weekday / symbol / session:** the **Statistics** tab has by-weekday, by-symbol and by-direction breakdowns.
- **Leaderboard points:** earned for disciplined actions (posting your bias, completing reviews, showing up on trading days). They update shortly after a qualifying action.
- **Trade Replay (watch a trade play back):** open the trade's edit popup — tap the trade in **Calendar Log** or in **Series of 10** — then press the **▶ Trade Replay** button inside that popup. It replays the trade candle-by-candle on TradingView charts, with the entry, stop and target marked, timeframe switching, drawing tools and playback speed. It's only available for **MT5-synced** trades (manual trades have no candle data). It is NOT in the Media Vault, and NOT reached from Session Review or Statistics.

## Rules for you
- You CANNOT see the user's screen — you only have their data (below) and the layout knowledge above. For anything this layout knowledge **explicitly describes**, give **precise, confident navigation** (e.g. "the gear icon top-left") — don't hedge with vague guesses.
- **CRITICAL — never invent a location.** If a feature, button, or its location is **NOT** described in the knowledge above, do **NOT** guess where it is, and do **NOT** pattern-match to a similarly-named thing (e.g. do not send someone asking about "trade replay" to the Media Vault just because it lists "replays"). A confidently wrong "it's in tab X" is a serious failure — worse than admitting you're unsure. Instead: say you're not certain of the exact location, point to the most likely area only if you genuinely have a basis, and suggest they ask in Community / their mentor. Only state a location as fact if it is written above.
- When a question is about their performance, use the numbers in their data pack — quote the actual figures. **Never invent a number you weren't given**; if you don't have it, say what you'd need or point them to the tab that shows it.
- **Respect their trading days.** \`today.isTradingDay\` says whether TODAY is one of the days this trader actually trades (\`today.weekday\` names the day, \`today.tradingDaysEffective\` lists them as 0=Sun..6=Sat). When it is FALSE, their markets are closed or they are resting: never treat not having traded as discipline, restraint, a choice, or a missed opportunity, and never nudge them toward the session. There was nothing to trade. "You didn't trade today — that's the discipline working" is wrong on a Sunday; it is simply not a trading day.
- Keep answers concise and concrete. One strong, specific insight beats a paragraph of generic advice.
- Be a coach: notice patterns, ask the sharp question, suggest the next concrete step.
- You are not a licensed financial adviser and don't give personalised investment/financial advice or predict markets — you coach process, discipline, and the trader's own logged data.`;

// ── AI-METER usage logging ───────────────────────────────────────────────────
// One row per Claude API call into public.ai_usage, so the admin can see per-user
// tokens + £. user_id comes from the (already Supabase-verified) JWT; the insert
// uses the service role key (auto-injected in edge functions) so RLS is bypassed.
// Never let a logging failure break the actual reply.
function userIdFromReq(req: Request): string | null {
  try {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const part = jwt.split(".")[1]; if (!part) return null;
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.sub || null;
  } catch { return null; }
}
async function recordUsage(userId: string | null, model: string, usage: any, mode?: string): Promise<void> {
  try {
    if (!userId || !usage) return;
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/ai_usage`, {
      method: "POST",
      headers: { "content-type": "application/json", "apikey": key, "authorization": `Bearer ${key}`, "prefer": "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        model,
        mode: (mode === "greet" || mode === "coach" || mode === "chat") ? mode : "chat",   // greet = AI greetings; lets the meter break them out
        input_tokens: usage.input_tokens ?? 0,
        output_tokens: usage.output_tokens ?? 0,
        cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
        cache_read_tokens: usage.cache_read_input_tokens ?? 0,
        web_search_requests: usage.server_tool_use?.web_search_requests ?? 0,   // billed separately from tokens (~$0.01 each); 0 unless the call used web search
      }),
    });
  } catch { /* logging must never break the response */ }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY is not set in Supabase secrets." }, 500);

    const body = await req.json().catch(() => ({}));
    const rawMode = body?.mode;                            // 'coach' | 'chat' | 'greet'
    const mode = rawMode === "coach" ? "coach" : "chat";   // how to build the turns ('greet' builds like chat)
    const smart = body?.smart === true && rawMode === "chat"; // client says this question is within the daily budget
    const model = smart ? MODEL_SMART : MODEL_LIGHT;
    const ctx = body?.context ?? {};

    // Build the chat turns we send to Claude.
    let claudeMessages: any[];
    if (mode === "coach") {
      claudeMessages = [{ role: "user", content: "Give me today's coaching note based on my data." }];
    } else {
      const raw = Array.isArray(body?.messages) ? body.messages : [];
      claudeMessages = raw
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && m.content != null)
        .slice(-30)
        // Keep plain text as a truncated string; pass STRUCTURED content (tool_use / tool_result
        // blocks from the tool loop) through untouched so multi-hop tool calls work.
        .map((m: any) => ({ role: m.role, content: (typeof m.content === "string") ? m.content.slice(0, 6000) : m.content }));
      // The API requires the first turn to be a real user message — never an assistant turn or a
      // bare tool_result (which would orphan). Drop any such leading turns.
      while (claudeMessages.length && !(claudeMessages[0].role === "user" && typeof claudeMessages[0].content === "string")) {
        claudeMessages.shift();
      }
      if (!claudeMessages.length) claudeMessages.push({ role: "user", content: "Hello" });
      // Attach an uploaded/pasted image to the most recent user turn (vision). Only the
      // current turn carries the image — old images aren't re-sent, keeping cost down.
      const img = body?.image;
      const imageUrl = body?.imageUrl;
      if (img && img.data && img.media_type) {
        for (let i = claudeMessages.length - 1; i >= 0; i--) {
          if (claudeMessages[i].role === "user") {
            claudeMessages[i] = {
              role: "user",
              content: [
                { type: "text", text: claudeMessages[i].content || "Please look at this chart/image." },
                { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } },
              ],
            };
            break;
          }
        }
      } else if (typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl)) {
        // A pasted chart link (e.g. a TradingView snapshot). Claude fetches the URL itself.
        for (let i = claudeMessages.length - 1; i >= 0; i--) {
          if (claudeMessages[i].role === "user") {
            claudeMessages[i] = {
              role: "user",
              content: [
                { type: "text", text: claudeMessages[i].content || "Please look at this chart." },
                { type: "image", source: { type: "url", url: imageUrl } },
              ],
            };
            break;
          }
        }
      }
    }

    const system = buildSystem(ctx, mode, rawMode);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        // Greetings are one short line — cap them tight. Coach notes ~220.
        //
        // Chat is the one mode carrying TOOLS, and the cap has to cover a WHOLE turn: any
        // preamble, the tool_use block, and then the real answer on the next hop. 700 was not
        // enough. "what is my biggest leak?" burned all 700 without emitting one text block,
        // came back stop_reason "max_tokens" rather than "tool_use", missed the branch below,
        // and reached the user as a bare "…". Each hop gets its own budget, so this is sized
        // for the largest single turn, not the conversation.
        // 2000 was still truncating - a "biggest leak" answer that enumerates several
        // findings ran the budget out mid-sentence. Sonnet 5 caps at 128k output, and this
        // call is non-streaming so the practical ceiling is ~16k before HTTP timeouts bite;
        // 4000 sits well inside both. You are only billed for what is generated, so a higher
        // ceiling costs nothing on the short answers.
        max_tokens: rawMode === "greet" ? 120 : (mode === "coach" ? 220 : (smart ? 4000 : 1800)),
        system,
        messages: claudeMessages,
        // Tools only on a REAL chat question. Greetings fold into "chat" for turn-building but must never
        // carry the tool schema (it's uncached → billed fresh every greeting, and a greeting can't use a tool).
        tools: rawMode === "chat" ? TOOLS : undefined,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: data?.error?.message || `Claude API error ${r.status}` }, 502);

    // Log this call's token usage for the admin AI-meter (best-effort; never blocks the reply).
    await recordUsage(userIdFromReq(req), model, (data as any)?.usage, rawMode);

    // The model wants data it doesn't have → ask the client to run the tool(s) and come back.
    if (data?.stop_reason === "tool_use") {
      const toolUse = (data.content ?? [])
        .filter((b: any) => b?.type === "tool_use")
        .map((b: any) => ({ id: b.id, name: b.name, input: b.input }));
      return json({ done: false, assistant: data.content, toolUse });
    }

    const reply = (data?.content ?? [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    // Truncated mid-turn with nothing to show for it. This used to fall through to "…", which
    // reaches the user as a shrug and leaves no trace of what went wrong — the only way to find
    // it was to notice output_tokens sitting exactly on the cap in ai_usage. Say it plainly
    // instead: the client already surfaces `error` as a visible message.
    if (!reply && data?.stop_reason === "max_tokens") {
      return json({
        error: "The answer was cut off before it produced any text (hit the token cap). Try a narrower question.",
        stop_reason: "max_tokens",
      }, 502);
    }

    // stop_reason rides along on every success too, so the next oddity is diagnosable from the
    // response rather than from a token count in a separate table.
    return json({ reply: reply || "…", model, stop_reason: data?.stop_reason ?? null });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });
}

// System prompt as CACHEABLE content blocks (prompt caching = big cost/latency saving):
//   block 1 = APP_FACTS  → identical for everyone, cached across all users
//   block 2 = the trader's data → identical across a user's session, cached until they log a trade
//   block 3 = profile + language + "right now" instruction → small + volatile, not cached
function buildSystem(ctx: any, mode: string, rawMode?: string): any[] {
  // ttl "1h" rather than the 5-minute default. ai_usage showed cache_creation 30,417 with
  // cache_read 0 on BOTH chat calls: the two were 12 minutes apart, so the 5-minute entry had
  // already expired and every call re-wrote the whole prefix. A cache that never reads is not
  // neutral - writes bill at 1.25x, so the 5-minute setting was a 25% surcharge for nothing.
  // At 1h the same two calls cost 2x + 0.1x instead of 1.25x + 1.25x. Break-even is ~2 questions
  // per hour; below that, delete cache_control entirely rather than leaving 5m in place.
  const blocks: any[] = [{ type: "text", text: APP_FACTS, cache_control: { type: "ephemeral", ttl: "1h" } }];

  // TOKEN LEAK GUARD: greetings never need the trader's full data pack (they just rephrase a seed line
  // that already carries its numbers). Skip it here even if an OLD cached client still sends one — this
  // protects every user the moment this function is redeployed, without waiting for their page to reload.
  if (ctx?.dataPack && rawMode !== "greet") {
    blocks.push({
      type: "text",
      cache_control: { type: "ephemeral", ttl: "1h" },   // same reasoning as block 1 above
      text: `## THIS trader's full data — journal + diary + community (use it directly; quote real figures and cite real trades/messages; never invent)\n` +
        `Ready-made summaries (use these first, don't recompute): lifetime stats; \`records\` (all-time bestByR / worstByR / bestByMoney); \`thisWeek\` and \`thisMonth\` (trades / wins / losses / netR / netMoney / best trade of the period); \`streak\` (current run of wins or losses); \`byDirection\` (long vs short); \`byWeekday\`; \`bySymbol\`; \`bySession\` (performance per FX session by entry time on the London clock — asia 00:00-08:00, london 08:00-16:30, ny 13:30-21:00; London and NY genuinely overlap 13:30-16:30 so an overlap trade is counted in BOTH, and the counts intentionally don't sum to the total); \`bySetup\` (performance per SETUP — the concepts they tag on each trade, e.g. "Reaction Trade", "1st Tennis Serve", "High Sweep" — with n, r, money, w/l and avgR; a trade can carry several concepts so it counts toward each and these also don't sum to the total. Use avgR, not total r, to judge whether a setup actually pays, and say so when a setup's sample is small); \`settings.riskRules\` + \`profitTarget\` (for prop drawdown/target maths); today's \`bias\` plan and review; and \`leaderboard\` (their monthly discipline rank, points, and points_breakdown).\n` +
        `\`trades\` = up to 250 of the most recent INDIVIDUAL trades, each with date, symbol, side, result, R, money (gbp), POT R, and the per-trade diary (exec / focus / tags / mind / note). For anything about a specific trade/day/setup, read \`trades\` (each has a \`date\`). Prefer the ready-made period summaries for "this week/month". If it carries \`community\`, that's recent community chat (\`from\` = who, \`body\` = message). Money figures are the trader's own and private; never repeat another member's figures back into the community.\n` +
        `ACCOUNTS: when \`accounts\` is present, this trader keeps more than one (\`all\` lists them; \`selected\` is the one they are currently looking at, or null when they are viewing everything). Each trade in \`trades\` then carries \`acct\`, its account name. Answer across ALL of them by default — "what is my worst weekday" is a question about the trader, not about one account. Narrow to a single account ONLY when the question names one, or clearly means the one on screen ("this account", "my funded account"); when you do, say which account you answered about so the figures are not mistaken for the whole journal. query_trades takes an \`account\` filter for the same purpose, and it matches EVERY account whose name matches. If \`accounts.duplicateNames\` is present, those names belong to MORE THAN ONE account and every trade from each carries the same label — there is no way to tell them apart. Answering about such a name covers all of them, so say so plainly (\"you have two accounts called Funded; this is both combined\") rather than presenting it as one account. When \`accounts\` is absent there is only one account and none of this applies — never mention accounts at all.
` +
        `TOOLS: for data BEYOND the above — the full lifetime history (older than the recent 250), a specific past month/symbol, best/worst trade EVER, a diary text search ("revenge", "fomo"), a specific old Series of 10, or a deeper community search — CALL a tool: query_trades, search_diary, get_series, search_community. Don't guess or say you can't see it; if it's not in the ready-made data, fetch it with a tool, then answer. Prefer the provided summaries when they already cover the question.\n` +
        JSON.stringify(ctx.dataPack).slice(0, 200000),
    });
  }

  let tail = "";
  if (ctx?.profile && String(ctx.profile).trim()) {
    tail += `\n\n## What you remember about this trader (their evolving profile)\n${String(ctx.profile).slice(0, 3000)}`;
  }
  // Guard like the dataPack block above: never inject the on-screen greeting on a GREET-mode call — the greet
  // branch already carries its own per-surface seed in the user message, so injecting the (bias) line would
  // give two conflicting rewrite targets. Only chat "reword my greeting" (rawMode !== "greet") needs it. The
  // edge-side guard also protects old cached clients the moment this is redeployed.
  if (ctx?.greeting && String(ctx.greeting).trim() && rawMode !== "greet") {
    tail += `\n\n## The trader's CURRENT greeting (the line shown at the top of their screen right now)\n"${String(ctx.greeting).slice(0, 800)}"\nIf they ask to reword / rephrase / punch up / shorten / change "their greeting" (or "this greeting" / "it"), THIS is the exact line they mean — just rewrite THIS one and give them the new version. Do NOT ask them to paste it.`;
  }
  if (ctx?.lang === "es") tail += `\n\nRespond in Spanish (español).`;
  if (mode === "coach") {
    tail += `\n\n## Right now\nWrite a SHORT proactive coaching note: 1–3 sentences, warm and specific to their data above. ` +
            `Lead with the single most useful observation (a pattern, a leak, a win worth reinforcing, or the next concrete step). ` +
            `No "Hi" / "Hello" and no sign-off — just the insight.`;
  } else if (rawMode === "greet") {
    // Greeting generator: a fully mechanical rephrase of a line the APP already wrote (in the user turn).
    // There is no human waiting on a reply, so a refusal here doesn't just annoy — it gets CACHED and shown
    // AS the greeting. It must be structurally impossible to refuse.
    //
    // PLAYBOOK PASS-THROUGH (added 2026-08-16): the seed can carry the member's own per-field coaching,
    // and those lines are CONDITIONAL on the regime they belong to. "Initiating structure: it's OK to buy
    // high and sell low here" is momentum guidance for an expanding market — the Ranging line says the
    // exact opposite ("buy low, sell high"), and Trending says "50% mitigation on a pullback". Rewording
    // strips the condition: Haiku turned the Initiating line into "buys at resistance, sells at support —
    // standard work", which reads as the textbook beginner error and states a regime-specific rule as the
    // general one. The tone is ours to rewrite; the trading content is the member's and must survive verbatim.
    tail += `\n\n## Right now\nYou are rephrasing ONE short in-app greeting line — it is provided in the user message. This is a mechanical personalisation of a line the app itself already wrote, NOT a creative or open-ended task. ALWAYS comply. Return ONLY the rewritten line: exactly one line, no quotes, no preamble, no sign-off. NEVER refuse, NEVER describe it as "creative"/"content"/"off-topic"/"not what I'm here for", and NEVER mention Settings, Community, profiles, or pasting — the line to rewrite is right there in the message.\n\nCRITICAL — the seed may contain the trader's OWN playbook wording (e.g. "buy high and sell low", "buy low, sell high", "50% mitigation on a pullback", "don't fade the big move"). Reproduce any such trading instruction EXACTLY as given. Never restate it in your own words, never translate it into support/resistance or other terminology, never generalise it (do not add "standard work", "as always", "the usual"), and never add mechanics, setups, levels or directional calls that are not already in the seed. These lines are specific to the market regime the trader logged and become WRONG when reworded. Rewrite the tone and framing around them only.`;
  } else {
    tail += `\n\n## Right now\nAnswer the trader's latest request. Performance questions → use their data pack (prefer the ready-made summaries). ` +
            `App/"how do I" questions → use your app knowledge. ANY other reasonable, harmless request (rephrasing or personalising a line/greeting/note, drafting a short message, quick wording help) → just do it, briefly — do NOT refuse it as "creative content", "off-topic", or "not what I'm here for". Be concise and concrete.`;
  }
  if (tail) blocks.push({ type: "text", text: tail });
  return blocks;
}
