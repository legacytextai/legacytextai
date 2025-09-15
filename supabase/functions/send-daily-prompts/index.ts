// supabase/functions/send-daily-prompts/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Twilio sender */
async function twilioSend(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const auth = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const svc  = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const from = Deno.env.get("TWILIO_FROM_NUMBER"); // optional fallback for single-number send

  const params = new URLSearchParams(
    svc ? { MessagingServiceSid: svc, To: to, Body: body }
        : { From: from!, To: to, Body: body }
  );

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${sid}:${auth}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${JSON.stringify(data)}`);
  return data; // includes data.sid
}

/** Helpers */
function toHex(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hashPrompt(text: string) {
  const norm = text.trim().replace(/\s+/g, " ");
  const buf = new TextEncoder().encode(norm.toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return toHex(digest);
}
function containsBanned(text: string, banned: string[]): boolean {
  if (!banned?.length) return false;
  const t = text.toLowerCase();
  return banned.some(k => k && t.includes(k.toLowerCase()));
}

/** Stable hash for weighted tone picking */
function djb2(str: string) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0);
}
/** Stable weighted pick: same seed => same item */
function pickWeightedStable<T extends { key: string; weight: number }>(rows: T[], seed: string): T {
  const total = rows.reduce((acc, r) => acc + Math.max(1, r.weight || 1), 0);
  if (total <= 0) throw new Error("No positive weights");
  const r = djb2(seed) % total;
  let acc = 0;
  for (const row of rows) {
    acc += Math.max(1, row.weight || 1);
    if (r < acc) return row;
  }
  return rows[rows.length - 1];
}

/** OpenAI call */
async function openaiGenerate(input: any) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${JSON.stringify(data)}`);
  const text = (data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("No text from OpenAI");
  return text;
}

async function genPersonalizedPrompt(opts: {
  name: string | null;
  language: string;
  tone: string | null;                    // global tone key (e.g., 'warm')
  interests: string[];
  children: Array<{ name?: string; age?: number }>;
  recentThemes: string[];
  banned: string[];
}) {
  const { name, language, tone, interests, children, recentThemes, banned } = opts;

  const sys = [
    "You generate ONE short journaling prompt for a father.",
    "Constraints:",
    "• 1 sentence (2 max).",
    "• Warm, encouraging father-to-father tone (or obey provided tone).",
    "• No emojis. No hashtags.",
    "• Avoid topics listed as banned.",
    "• Personalize if helpful using provided context.",
    `• Write the prompt in language code: ${language || "en"}.`,
  ].join("\n");

  const kidLine = (children?.length ? children.map(c =>
    [c.name ? `name:${c.name}` : "", typeof c.age === "number" ? `age:${c.age}` : ""].filter(Boolean).join(" ")
  ).join("; ") : "(none)");

  const userMsg = [
    name ? `Dad's name: ${name}` : "Dad's name: (unknown)",
    tone ? `Preferred tone: ${tone}` : "Preferred tone: warm",
    interests?.length ? `Interests: ${interests.join(", ")}` : "Interests: (none)",
    `Children: ${kidLine}`,
    recentThemes?.length ? `Recent themes:\n— ${recentThemes.map(t => t.trim().slice(0, 160)).join("\n— ")}` : "Recent themes: (none)",
    banned?.length ? `Avoid topics: ${banned.join(", ")}` : "Avoid topics: (none)",
    "Now produce exactly ONE prompt, plain text only."
  ].join("\n\n");

  return await openaiGenerate({
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: userMsg },
    ],
    max_tokens: 150,
  });
}

