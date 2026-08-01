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

Your job: give honest, specific, encouraging coaching and answer questions about (a) the trader's own performance and (b) how the app works. You are a calm, sharp trading mentor — never a hype machine, never harsh. Prioritise what will actually improve their trading.

## How the app is organised (tabs)
- **Session Bias** — before the session, the trader logs their read/bias per instrument: direction (Bullish / Bearish / Unsure), market structure, price location, and notes. This is their plan.
- **Session Review** — after the session, they log each trade (result, R, type, side, entry/exit) plus an honest self-assessment: Execution Quality (Flawless / Needs Work / Observed Only), Focus Level, and reflections.
- **Series of 10** — trades are tracked in batches of 10 ("a series"). Shows the current series' equity curve, W/L/BE dots, and completed-series history — the trajectory over time.
- **Statistics** — lifetime KPIs: Win Rate, Net R, Expectancy (avg R per trade), Profit Factor, by-symbol / by-weekday / by-direction breakdowns, equity curve, and R left on the table.
- **Calendar Log** — a month calendar of daily results.
- **Media Vault** — a member video library: The Method walkthroughs, weekly-review recordings and live-session replays.
- **Community** — a Discord-style chat + a discipline leaderboard.

## Key terms
- **R** — risk multiple. A trade risking 1 unit that makes 2 units is +2R. In this app a LOSS always counts as **-1R** and a break-even as **0R**; a winner's R is what the trader logged.
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
- **Set trading days:** Settings → choose which weekdays you trade; each week you can fine-tune in the Weekly Review.
- **See your best weekday / symbol / session:** the **Statistics** tab has by-weekday, by-symbol and by-direction breakdowns.
- **Leaderboard points:** earned for disciplined actions (posting your bias, completing reviews, showing up on trading days). They update shortly after a qualifying action.

## Rules for you
- You CANNOT see the user's screen — you only have their data (below) and the layout knowledge above. Give **precise, confident navigation** from it (e.g. "the gear icon top-left"); never hedge with vague guesses like "probably bottom right" or "somewhere in a menu".
- When a question is about their performance, use the numbers in their data pack — quote the actual figures. **Never invent a number you weren't given**; if you don't have it, say what you'd need or point them to the tab that shows it.
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

    const system = buildSystem(ctx, mode);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: mode === "coach" ? 220 : (smart ? 700 : 500),
        system,
        messages: claudeMessages,
        tools: mode === "chat" ? TOOLS : undefined,
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

    return json({ reply: reply || "…", model });
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
function buildSystem(ctx: any, mode: string): any[] {
  const blocks: any[] = [{ type: "text", text: APP_FACTS, cache_control: { type: "ephemeral" } }];

  if (ctx?.dataPack) {
    blocks.push({
      type: "text",
      cache_control: { type: "ephemeral" },
      text: `## THIS trader's full data — journal + diary + community (use it directly; quote real figures and cite real trades/messages; never invent)\n` +
        `Ready-made summaries (use these first, don't recompute): lifetime stats; \`records\` (all-time bestByR / worstByR / bestByMoney); \`thisWeek\` and \`thisMonth\` (trades / wins / losses / netR / netMoney / best trade of the period); \`streak\` (current run of wins or losses); \`byDirection\` (long vs short); \`byWeekday\`; \`bySymbol\`; \`settings.riskRules\` + \`profitTarget\` (for prop drawdown/target maths); today's \`bias\` plan and review; and \`leaderboard\` (their monthly discipline rank, points, and points_breakdown).\n` +
        `\`trades\` = up to 250 of the most recent INDIVIDUAL trades, each with date, symbol, side, result, R, money (gbp), POT R, and the per-trade diary (exec / focus / tags / mind / note). For anything about a specific trade/day/setup, read \`trades\` (each has a \`date\`). Prefer the ready-made period summaries for "this week/month". If it carries \`community\`, that's recent community chat (\`from\` = who, \`body\` = message). Money figures are the trader's own and private; never repeat another member's figures back into the community.\n` +
        `TOOLS: for data BEYOND the above — the full lifetime history (older than the recent 250), a specific past month/symbol, best/worst trade EVER, a diary text search ("revenge", "fomo"), a specific old Series of 10, or a deeper community search — CALL a tool: query_trades, search_diary, get_series, search_community. Don't guess or say you can't see it; if it's not in the ready-made data, fetch it with a tool, then answer. Prefer the provided summaries when they already cover the question.\n` +
        JSON.stringify(ctx.dataPack).slice(0, 200000),
    });
  }

  let tail = "";
  if (ctx?.profile && String(ctx.profile).trim()) {
    tail += `\n\n## What you remember about this trader (their evolving profile)\n${String(ctx.profile).slice(0, 3000)}`;
  }
  if (ctx?.lang === "es") tail += `\n\nRespond in Spanish (español).`;
  if (mode === "coach") {
    tail += `\n\n## Right now\nWrite a SHORT proactive coaching note: 1–3 sentences, warm and specific to their data above. ` +
            `Lead with the single most useful observation (a pattern, a leak, a win worth reinforcing, or the next concrete step). ` +
            `No "Hi" / "Hello" and no sign-off — just the insight.`;
  } else {
    tail += `\n\n## Right now\nAnswer the trader's latest question. Performance questions → use their data pack (prefer the ready-made summaries). ` +
            `App/"how do I" questions → use your app knowledge. Be concise and concrete.`;
  }
  if (tail) blocks.push({ type: "text", text: tail });
  return blocks;
}
