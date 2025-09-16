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
    const from = ((form.get("From") as string) ?? "").trim();
    const rawBody = (form.get("Body") as string) ?? "";
    const body = rawBody.trim();
    const sid = (form.get("MessageSid") as string) ?? "";

    console.log('Webhook data:', { from, body: body.substring(0, 100), sid });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Compliance handling (STOP/START/HELP/INFO/CANCEL/END/QUIT) ---
    const keyword = body.toUpperCase();

    // STOP-like keywords: mark opted_out; don't save a journal entry; return empty TwiML (let carrier auto-reply stand)
    if (["STOP","CANCEL","END","QUIT"].includes(keyword)) {
      console.log('Processing STOP keyword:', keyword);
      
      // ensure user exists & update status
      await supabase.from("users_app")
        .upsert({ phone_e164: from, status: "opted_out" }, { onConflict: "phone_e164" });

      // log inbound for audit
      await supabase.from("messages").insert({
        direction: "in", phone_e164: from, body, twilio_sid: sid,
      });

      console.log('User opted out, returning empty TwiML');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
        headers: { 
          "Content-Type": "application/xml",
          ...corsHeaders 
        },
      });
    }

    // START/UNSTOP: mark active; send a short confirmation
    if (["START","UNSTOP"].includes(keyword)) {
      console.log('Processing START keyword:', keyword);
      
      await supabase.from("users_app")
        .upsert({ phone_e164: from, status: "active" }, { onConflict: "phone_e164" });

      await supabase.from("messages").insert({
        direction: "in", phone_e164: from, body, twilio_sid: sid,
      });

      console.log('User reactivated, sending confirmation');
      return new Response(xml("You're back in. You'll receive prompts again."), {
        headers: { 
          "Content-Type": "application/xml",
          ...corsHeaders 
        },
      });
    }

    // HELP/INFO: provide help copy; no journal entry
    if (["HELP","INFO"].includes(keyword)) {
      console.log('Processing HELP keyword:', keyword);
      
      await supabase.from("messages").insert({
        direction: "in", phone_e164: from, body, twilio_sid: sid,
      });

      console.log('Sending help message');
      return new Response(
        xml("LegacyText AI: Reply STOP to unsubscribe. Reply START to re-subscribe. Msg&Data rates may apply."),
        { 
          headers: { 
            "Content-Type": "application/xml",
            ...corsHeaders 
          } 
        }
      );
    }

    // --- Dedupe normal inbound by MessageSid ---
    const { data: exists } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("message_sid", sid)
      .maybeSingle();

    if (!exists) {
      console.log('Processing new SMS entry');
      
      // Get user ID using secure function (minimal data exposure)
      const { data: userId, error: userError } = await supabase.rpc('get_user_id_by_phone_secure', {
        p_phone_e164: from
      });

      if (userError) {
        console.error('Error getting user by phone:', userError);
        throw userError;
      }

      // If no user found, we need to handle this as an unknown number
      if (!userId) {
        console.log('Unknown phone number, creating minimal record for SMS compliance');
        
        // Create minimal record for compliance purposes only
        const { data: newUserId, error: createError } = await supabase.rpc('create_user_profile_secure', {
          p_auth_user_id: null, // No auth user linked yet
          p_email: '', // No email for SMS-only users
          p_phone_e164: from,
          p_status: 'sms_only'
        });
        
        if (createError) {
          console.error('Error creating SMS-only user:', createError);
          throw createError;
        }
        
        userId = newUserId;
      }

      console.log('User ID resolved:', userId);

      // Log inbound message
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          direction: "in",
          phone_e164: from,
          body,
          twilio_sid: sid,
        });

      if (messageError) {
        console.error('Error logging message:', messageError);
      }

      // Save journal entry
      const { error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          user_id: userId,
          phone_e164: from,
          content: body,
          message_sid: sid,
          source: "sms",
        });

      if (entryError) {
        console.error('Error saving journal entry:', entryError);
        throw entryError;
      }

      console.log('Journal entry saved successfully');
      
      // Log this security-sensitive operation
      await supabase.rpc('log_service_access', {
        p_table_name: 'journal_entries',
        p_operation: 'INSERT',
        p_user_id: userId,
        p_function_name: 'twilio-inbound'
      });
    } else {
      console.log('Duplicate message detected, skipping');
    }

    // Standard success reply
    console.log('Sending standard success TwiML response');
    return new Response(xml("Thanks for your reply! Your journal entry has been saved. ✨"), {
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