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

    // Caller (for JWT/user)
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

    // Clean up any orphaned records with this phone number before checking uniqueness
    console.log('Cleaning up any orphaned records for phone:', newPhone);
    await admin.from("users_app")
      .delete()
      .eq("phone_e164", newPhone)
      .is("auth_user_id", null);

    // Unique phone enforcement (check for records linked to other users)
    const { data: exists } = await admin.from("users_app")
      .select("auth_user_id").eq("phone_e164", newPhone).limit(1);
    if (exists && exists.length && exists[0].auth_user_id !== user.id) {
      return new Response("Phone already in use", { status: 409, headers: corsHeaders });
    }

    const ttl = Number(Deno.env.get("OTP_TTL_SECONDS") ?? "600");            // 10m
    const minResend = Number(Deno.env.get("OTP_MIN_RESEND_SECONDS") ?? "60");// 60s
    const autoWindowMs = Number(Deno.env.get("OTP_AUTO_WINDOW_MS") ?? "300000"); // 5m grace window for auto
    const pepper = Deno.env.get("OTP_PEPPER") ?? "";
    const now = Date.now();

    // Fetch (single row per user+phone thanks to unique index)
    const { data: row } = await admin.from("otp_codes")
      .select("id, code_hash, expires_at, last_sent_at, attempts")
      .eq("user_auth_id", user.id)
      .eq("new_phone_e164", newPhone)
      .maybeSingle();

    // If AUTO and we sent anything in the last autoWindowMs OR not expired yet -> don't send again
    if (auto && row) {
      const last = row.last_sent_at ? new Date(row.last_sent_at).getTime() : 0;
      const active = row.expires_at && new Date(row.expires_at).getTime() > now;
      if (active || (now - last) < autoWindowMs) {
        return new Response(JSON.stringify({ ok: true, sms: false, reason: "auto_suppressed" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Manual resend path with cooldown (row must exist)
    if (resend && row) {
      const last = row.last_sent_at ? new Date(row.last_sent_at).getTime() : 0;
      if ((now - last) < minResend * 1000) {
        return new Response("Please wait before requesting another code", { status: 429, headers: corsHeaders });
      }
      const code = sixDigit();
      const codeHash = await sha256(`${code}:${pepper}`);
      const expires = new Date(now + ttl * 1000).toISOString();

      await admin.from("otp_codes").update({
        code_hash: codeHash,
        expires_at: expires,
        last_sent_at: new Date().toISOString(),
        attempts: 0,
      })
      .eq("id", row.id);

      await sendSMS(newPhone, `Your Legacy Journal verification code is ${code}. It expires in ${Math.round(ttl/60)} minutes.`);

      console.log(`OTP resent to ${newPhone} for user ${user.id}`);

      return new Response(JSON.stringify({ ok: true, sms: true, reason: "resent" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fresh send: if row exists but expired/old OR row missing -> (up)insert & send
    const code = sixDigit();
    const codeHash = await sha256(`${code}:${pepper}`);
    const expires = new Date(now + ttl * 1000).toISOString();

    // Upsert against the new non-partial unique index
    await admin.from("otp_codes").upsert({
      user_auth_id: user.id,
      new_phone_e164: newPhone,
      code_hash: codeHash,
      expires_at: expires,
      last_sent_at: new Date().toISOString(),
      attempts: 0,
    }, { onConflict: "user_auth_id, new_phone_e164" });

    await sendSMS(newPhone, `Your Legacy Journal verification code is ${code}. It expires in ${Math.round(ttl/60)} minutes.`);

    console.log(`OTP sent to ${newPhone} for user ${user.id} - ${row ? "refresh" : "fresh"}`);

    return new Response(JSON.stringify({ ok: true, sms: true, reason: row ? "refresh" : "fresh" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error('Error in phone-change-initiate:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});