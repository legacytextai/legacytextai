import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function xml(msg: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>${msg}</Message></Response>`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received Twilio webhook request');
    
    // Twilio POSTS application/x-www-form-urlencoded
    const form = await req.formData();
    const from = (form.get("From") as string) || "";
    const body = (form.get("Body") as string) || "";
    const sid = (form.get("MessageSid") as string) || "";

    console.log('Webhook data:', { from, body: body.substring(0, 100), sid });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Dedupe by MessageSid
    const { data: exists } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("message_sid", sid)
      .maybeSingle();

    if (!exists) {
      console.log('Processing new SMS entry');
      const phone_e164 = from.trim();

      // 2) Upsert user by phone
      const { data: user, error: userError } = await supabase
        .from("users_app")
        .upsert({ phone_e164 }, { onConflict: "phone_e164" })
        .select("id")
        .single();

      if (userError) {
        console.error('Error upserting user:', userError);
        throw userError;
      }

      console.log('User upserted:', user);

      // 3) Log inbound message
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          direction: "in",
          phone_e164,
          body,
          twilio_sid: sid,
        });

      if (messageError) {
        console.error('Error logging message:', messageError);
      }

      // 4) Save journal entry
      const { error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user?.id,
          phone_e164,
          content: body,
          message_sid: sid,
          source: "sms",
        });

      if (entryError) {
        console.error('Error saving journal entry:', entryError);
        throw entryError;
      }

      console.log('Journal entry saved successfully');
    } else {
      console.log('Duplicate message detected, skipping');
    }

    // Instant auto-reply with TwiML
    const replyMessage = "Thanks for your reply! Your journal entry has been saved. ✨";
    console.log('Sending TwiML response');
    
    return new Response(xml(replyMessage), {
      headers: { 
        "Content-Type": "application/xml",
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error('Error in twilio-inbound function:', error);
    
    // Still return a valid TwiML response even on error
    const errorMessage = "Thank you for your message. We're processing it now.";
    return new Response(xml(errorMessage), {
      headers: { 
        "Content-Type": "application/xml",
        ...corsHeaders 
      },
    });
  }
});