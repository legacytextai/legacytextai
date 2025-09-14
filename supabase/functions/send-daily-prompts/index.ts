import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function twilioSend(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const auth = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const svc = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

  console.log('Sending SMS to:', to);
  console.log('Message length:', body.length);

  const params = new URLSearchParams(
    svc 
      ? { MessagingServiceSid: svc, To: to, Body: body }
      : { From: Deno.env.get("TWILIO_FROM_NUMBER")!, To: to, Body: body }
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
  if (!res.ok) {
    console.error('Twilio error:', data);
    throw new Error(`Twilio error ${res.status}: ${JSON.stringify(data)}`);
  }
  
  console.log('SMS sent successfully, SID:', data.sid);
  return data; // includes sid
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily prompt sending process');
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Get active users
    const { data: users, error: uErr } = await supabase
      .from("users_app")
      .select("id, phone_e164")
      .eq("status", "active");

    if (uErr) {
      console.error('Error fetching users:', uErr);
      throw uErr;
    }

    console.log(`Found ${users?.length || 0} active users`);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ 
        ok: true, 
        message: "No active users found." 
      }), { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      });
    }

    // 2) Get a random active prompt
    const { data: prompts, error: promptError } = await supabase
      .from("prompts")
      .select("id, text")
      .eq("active", true);

    if (promptError) {
      console.error('Error fetching prompts:', promptError);
      throw promptError;
    }

    if (!prompts || prompts.length === 0) {
      return new Response(JSON.stringify({ 
        ok: true, 
        message: "No active prompts found." 
      }), { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      });
    }

    // Select random prompt
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    console.log('Selected prompt:', prompt.id, prompt.text.substring(0, 50));

    let successCount = 0;
    let errorCount = 0;

    // 3) Send to each user
    for (const u of users) {
      try {
        // Check if user already got a prompt today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingPrompt } = await supabase
          .from("daily_prompts")
          .select("id")
          .eq("user_id", u.id)
          .eq("sent_date", today)
          .maybeSingle();

        if (existingPrompt) {
          console.log(`User ${u.phone_e164} already received a prompt today`);
          continue;
        }

        const sms = `Daily Prompt: ${prompt.text}

Reply to this text with your reflection. We'll save it to your Legacy Journal.
Reply STOP to unsubscribe.`;

        const tw = await twilioSend(u.phone_e164, sms);

        // Log outbound message
        await supabase.from("messages").insert({
          direction: "out",
          phone_e164: u.phone_e164,
          body: sms,
          twilio_sid: tw.sid,
        });

        // Track daily prompt sent
        await supabase.from("daily_prompts").insert({
          user_id: u.id,
          prompt_id: prompt.id,
          sent_date: today,
        });

        successCount++;
        console.log(`Sent prompt to ${u.phone_e164}`);

      } catch (error) {
        console.error(`Error sending to ${u.phone_e164}:`, error);
        errorCount++;
      }
    }

    console.log(`Daily prompts sent: ${successCount} success, ${errorCount} errors`);

    return new Response(JSON.stringify({ 
      ok: true, 
      sent: successCount,
      errors: errorCount,
      prompt: prompt.text 
    }), { 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders 
      } 
    });

  } catch (error) {
    console.error('Error in send-daily-prompts function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders 
      },
    });
  }
});