/** Optional translate fallback for curated prompt */
async function translateIfNeeded(text: string, toLang: string) {
  if (!toLang || toLang.toLowerCase() === "en") return text;
  try {
    const translated = await openaiGenerate({
      model: "gpt-4.1-mini-2025-04-14",
      messages: [
        { role: "system", content: `You translate short sentences. Output only the translation in ${toLang}.` },
        { role: "user", content: text },
      ],
      max_tokens: 100,
    });
    return translated;
  } catch {
    return text; // if translation fails, keep original
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const url = new URL(req.url);
  const toFilter = url.searchParams.get("to");        // E.164 phone (test mode)
  const force     = url.searchParams.get("force") === "true";
  const override  = url.searchParams.get("prompt");   // manual override text

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Start of UTC day for 1/day guard
  const startUTC = new Date(); startUTC.setUTCHours(0,0,0,0);
  const startISO = startUTC.toISOString();

  // 0) Load active tones ONCE
  type ToneRow = { key: string; weight: number; active: boolean };
  const { data: toneRows } = await supabase
    .from("tones")
    .select("key, weight, active")
    .eq("active", true);
  const activeTones = (toneRows ?? []) as ToneRow[];

  // 1) Recipients
  type U = {
    id: string; phone_e164: string; name: string | null;
    preferred_language: string | null;
    tone?: string | null;                 // legacy fallback only
    interests: string[] | null;
    banned_topics: string[] | null;
    children: Array<{ name?: string; age?: number }> | null;
    status?: string;
  };
  let users: U[] = [];

  if (toFilter) {
    const { data } = await supabase
      .from("users_app")
      .select("id, phone_e164, name, preferred_language, tone, interests, banned_topics, children, status")
      .eq("phone_e164", toFilter).limit(1);
    users = ((data ?? []) as U[]).filter(u => (u as any).status === "active");
  } else {
    const { data } = await supabase
      .from("users_app")
      .select("id, phone_e164, name, preferred_language, tone, interests, banned_topics, children")
      .eq("status", "active");
    users = (data ?? []) as U[];
  }

  // 2) Curated fallback helper
  async function getFallbackPrompt() {
    const { data: p } = await supabase
      .from("prompts").select("id, text")
      .eq("active", true).order("id", { ascending: false }).limit(1).single();
    return p || null; // { id, text } or null
  }

  let sent = 0, errors = 0, usedPrompt = "";

  // 3) Loop recipients
  for (const u of users) {
    try {
      // One-per-day (unless forced)
      if (!force) {
        const { data: existing } = await supabase
          .from("daily_prompts")
          .select("id")
          .eq("user_id", u.id)
          .gte("sent_at", startISO)
          .limit(1);
        if (existing && existing.length) continue;
      }

      // Pick tone: global tones (weighted + stable per user/day). Fallback to legacy tone or 'warm'.
      const day = new Date().toISOString().slice(0, 10);
      let selectedTone: string | null = null;
      if (activeTones.length > 0) {
        selectedTone = pickWeightedStable(activeTones, `${u.id}|${day}|tones`).key;
      } else {
        selectedTone = (u.tone && u.tone.trim()) || "warm";
      }

      const language = (u.preferred_language || "en").toLowerCase();
      const interests = (u.interests || []) as string[];
      const banned    = (u.banned_topics || []) as string[];
      const children  = (u.children || []) as Array<{ name?: string; age?: number }>;

      let promptText = (override || "").trim();
      let isAI = false; let model: string | null = null; let promptId: number | null = null;

      if (!promptText) {
        // personalize using last 3 entries
        const { data: entries } = await supabase
          .from("journal_entries")
          .select("content")
          .eq("user_id", u.id)
          .order("received_at", { ascending: false })
          .limit(3);
        const recentThemes = (entries ?? []).map((e: any) => e.content);

        // Try AI up to 3 attempts with banned-topic + 90-day de-dupe
        for (let attempt = 0; attempt < 3 && !promptText; attempt++) {
          try {
            const text = await genPersonalizedPrompt({
              name: u.name ?? null,
              language, tone: selectedTone, interests, children,
              recentThemes, banned
            });

            // banned-topic guard
            if (containsBanned(text, banned)) continue;

            // 90-day de-dupe by hash
            const hash = await hashPrompt(text);
            const since = new Date(Date.now() - 90*24*3600*1000).toISOString();
            const { data: dup } = await supabase
              .from("daily_prompts")
              .select("id")
              .eq("user_id", u.id)
              .eq("prompt_hash", hash)
              .gte("sent_at", since)
              .limit(1);
            if (dup && dup.length) continue;

            promptText = text; isAI = true; model = "gpt-4.1-mini-2025-04-14";
          } catch { /* try again or fall through to fallback */ }
        }

        // Fallback to curated prompt (translate if needed)
        if (!promptText) {
          const p = await getFallbackPrompt();
          if (!p) continue;
          promptId = p.id as number;
          const maybeTranslated = await translateIfNeeded(p.text, language);
          // extra banned guard on translated text too
          if (containsBanned(maybeTranslated, banned)) continue;
          promptText = maybeTranslated;
        }
      }

      usedPrompt = promptText;

      // Compose & send SMS
      const sms =
`Daily Prompt: ${promptText}

Reply to this text with your reflection. We'll save it to your Legacy Journal.
Reply STOP to unsubscribe.`;

      const tw = await twilioSend(u.phone_e164, sms);

      // Log SMS
      await supabase.from("messages").insert({
        direction: "out",
        phone_e164: u.phone_e164,
        body: sms,
        twilio_sid: tw.sid,
      });

      // Record delivery
      const hash = await hashPrompt(promptText);
      await supabase.from("daily_prompts").insert({
        user_id: u.id,
        prompt_id: promptId ?? null,
        prompt_text: promptText,
        prompt_hash: hash,
        prompt_language: language,
        is_ai: isAI || Boolean(override),
        model,
        is_forced: force,
        source: toFilter ? "manual" : "schedule",
      });

      sent++;
    } catch (_e) {
      errors++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, errors, prompt: usedPrompt }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});