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
    const authHeader = req.headers.get("Authorization");
    const hasAuth = !!authHeader;
    
    console.log('[Diag] Request received', {
      method: req.method,
      hasAuthHeader: hasAuth,
      authHeaderPreview: authHeader ? `${authHeader.substring(0, 20)}...` : null,
    });

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );
    
    let userId: string | null = null;
    let authError: string | null = null;
    
    try {
      const { data: { user }, error } = await anon.auth.getUser();
      if (error) {
        authError = error.message;
        console.warn('[Diag] Auth error:', error);
      } else {
        userId = user?.id ?? null;
        console.log('[Diag] User found:', userId ? `${userId.substring(0, 8)}...` : 'null');
      }
    } catch (e) {
      authError = String(e);
      console.error('[Diag] Exception during auth check:', e);
    }

    const result = {
      ok: true,
      auth_header_seen: hasAuth,
      user_id_from_jwt: userId,
      claims_present: !!userId,
      now: new Date().toISOString(),
      auth_error: authError,
    };

    console.log('[Diag] Result:', result);

    return new Response(JSON.stringify(result), { 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders,
      }
    });
  } catch (e) {
    console.error('[Diag] Exception in handler:', e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(e),
      now: new Date().toISOString(),
    }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      }
    });
  }
});