import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Authenticate user
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user } } = await anon.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Recovery request for user: ${user.id}`);

    // Check if user is stuck (has temp phone or paused status)
    const { data: userData, error: userError } = await admin
      .from("users_app")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
      return new Response("User not found", { status: 404, headers: corsHeaders });
    }

    const isStuck = userData.status === 'paused' || 
                   (userData.phone_e164 && userData.phone_e164.startsWith('temp_'));

    if (!isStuck) {
      return new Response(JSON.stringify({ 
        recovered: false, 
        reason: "User is not in a stuck state" 
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Recovery actions:
    // 1. Clear temp phone number
    // 2. Reset status to 'pending'
    // 3. Delete any stuck OTP codes for this user
    const { error: updateError } = await admin
      .from("users_app")
      .update({
        status: 'pending',
        phone_e164: ''
      })
      .eq("auth_user_id", user.id);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return new Response("Recovery failed", { status: 500, headers: corsHeaders });
    }

    // Clear any stuck OTP codes
    const { error: otpError } = await admin
      .from("otp_codes")
      .delete()
      .eq("user_auth_id", user.id);

    // Don't fail if OTP deletion fails - it's not critical
    if (otpError) {
      console.warn("Warning: Could not clear OTP codes:", otpError);
    }

    console.log(`User ${user.id} recovered successfully`);

    return new Response(JSON.stringify({ 
      recovered: true,
      message: "User account recovered. You can now set up your phone number again.",
      previousState: {
        status: userData.status,
        phone_e164: userData.phone_e164
      }
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error('Error in recover-stuck-user:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500 
      }
    );
  }
});