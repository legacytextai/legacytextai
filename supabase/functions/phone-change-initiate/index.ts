import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const E164 = /^\+[1-9]\d{7,14}$/;

function sixDigit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function sendSMS(to: string, body: string) {
  const sid  = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const auth = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const svc  = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
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
    body: params
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Twilio error: ${res.status} ${t}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const newPhone: string = (body.new_phone_e164 || "").trim();
    const resend: boolean = Boolean(body.resend);
    const auto: boolean = Boolean(body.auto);

    if (!E164.test(newPhone)) return new Response("Invalid E.164 phone", { status: 400, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Block if this phone belongs to another user
    const { data: exists } = await admin.from("users_app")
      .select("auth_user_id").eq("phone_e164", newPhone).limit(1);
    if (exists && exists.length && exists[0].auth_user_id !== user.id) {
      return new Response("Phone already in use", { status: 409, headers: corsHeaders });
    }

    const ttl = Number(Deno.env.get("OTP_TTL_SECONDS") ?? "600");       // default 10m
    const minResend = Number(Deno.env.get("OTP_MIN_RESEND_SECONDS") ?? "60"); // default 60s
    const pepper = Deno.env.get("OTP_PEPPER") ?? "";

    // Check for active OTP
    const { data: activeRows } = await admin.from("otp_codes")
      .select("id, code_hash, expires_at, last_sent_at, attempts")
      .eq("user_auth_id", user.id)
      .eq("new_phone_e164", newPhone)
      .gte("expires_at", new Date().toISOString())
      .limit(1);

    if (activeRows && activeRows.length) {
      const row = activeRows[0];

      // If this is an AUTO kickoff and an OTP is already active -> do not resend
      if (auto) {
        return new Response(JSON.stringify({ ok: true, sms: false, reason: "active_otp" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Manual resend path with cooldown
      if (resend) {
        const last = row.last_sent_at ? new Date(row.last_sent_at).getTime() : 0;
        if (Date.now() - last < minResend * 1000) {
          return new Response("Please wait before requesting another code", { status: 429, headers: corsHeaders });
        }
        const code = sixDigit();
        const codeHash = await sha256(`${code}:${pepper}`);
        const expires = new Date(Date.now() + ttl * 1000).toISOString();

        // Update code + timestamps
        await admin.from("otp_codes").update({
          code_hash: codeHash,
          expires_at: expires,
          last_sent_at: new Date().toISOString(),
          attempts: 0,
        }).eq("id", row.id);

        await sendSMS(newPhone, `Your Legacy Journal verification code is ${code}. It expires in ${Math.round(ttl/60)} minutes.`);

        console.log(`OTP resent to ${newPhone} for user ${user.id}`);

        return new Response(JSON.stringify({ ok: true, sms: true, reason: "resent" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Neither auto nor resend -> don't spam
      return new Response(JSON.stringify({ ok: true, sms: false, reason: "active_otp" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // No active OTP -> create and send
    const code = sixDigit();
    const codeHash = await sha256(`${code}:${pepper}`);
    const expires = new Date(Date.now() + ttl * 1000).toISOString();

    await admin.from("otp_codes").upsert({
      user_auth_id: user.id,
      new_phone_e164: newPhone,
      code_hash: codeHash,
      expires_at: expires,
      last_sent_at: new Date().toISOString(),
      attempts: 0,
    }, { onConflict: "user_auth_id, new_phone_e164" });

    await sendSMS(newPhone, `Your Legacy Journal verification code is ${code}. It expires in ${Math.round(ttl/60)} minutes.`);

    console.log(`OTP sent to ${newPhone} for user ${user.id}`);

    return new Response(JSON.stringify({ ok: true, sms: true, reason: "fresh" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error('Error in phone-change-initiate:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});