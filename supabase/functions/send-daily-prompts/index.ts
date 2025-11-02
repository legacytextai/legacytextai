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

/** Determine if today is a handwritten prompt day for this user */
function isHandwrittenDay(userId: string, timezone: string): boolean {
  const localDateStr = new Date().toLocaleString("en-US", { timeZone: timezone });
  const localDate = new Date(localDateStr).toISOString().slice(0, 10);
  const seed = `${userId}-${localDate}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
  }
  return hash % 2 === 0; // even = handwritten, odd = AI
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

// Get rotated context: 2 recent + 1 older entry (14+ days)
async function getRotatedContext(userId: string, supabase: any): Promise<any[]> {
  try {
    // Get 2 most recent entries
    const { data: recentEntries } = await supabase
      .from('journal_entries')
      .select('content, category, received_at')
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(2);

    // Get 1 older entry (14+ days ago)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const { data: olderEntries } = await supabase
      .from('journal_entries')
      .select('content, category, received_at')
      .eq('user_id', userId)
      .lt('received_at', fourteenDaysAgo.toISOString())
      .order('received_at', { ascending: false })
      .limit(1);

    return [...(recentEntries || []), ...(olderEntries || [])];
  } catch (error) {
    console.error('Error getting rotated context:', error);
    return [];
  }
}

// Find the category with fewest entries for this user
async function getLeastUsedCategory(userId: string, supabase: any): Promise<string> {
  try {
    const { data: categoryCounts } = await supabase
      .from('journal_entries')
      .select('category')
      .eq('user_id', userId)
      .not('category', 'is', null);

    if (!categoryCounts || categoryCounts.length === 0) {
      return 'advice'; // Default for new users
    }

    // Count occurrences of each category
    const counts: Record<string, number> = {};
    const allCategories = ['advice', 'milestone', 'memory', 'values', 'hopes', 'family', 'spiritual'];
    
    // Initialize all categories with 0
    allCategories.forEach(cat => counts[cat] = 0);
    
    // Count actual entries
    categoryCounts.forEach(entry => {
      if (entry.category && allCategories.includes(entry.category)) {
        counts[entry.category]++;
      }
    });

    // Find category with minimum count
    let minCategory = 'advice';
    let minCount = counts['advice'];
    
    Object.entries(counts).forEach(([category, count]) => {
      if (count < minCount) {
        minCategory = category;
        minCount = count;
      }
    });

    return minCategory;
  } catch (error) {
    console.error('Error getting least used category:', error);
    return 'advice';
  }
}

// Pick archetype for today using stable rotation
function pickArchetypeForToday(userId: string): string {
  const archetypes = [
    'memory recall',
    'emotional storytelling', 
    'life advice',
    'future hopes',
    'encouragement',
    'family bonding',
    'spiritual reflections'
  ];

  // Use user ID and current date for stable daily rotation
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = `${userId}-${today}`;
  const hash = djb2(seed);
  
  return archetypes[hash % archetypes.length];
}

// Build system message for OpenAI
function buildSystemMessage(language: string, archetype: string, category: string, inspirationExamples: string): string {
  return `You are an empathetic writing assistant helping a father create a legacy journal for his children.

Your role:
- Write as if *you* were that father reflecting lovingly and authentically.
- Sound human, conversational, and emotionally grounded.
- Avoid robotic phrasing like "Describe...", "Write about...", or "Tell me about...".
- Start naturally with words like "What", "How", or "When" — but vary your approach.
- Keep within 160 characters for SMS delivery.
- Encourage honesty, vulnerability, and warmth.
- Focus: ${archetype} (archetype), ${category} (theme)
- Language: ${language}

${inspirationExamples}

Return only the prompt text — no explanations, no quotes, no preamble.`;
}

// Build user message with context
function buildUserMessage(user: any, contextEntries: any[], archetype: string, category: string): string {
  const childrenContext = user.children?.length > 0 
    ? `Children: ${user.children.map((c: any) => `${c.name || 'Child'} (age ${c.age || 'unknown'})`).join(', ')}`
    : 'Children: Not specified';

  const interestsContext = user.interests?.length > 0 
    ? `Interests: ${user.interests.join(', ')}`
    : 'Interests: General life experiences';

  const recentContext = contextEntries.length > 0
    ? `Recent entries: ${contextEntries.map(e => `"${e.content?.substring(0, 100)}..."`).join(', ')}`
    : 'Recent entries: None yet';

  return `Context:
${childrenContext}
${interestsContext}
${recentContext}

Create a ${archetype} prompt focusing on ${category} themes. Make it specific, engaging, and suitable for SMS delivery.`;
}

// Main hybrid prompt generation function
async function generateNextPrompt(user: any, supabase: any): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.log('No OpenAI API key found, using fallback');
    return '';
  }

  try {
    // Get rotated context
    const rotatedContext = await getRotatedContext(user.id, supabase);
    
    // Get least used category
    const targetCategory = await getLeastUsedCategory(user.id, supabase);
    
    // Pick archetype for today
    const archetype = pickArchetypeForToday(user.id);
    
    const language = user.preferred_language || 'en';
    
    console.log(`Generating prompt for user ${user.id}: archetype=${archetype}, category=${targetCategory}, context=${rotatedContext.length} entries`);

    // Sample multiple handwritten prompts for stylistic inspiration
    let inspirationSnippet = "";
    try {
      const { data: refs } = await supabase
        .from("prompts")
        .select("text")
        .eq("source_type", "handwritten")
        .eq("active", true)
        .order("id")
        .limit(30); // Larger pool for variety
      
      if (refs && refs.length > 0) {
        // Pick 3 diverse examples using stable randomization
        const seed = `${user.id}-inspiration-${new Date().toISOString().slice(0, 10)}`;
        const examples: string[] = [];
        
        for (let i = 0; i < Math.min(3, refs.length); i++) {
          const idx = djb2(`${seed}-${i}`) % refs.length;
          examples.push(`• "${refs[idx].text}"`);
        }
        
        inspirationSnippet = `\n\nHere are example prompts that capture the warm, human tone you should emulate:\n${examples.join('\n')}`;
      }
    } catch (err) {
      console.error('[Inspiration] Failed to fetch reference prompts:', err);
    }

    const response = await openaiGenerate({
      model: "gpt-4.1-mini-2025-04-14",
      messages: [
        { 
          role: "system", 
          content: buildSystemMessage(language, archetype, targetCategory, inspirationSnippet) 
        },
        { role: "user", content: buildUserMessage(user, rotatedContext, archetype, targetCategory) }
      ],
      max_tokens: 150
    });

    return response;
  } catch (error) {
    console.error('Error generating next prompt:', error);
    return '';
  }
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
    timezone?: string | null;
  };
  let users: U[] = [];

  if (toFilter) {
    const { data } = await supabase
      .from("users_app")
      .select("id, phone_e164, name, preferred_language, tone, interests, banned_topics, children, status, timezone")
      .eq("phone_e164", toFilter).limit(1);
    users = ((data ?? []) as U[]).filter(u => (u as any).status === "active");
  } else {
    const { data } = await supabase
      .from("users_app")
      .select("id, phone_e164, name, preferred_language, tone, interests, banned_topics, children, timezone")
      .eq("status", "active");
    users = (data ?? []) as U[];
  }

  /**
   * Determines if the user should receive a prompt at this hour
   * based on their timezone and day of week.
   * 
   * Weekdays (Mon-Fri): 7 PM (19:00)
   * Weekends (Sat-Sun): 8 AM (08:00)
   */
  function shouldSendPromptNow(user: U): { 
    send: boolean; 
    reason: string; 
    localTime: string;
    localDateStr: string;
  } {
    const tz = user.timezone || "America/Los_Angeles";
    
    try {
      // Get current time in user's timezone
      const localNowStr = new Date().toLocaleString("en-US", { timeZone: tz });
      const localNow = new Date(localNowStr);
      
      const hour = localNow.getHours();
      const day = localNow.getDay(); // 0=Sunday, 6=Saturday
      const isWeekend = (day === 0 || day === 6);
      const targetHour = isWeekend ? 8 : 19;
      
      const localTimeStr = localNow.toISOString();
      const localDateStr = localNow.toISOString().slice(0, 10);
      
      if (hour === targetHour) {
        return { 
          send: true, 
          reason: `Target hour (${targetHour}:00 ${isWeekend ? 'weekend' : 'weekday'})`,
          localTime: localTimeStr,
          localDateStr
        };
      } else {
        return { 
          send: false, 
          reason: `Not target hour (current: ${hour}:00, target: ${targetHour}:00 ${isWeekend ? 'weekend' : 'weekday'})`,
          localTime: localTimeStr,
          localDateStr
        };
      }
    } catch (error) {
      console.error(`[Timezone Error] Invalid timezone for user ${user.id}: ${tz}`, error);
      return { 
        send: false, 
        reason: `Invalid timezone: ${tz}`,
        localTime: "ERROR",
        localDateStr: "ERROR"
      };
    }
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
    // Timezone check: skip if not at target hour
    const timingCheck = shouldSendPromptNow(u);
    console.log(
      `[Timezone Check] User ${u.id} (${u.name || 'unnamed'}) ` +
      `TZ: ${u.timezone || 'America/Los_Angeles'} | ` +
      `${timingCheck.reason} | ` +
      `Local: ${timingCheck.localTime}`
    );
    
    if (!timingCheck.send) {
      continue; // Skip this user this hour
    }

    try {
       // One-per-day guard: use LOCAL day boundary (not UTC)
       if (!force) {
         const tz = u.timezone || "America/Los_Angeles";
         const localNowStr = new Date().toLocaleString("en-US", { timeZone: tz });
         const localNow = new Date(localNowStr);
         localNow.setHours(0, 0, 0, 0); // Start of local day
         const startLocalISO = localNow.toISOString();
         
         const { data: existing } = await supabase
           .from("daily_prompts")
           .select("id, source")
           .eq("user_id", u.id)
           .gte("sent_at", startLocalISO)
           .eq("source", "schedule")
           .limit(1);
         
         if (existing && existing.length) {
           console.log(`[Guard] User ${u.id} already received prompt today (local day)`);
           continue;
         }
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

      // --- HYBRID PROMPT SELECTION ---
      const tz = u.timezone || "America/Los_Angeles";
      const useHandwritten = isHandwrittenDay(u.id, tz);
      let promptText = (override || "").trim();
      let isAI = false;
      let model: string | null = null;
      let promptId: number | null = null;

      console.log(`[Hybrid Mode] User ${u.id}: ${useHandwritten ? 'Handwritten' : 'AI'} day`);

      if (!promptText) {
        // --- HANDWRITTEN DAY ---
        if (useHandwritten) {
          const { data: handwrittenPrompts } = await supabase
            .from("prompts")
            .select("id, text")
            .eq("source_type", "handwritten")
            .eq("active", true)
            .order("id")
            .limit(100); // Get pool of prompts
          
          if (handwrittenPrompts && handwrittenPrompts.length > 0) {
            // Pick one using stable randomization
            const seed = `${u.id}|${day}|handwritten`;
            const idx = djb2(seed) % handwrittenPrompts.length;
            const selected = handwrittenPrompts[idx];
            
            promptText = selected.text;
            promptId = selected.id;
            model = "handwritten";
            
            // Translate if needed
            if (language !== "en") {
              promptText = await translateIfNeeded(promptText, language);
            }
            
            // Banned topic guard
            if (containsBanned(promptText, banned)) {
              console.log(`[Handwritten] Prompt contained banned topic, falling back to AI`);
              promptText = ""; // Force AI fallback
            }
          } else {
            console.log(`[Handwritten] No handwritten prompts found, falling back to AI`);
          }
        }
        
        // --- AI DAY (or Handwritten Fallback) ---
        if (!promptText) {
          for (let attempt = 0; attempt < 3 && !promptText; attempt++) {
            try {
              const text = await generateNextPrompt(u, supabase);
              
              // Banned-topic guard
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
              
              promptText = text;
              isAI = true;
              model = "gpt-4.1-mini-2025-04-14";
            } catch (err) {
              console.error(`[AI Generation] Attempt ${attempt + 1} failed:`, err);
            }
          }
          
          // --- FINAL FALLBACK: Opposite Type ---
          if (!promptText) {
            if (useHandwritten) {
              // Was handwritten day, AI failed, skip
              console.log(`[Fallback] Both handwritten and AI failed for user ${u.id}`);
              continue;
            } else {
              // Was AI day, try handwritten as last resort
              const { data: fallbackPrompt } = await supabase
                .from("prompts")
                .select("id, text")
                .eq("source_type", "handwritten")
                .eq("active", true)
                .limit(1)
                .single();
              
              if (fallbackPrompt) {
                promptText = fallbackPrompt.text;
                promptId = fallbackPrompt.id;
                model = "handwritten";
                if (language !== "en") {
                  promptText = await translateIfNeeded(promptText, language);
                }
              } else {
                console.log(`[Fallback] No prompts available for user ${u.id}`);
                continue;
              }
            }
          }
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
        source: toFilter ? "manual" : (isAI ? "ai" : "handwritten"),
      });

      sent++;
      console.log(
        `✓ Sent to ${u.phone_e164} (${u.name || 'unnamed'}) ` +
        `at local ${u.timezone || 'America/Los_Angeles'} time`
      );
    } catch (_e) {
      errors++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, errors, prompt: usedPrompt }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});