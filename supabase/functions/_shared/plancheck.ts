// "Check my plan" (24 Oct 2026, Nestor approved it from the AO comparison: "An AI check of a trade against your plan, from the
// chart"). One chart picture + one of the member's setups (its Trade Setup rows) + today's Session Bias go to Claude, which marks
// each rule of the setup fits / no / unknown with one short line on why, citing a course lesson only where one truly covers it.
// st-assistant runs it (mode "plancheck"); it never places, changes or advises on a trade.

export type PlanItem = { rule: string; verdict: "fits" | "no" | "unknown"; why: string; lesson: string | null };
export type PlanResult = { items: PlanItem[]; summary: string };
export type PlanInput = {
  lang: "en" | "es";
  image: { media_type: string; data: string };
  plan: { name: string; desc?: string; rules: { label: string; text: string }[] };
  bias?: any[];
  lessons?: { id: string; title: string }[];
  chart?: { sym?: string; live?: boolean };
};

const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const IMG_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// the request as the app sends it, cleaned and capped; null when it cannot be checked
export function planInput(body: any, lang: "en" | "es"): PlanInput | null {
  const img = body?.image, p = body?.plan;
  if (!img || !IMG_TYPES.has(String(img.media_type)) || typeof img.data !== "string" || img.data.length < 100 || img.data.length > 4_800_000) return null;
  const rules = (Array.isArray(p?.rules) ? p.rules : []).map((r: any) => ({ label: clip(r?.label, 60), text: clip(r?.text, 200) }))
    .filter((r: any) => r.label && r.text).slice(0, 24);
  if (!rules.length) return null;
  const lessons = (Array.isArray(body?.lessons) ? body.lessons : []).map((l: any) => ({ id: clip(l?.id, 8), title: clip(l?.title, 90) }))
    .filter((l: any) => /^\d+\.\d+$/.test(l.id) && l.title).slice(0, 80);
  return {
    lang,
    image: { media_type: String(img.media_type), data: img.data },
    plan: { name: clip(p?.name, 80) || "Setup", desc: clip(p?.desc, 600), rules },
    bias: Array.isArray(body?.bias) ? body.bias.slice(0, 4) : [],
    lessons,
    chart: { sym: clip(body?.chart?.sym, 20), live: body?.chart?.live === true },
  };
}

export function planSystem(lang: "en" | "es"): string {
  return `You check ONE trading chart picture against the trader's OWN written setup, the way a careful mentor would.
You are given the setup's rules (each line is "Rule: what the setup wants"), the setup's own description, today's posted Session Bias for this chart (the trader's morning read: mode, structure, price location, direction, the rule of the week) and a list of the course's lessons.

For EVERY rule, look at the picture and decide:
- "fits": the picture clearly shows what the rule wants
- "no": the picture clearly shows something different
- "unknown": the picture cannot show it (a time that is not on the axis, a level nobody drew, anything the chart does not carry)
Only say "fits" or "no" when you could point at it in the picture. When in doubt, "unknown".
A rule with several parts (e.g. "below the swing low, 2-4 pips") fits only when EVERY part fits: if any part clearly does not, it is "no". Compare numbers exactly - 5 pips is outside 2-4.

"why": one short plain sentence, at most 18 words, about what the picture shows, e.g. "Price sits in the lower half of the drawn range." Describe the chart, never the trader; never accusing.
"lesson": the id of ONE listed lesson that teaches that rule, only when one truly does; otherwise null. Never invent an id.
"summary": one calm sentence that starts with what the picture supports, then what to look at before acting. Never say anything is "wrong".

Never predict where price will go, never say to buy or sell, never give financial advice. Never mention ICT or its terms, and do not bring in smart-money or liquidity jargon the trader did not use.
Write every "why" and the "summary" in ${lang === "es" ? "Spanish" : "English"}; keep each rule's label exactly as given.

Answer with ONLY this JSON, nothing before or after it:
{"items":[{"rule":"<label as given>","verdict":"fits|no|unknown","why":"...","lesson":"<id or null>"}],"summary":"..."}`;
}

