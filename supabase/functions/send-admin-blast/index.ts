import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Twilio sender - reused from send-daily-prompts */
async function twilioSend(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const auth = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const svc = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
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
    body: params,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${JSON.stringify(data)}`);
  return data; // includes data.sid
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

  try {
    // Parse request body
    const { message, dryRun = false } = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('[Admin Check] Not authorized:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Admin Blast] ${dryRun ? 'DRY RUN' : 'SENDING'} - Initiated by user ${user.id}`);

    // Query active users with valid phone numbers
    const { data: users, error: usersError } = await supabase
      .from('users_app')
      .select('id, phone_e164, name')
      .eq('status', 'active')
      .not('phone_e164', 'is', null)
      .neq('phone_e164', '');

    if (usersError) {
      console.error('[Admin Blast] Error querying users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to query users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalUsers = users?.length || 0;
    console.log(`[Admin Blast] Found ${totalUsers} active users with phone numbers`);

    // Dry run - just return count
    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          totalUsers,
          message: 'Dry run completed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format message with admin footer
    const fullMessage = `${message.trim()}

(LegacyText Admin Message)
Reply STOP to unsubscribe.`;

    let sent = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Send to all active users
    for (const u of users || []) {
      try {
        console.log(`[Sending] To user ${u.id} (${u.phone_e164?.slice(-4)})`);
        
        // Send via Twilio
        const twilioResponse = await twilioSend(u.phone_e164, fullMessage);

        // Log to messages table
        await supabase.from('messages').insert({
          direction: 'out',
          phone_e164: u.phone_e164,
          body: fullMessage,
          twilio_sid: twilioResponse.sid
        });

        // Log to daily_prompts table for unified analytics
        await supabase.from('daily_prompts').insert({
          user_id: u.id,
          prompt_text: message.trim(),
          source: 'admin_blast',
          is_forced: true,
          name: u.name
        });

        sent++;
        console.log(`[Success] Sent to ${u.phone_e164?.slice(-4)}`);
      } catch (error) {
        errors++;
        const errorMsg = `Failed for ${u.phone_e164?.slice(-4)}: ${error.message}`;
        console.error(`[Error] ${errorMsg}`);
        errorDetails.push(errorMsg);
      }
    }

    console.log(`[Admin Blast] Complete - Sent: ${sent}, Errors: ${errors}, Total: ${totalUsers}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        errors,
        totalUsers,
        details: errorDetails.length > 0 ? errorDetails : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Admin Blast] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
