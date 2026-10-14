// ============================================================
//  Session Terminal : ea-version  (Supabase Edge Function)
//
//  The Minimalist Manager EA's version on the MQL5 Market, for the app's "a newer EA is ready" line
//  (14 Oct 2026). Nestor, after seeing that Trading Execution's EA updates itself: "yes do this one!!" -
//  members install the EA once and keep running that build, so features that need a newer one quietly
//  never reach them.
//
//  The Market page is the truth on purpose: Nestor runs his own builds before MQL5 has approved them, so
//  "the newest version anyone runs" would tell members to fetch something they cannot download yet.
//
//  The answer is kept in worker_cache (key "ea:market") and the page is read again at most every 6 hours.
//  If MQL5 cannot be read, the last good answer is returned (stale: true); with none, version is null and
//  the app shows nothing. Public information, so no sign-in: deploy with "Verify JWT" OFF.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const PRODUCT = "https://www.mql5.com/en/market/product/180026";
const KEY = "ea:market";
const FRESH_MS = 6 * 3600 * 1000;

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });

// "Current version: <span ...>8.94</span>" and "Version:</span> 8.94" - both on the product page; the two
// must agree when both are there, so a page redesign that moves one of them cannot give a wrong number.
export function parseVersion(html: string): string | null {
  const a = html.match(/Current version:\s*<span[^>]*>\s*([0-9]+(?:\.[0-9]+)+)\s*</i);
  const b = html.match(/>\s*Version:\s*<\/span>\s*([0-9]+(?:\.[0-9]+)+)/i);
  const va = a ? a[1] : null, vb = b ? b[1] : null;
  if (va && vb && va !== vb) return null;
  return va || vb;
}

async function readMarket(): Promise<string | null> {
  try {
    const r = await fetch(PRODUCT, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SessionTerminal/1.0; +https://sessionterminal.com)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return parseVersion(await r.text());
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { data: row } = await admin.from("worker_cache").select("value, updated_at").eq("key", KEY).maybeSingle();
  const cached = (row && row.value && typeof row.value.version === "string") ? row.value : null;
  const age = row ? Date.now() - Date.parse(String(row.updated_at)) : Infinity;
  if (cached && age < FRESH_MS) return json({ version: cached.version, url: PRODUCT, checked_at: row!.updated_at });

  const version = await readMarket();
  if (version) {
    const now = new Date().toISOString();
    await admin.from("worker_cache").upsert({ key: KEY, value: { version }, updated_at: now }, { onConflict: "key" });
    return json({ version, url: PRODUCT, checked_at: now });
  }
  if (cached) return json({ version: cached.version, url: PRODUCT, checked_at: row!.updated_at, stale: true });
  return json({ version: null, url: PRODUCT });
});
