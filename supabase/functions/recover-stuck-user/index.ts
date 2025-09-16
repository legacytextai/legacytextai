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

    // Use the database function to recover the user account
    // This bypasses the client restrictions via SECURITY DEFINER
    const { data: recoveryResult, error: recoveryError } = await admin
      .rpc('recover_stuck_user_account', { p_auth_user_id: user.id });

    if (recoveryError) {
      console.error("Error calling recovery function:", recoveryError);
      return new Response("Recovery failed", { status: 500, headers: corsHeaders });
    }

    if (!recoveryResult.success) {
      console.error("Recovery function failed:", recoveryResult.error);
      return new Response(JSON.stringify({ 
        recovered: false, 
        reason: recoveryResult.error 
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(`User ${user.id} recovered successfully`);

    return new Response(JSON.stringify({ 
      recovered: true,
      message: recoveryResult.message,
      previousState: recoveryResult.previous_state
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