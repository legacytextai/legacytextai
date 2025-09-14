import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const E164 = /^\+[1-9]\d{7,14}$/; // simple E.164 check

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

    // Client for reading the caller (JWT)
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const newPhone: string = (body.new_phone_e164 || "").trim();

    // Basic validation
    if (!E164.test(newPhone)) return new Response("Invalid E.164 phone", { status: 400, headers: corsHeaders });

    // Admin client (service role) for DB writes
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Enforce uniqueness (no other account may use this phone)
    const { data: exists } = await admin.from("users_app")
      .select("auth_user_id").eq("phone_e164", newPhone).limit(1);
    if (exists && exists.length && exists[0].auth_user_id !== user.id) {
      return new Response("Phone already in use", { status: 409, headers: corsHeaders });
    }

    // Simple resend guard: block if an OTP was created < 60s ago
    const minResend = Number(Deno.env.get("OTP_MIN_RESEND_SECONDS") ?? "60");
    const { data: recent } = await admin.from("otp_codes")
      .select("id, created_at")
      .eq("user_auth_id", user.id)
      .eq("new_phone_e164", newPhone)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recent && recent.length) {
      const last = new Date(recent[0].created_at).getTime();
      if (Date.now() - last < minResend * 1000) {
        return new Response("Please wait before requesting another code", { status: 429, headers: corsHeaders });
      }
    }

    // Create a code, store hash only
    const code = sixDigit();
    const pepper = Deno.env.get("OTP_PEPPER") ?? "";
    const codeHash = await sha256(`${code}:${pepper}`);

    const ttl = Number(Deno.env.get("OTP_TTL_SECONDS") ?? "600"); // default 10m
    const expires = new Date(Date.now() + ttl * 1000).toISOString();

    // Upsert active OTP for (user, phone)
    await admin.from("otp_codes").upsert({
      user_auth_id: user.id,
      new_phone_e164: newPhone,
      code_hash: codeHash,
      expires_at: expires,
      attempts: 0,
    }, { onConflict: "user_auth_id, new_phone_e164" });

    // Send SMS
    await sendSMS(newPhone, `Your Legacy Journal verification code is ${code}. It expires in ${Math.round(ttl/60)} minutes.`);

    console.log(`OTP sent to ${newPhone} for user ${user.id}`);

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    console.error('Error in phone-change-initiate:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});