export function planUserText(i: PlanInput): string {
  const b = (i.bias || []).map((x: any) => {
    const parts: string[] = [];
    if (x?.sym) parts.push(String(x.sym) + (x?.session ? ` (${clip(x.session, 30)} session)` : ""));
    if (x?.mode) parts.push(`mode ${x.mode}`);
    if (x?.direction) parts.push(`direction ${x.direction}${x.directionLtf ? ` (LTF ${x.directionLtf})` : ""}`);
    if (x?.structure) parts.push(`structure ${x.structure}${x.structureLtf ? ` (LTF ${x.structureLtf})` : ""}`);
    if (x?.location) parts.push(`price location ${x.location}${x.locationLtf ? ` (LTF ${x.locationLtf})` : ""}`);
    if (x?.sessionNews) parts.push(`news ${x.sessionNews}`);
    if (x?.notes) parts.push(`notes: ${clip(x.notes, 300)}`);
    if (x?.rule) parts.push(`the rule of the week: ${clip(x.rule, 200)}`);
    return "- " + parts.join(", ");
  }).filter((s: string) => s.length > 2);
  return [
    `Setup: ${i.plan.name}`,
    i.plan.desc ? `Its description: ${i.plan.desc}` : "",
    "Rules:",
    ...i.plan.rules.map((r) => `- ${r.label}: ${r.text}`),
    "",
    "Today's Session Bias:",
    ...(b.length ? b : ["- none logged today"]),
    "",
    `The chart: ${i.chart?.sym || "unknown symbol"}, ${i.chart?.live ? "live" : "replay"}.`,
    "",
    "Course lessons (id, title):",
    ...((i.lessons || []).length ? (i.lessons || []).map((l) => `${l.id} ${l.title}`) : ["(none)"]),
  ].filter((s) => s !== "").join("\n");
}

// the model's answer as the app shows it: one item per rule of the setup, in the setup's order
export function parsePlan(text: string, i: PlanInput): PlanResult | null {
  const a = text.indexOf("{"), z = text.lastIndexOf("}");
  if (a < 0 || z <= a) return null;
  let j: any;
  try { j = JSON.parse(text.slice(a, z + 1)); } catch { return null; }
  const got = Array.isArray(j?.items) ? j.items : [];
  const ids = new Set((i.lessons || []).map((l) => l.id));
  const norm = (v: unknown): PlanItem["verdict"] => {
    const s = String(v || "").toLowerCase();
    if (/^fit/.test(s) || s === "yes" || s === "encaja") return "fits";
    if (/^no|doesn|not fit|no encaja/.test(s)) return "no";
    return "unknown";
  };
  // matched by label (letters and digits only), else by position when the answer has one item per rule
  const key = (v: unknown) => String(v || "").toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, "");
  const items: PlanItem[] = i.plan.rules.map((r, n) => {
    const m = got.find((x: any) => key(x?.rule) === key(r.label)) || (got.length === i.plan.rules.length ? got[n] : null);
    if (!m) return { rule: r.label, verdict: "unknown", why: i.lang === "es" ? "La imagen no lo muestra." : "The picture does not show this.", lesson: null };
    const les = m.lesson == null ? null : String(m.lesson).trim();
    return { rule: r.label, verdict: norm(m.verdict), why: clip(m.why, 180), lesson: les && ids.has(les) ? les : null };
  });
  return { items, summary: clip(j?.summary, 300) };
}

// Thinking stays on (the model reads the chart before it answers) at the effort asked; the answer is short, so the cap leaves room
// for both. Sonnet 5.5 carries the API's default refusal fallback (another model answers if a safety check declines the request).
export async function runPlanCheck(apiKey: string, model: string, i: PlanInput, effort = "low"): Promise<{ result: PlanResult | null; usage: any; error?: string; text?: string }> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: Object.assign({ "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      /^claude-sonnet-5-5/.test(model) ? { "anthropic-beta": "server-side-fallback-2026-07-01" } : {}),
    body: JSON.stringify({
      model,
      ...(/^claude-sonnet-5-5/.test(model) ? { fallbacks: "default" } : {}),
      max_tokens: 6000,
      output_config: { effort },
      system: planSystem(i.lang),
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: i.image.media_type, data: i.image.data } },
          { type: "text", text: planUserText(i) },
        ],
      }],
    }),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) return { result: null, usage: data?.usage, error: data?.error?.message || `Claude API error ${r.status}` };
  if (data?.stop_reason === "refusal") return { result: null, usage: data?.usage, error: "refused" };
  const text = (data?.content || []).filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n");
  const result = parsePlan(text, i);
  return { result, usage: data?.usage, error: result ? undefined : "unreadable", text };
}
