// supabase/functions/send-daily-prompts/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function twilioSend(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const auth = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const svc  = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const from = Deno.env.get("TWILIO_FROM_NUMBER"); // optional fallback

  const params = new URLSearchParams(
    svc
      ? { MessagingServiceSid: svc, To: to, Body: body }
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
  return data; // includes .sid
}

serve(async (req) => {
  const url = new URL(req.url);
  const toFilter = url.searchParams.get("to");          // E.164 phone (e.g., +13235550123)
  const force     = url.searchParams.get("force") === "true";
  const override  = url.searchParams.get("prompt");     // optional prompt override

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Helper: start of current UTC day (for "one send per day" guard)
  const startUTC = new Date();
  startUTC.setUTCHours(0, 0, 0, 0);
  const startISO = startUTC.toISOString();

  // 1) Get intended recipients
  let users: Array<{ id: string; phone_e164: string }> = [];
  if (toFilter) {
    const { data } = await supabase
      .from("users_app")
      .select("id, phone_e164, status")
      .eq("phone_e164", toFilter)
      .limit(1);
    users = (data ?? []).filter((u: any) => u.status === "active");
  } else {
    const { data } = await supabase
      .from("users_app")
      .select("id, phone_e164")
      .eq("status", "active");
    users = (data ?? []) as any;
  }

  // 2) Choose prompt (override wins)
  let promptText = override || "";
  if (!promptText) {
    const { data: prompt } = await supabase
      .from("prompts")
      .select("id, text")
      .eq("active", true)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (!prompt) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, errors: 0, reason: "no_active_prompts" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    promptText = prompt.text;
  }

  let sent = 0, errors = 0;

  // 3) Send to each user
  for (const u of users) {
    try {
      if (!force) {
        // Skip if already sent today (UTC)
        const { data: existing } = await supabase
          .from("daily_prompts")
          .select("id")
          .eq("user_id", u.id)
          .gte("sent_at", startISO)
          .limit(1);
        if (existing && existing.length) continue;
      }

      const sms =
`Daily Prompt: ${promptText}

Reply to this text with your reflection. We'll save it to your Legacy Journal.
Reply STOP to unsubscribe.`;

      const tw = await twilioSend(u.phone_e164, sms);

      await supabase.from("messages").insert({
        direction: "out",
        phone_e164: u.phone_e164,
        body: sms,
        twilio_sid: tw.sid,
      });

      // We can save prompt_id if you prefer; for now only link to user/day
      await supabase.from("daily_prompts").insert({
        user_id: u.id
      });

      sent++;
    } catch (_e) {
      errors++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, errors, prompt: promptText }),
    { headers: { "Content-Type": "application/json" } }
  );
});