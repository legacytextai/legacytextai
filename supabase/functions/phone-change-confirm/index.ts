import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(s: string) {
  const data = new TextEncoder().encode(s);
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
    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { new_phone_e164, code } = await req.json().catch(() => ({}));
    if (!new_phone_e164 || !code) return new Response("Missing fields", { status: 400, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // BEFORE updating app row, fetch old phone to see if this is first-time verification
    let { data: existingRows } = await admin
      .from("users_app")
      .select("phone_e164, status")
      .eq("auth_user_id", user.id)
      .limit(1);
    
    // If no profile linked to this user, check for orphaned profile with this phone
    if (!existingRows || !existingRows.length) {
      console.log('No existing profile found for user, checking for orphaned profile...');
      
      const { data: orphanedProfile } = await admin
        .from("users_app")
        .select("*")
        .eq("phone_e164", new_phone_e164)
        .is("auth_user_id", null)
        .limit(1);
      
      if (orphanedProfile && orphanedProfile.length) {
        console.log('Found orphaned profile, linking to user:', orphanedProfile[0].id);
        
        // Link the orphaned profile to this user
        const { error: linkError } = await admin
          .from("users_app")
          .update({ 
            auth_user_id: user.id,
            status: 'active',
            email: user.email 
          })
          .eq("id", orphanedProfile[0].id);
        
        if (linkError) {
          console.error('Error linking orphaned profile:', linkError);
          return new Response("Failed to link profile", { status: 500, headers: corsHeaders });
        }
        
        // Set existing rows to the orphaned profile for later processing
        existingRows = orphanedProfile;
      } else {
        console.log('No orphaned profile found, will create new one later');
      }
    }
    
    const prevPhone = existingRows && existingRows[0]?.phone_e164;

    // Fetch OTP
    const { data: rows } = await admin.from("otp_codes")
      .select("id, code_hash, expires_at, attempts")
      .eq("user_auth_id", user.id)
      .eq("new_phone_e164", new_phone_e164)
      .limit(1);

    if (!rows || !rows.length) return new Response("No pending code", { status: 400, headers: corsHeaders });

    const row = rows[0];
    const maxAttempts = Number(Deno.env.get("OTP_MAX_ATTEMPTS") ?? "5");
    if (row.attempts >= maxAttempts) return new Response("Too many attempts", { status: 429, headers: corsHeaders });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      // Expired: clean up
      await admin.from("otp_codes").delete().eq("id", row.id);
      return new Response("Code expired", { status: 400, headers: corsHeaders });
    }

    // Verify
    const pepper = Deno.env.get("OTP_PEPPER") ?? "";
    const hash = await sha256(`${code}:${pepper}`);
    if (hash !== row.code_hash) {
      await admin.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return new Response("Invalid code", { status: 401, headers: corsHeaders });
    }

    // 1) Update Supabase Auth user phone (admin API) with confirmation
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      phone: new_phone_e164.replace('+', ''),
      phone_confirm: true, // CRITICAL: Mark phone as confirmed
      user_metadata: {
        ...user.user_metadata,
        phone_verified: true,
        pending_phone_e164: null
      }
    });
    if (updErr) {
      console.error('Auth update error:', updErr);
      return new Response("Auth update failed", { status: 500, headers: corsHeaders });
    }

    // 2) Clean up any orphaned temp records BEFORE updating (using secure function)
    console.log('Cleaning up orphaned temp records for phone:', new_phone_e164);
    await admin.from("users_app")
      .delete()
      .eq("phone_e164", new_phone_e164)
      .is("auth_user_id", null);
    
    // Also clean up any temp records for this user that might be stuck
    await admin.from("users_app")
      .delete()
      .eq("auth_user_id", user.id)
      .like("phone_e164", "temp_%");

    // 3) Update user phone using secure function (prevents direct table access)
    console.log('Updating user phone via secure function for user:', user.id);
    const { data: updateResult, error: updateError } = await admin.rpc('update_user_phone_secure', {
      p_auth_user_id: user.id,
      p_new_phone_e164: new_phone_e164,
      p_new_status: 'active'
    });

    if (updateError) {
      console.error('Secure phone update error:', updateError);
      return new Response("Phone update failed", { status: 500, headers: corsHeaders });
    }

    // If no existing record was updated, create one using secure function
    if (!updateResult) {
      console.log('Creating new user profile via secure function');
      const { error: createError } = await admin.rpc('create_user_profile_secure', {
        p_auth_user_id: user.id,
        p_email: user.email,
        p_phone_e164: new_phone_e164,
        p_status: 'active'
      });
      
      if (createError) {
        console.error('Secure profile creation error:', createError);
        return new Response("Failed to create profile", { status: 500, headers: corsHeaders });
      }
    }

    // Log this security-sensitive operation
    await admin.rpc('log_service_access', {
      p_table_name: 'users_app',
      p_operation: 'UPDATE_PHONE',
      p_user_id: user.id,
      p_function_name: 'phone-change-confirm'
    });

    // 4) Delete OTP row
    await admin.from("otp_codes").delete().eq("id", row.id);

    // 5) Confirm SMS
    await sendSMS(new_phone_e164, "Your phone number was updated for Legacy Journal. Reply STOP to unsubscribe, HELP for help.");

    // 6) Welcome SMS if first phone ever (prevPhone was null)
    if (!prevPhone) {
      await sendSMS(new_phone_e164,
        "Welcome to LegacyTextAI ✨! \n\nThink of this as your own pocket journal. \n\nYou'll receive journaling prompts to help capture your thoughts and memories. You can reply to any prompt, or just simply text us anytime you have something to share. \n\nEvery text you send will be saved as a journal entry. \n\nNow let's build your legacy, one text at a time! ✨\n\nReply STOP to unsubscribe.");
    }

    console.log(`Phone changed successfully to ${new_phone_e164} for user ${user.id}`);

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    console.error('Error in phone-change-confirm:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});