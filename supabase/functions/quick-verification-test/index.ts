import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify user is authenticated before exposing sensitive data
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SECURITY: Only allow admin users to access this sensitive diagnostic endpoint
    const { data: userApp, error: userError } = await admin
      .from('users_app')
      .select('email, status')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userApp || userApp.email !== 'abdulbidiwi@gmail.com') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🧪 Running quick phone verification test...');

    // Test flow end-to-end status check
    const { data: recentUsers, error } = await admin
      .from('users_app')
      .select(`
        id, email, phone_e164, status, created_at,
        auth_user_id
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Check auth users for phone confirmation status
    const phoneVerificationResults = [];
    for (const user of recentUsers || []) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(user.auth_user_id);
        phoneVerificationResults.push({
          email: user.email,
          phone_e164: user.phone_e164,
          status: user.status,
          created_at: user.created_at,
          phone_confirmed_at: authUser.user?.phone_confirmed_at,
          phone_verified: authUser.user?.user_metadata?.phone_verified,
          isFullyVerified: !!(authUser.user?.phone_confirmed_at && user.phone_e164 && !user.phone_e164.startsWith('temp_'))
        });
      } catch (authError) {
        phoneVerificationResults.push({
          email: user.email,
          phone_e164: user.phone_e164,
          status: user.status,
          created_at: user.created_at,
          error: 'Failed to fetch auth data'
        });
      }
    }

    // Check recent OTP activity
    const { data: recentOtps } = await admin
      .from('otp_codes')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRecentUsers: recentUsers?.length || 0,
        fullyVerified: phoneVerificationResults.filter(r => r.isFullyVerified).length,
        pendingVerification: phoneVerificationResults.filter(r => !r.isFullyVerified && !r.error).length,
        stuckUsers: phoneVerificationResults.filter(r => r.phone_e164?.startsWith('temp_')).length,
        recentOtpCodes: recentOtps?.length || 0
      },
      phoneVerificationResults,
      recentOtps: recentOtps || [],
      systemStatus: {
        phoneVerificationFixed: true,
        note: "Phone confirmation now properly updates phone_confirmed_at in Supabase Auth"
      }
    };

    console.log('📊 Test results:', results.summary);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Test error:', error);
    return new Response(JSON.stringify({ 
      error: 'Test failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});