import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

console.log("[render-ebook-pdf] DISABLED - redirecting to v2");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 🔴 HARD STOP: Force all users to use v2 renderer
  console.log(`🛑 Legacy render-ebook-pdf called - redirecting to v2`);
  
  return new Response('USE_V2_ONLY', {
    status: 410,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain'
    }
  });
};

serve(handler);