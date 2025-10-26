import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // SECURITY: Verify user is authenticated before exposing sensitive data
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
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
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

    if (roleError || !isAdmin) {
      console.error('Admin check failed:', roleError);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🧪 Starting phone verification system test...');

    // Test 1: Check for stuck users
    const { data: stuckUsers, error: stuckError } = await supabaseAdmin
      .from('users_app')
      .select('id, email, phone_e164, status, created_at')
      .or('status.eq.paused,phone_e164.like.temp_%');

    if (stuckError) {
      console.error('❌ Error checking stuck users:', stuckError);
      return new Response(JSON.stringify({ 
        error: 'Failed to check stuck users',
        details: stuckError 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${stuckUsers?.length || 0} stuck users:`, stuckUsers);

    // Test 2: Check recent OTP codes
    const { data: recentOtps, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (otpError) {
      console.error('❌ Error checking OTP codes:', otpError);
    } else {
      console.log(`📱 Found ${recentOtps?.length || 0} recent OTP codes in last 24h`);
    }

    // Test 3: Check orphaned auth users
    const { data: authUsers, error: authError2 } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError2) {
      console.error('❌ Error listing auth users:', authError2);
    } else {
      const orphanedUsers = [];
      for (const authUser of authUsers.users) {
        const { data: appUser } = await supabaseAdmin
          .from('users_app')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .single();
        
        if (!appUser && authUser.email) {
          orphanedUsers.push({
            id: authUser.id,
            email: authUser.email,
            phone: authUser.phone,
            created_at: authUser.created_at
          });
        }
      }
      console.log(`👻 Found ${orphanedUsers.length} orphaned auth users:`, orphanedUsers);
    }

    // Test 4: Simulate recovery for stuck users
    const recoveryResults = [];
    if (stuckUsers && stuckUsers.length > 0) {
      for (const user of stuckUsers) {
        console.log(`🔄 Attempting recovery for user: ${user.email}`);
        
        // Clear temp phone and reset status
        const { error: updateError } = await supabaseAdmin
          .from('users_app')
          .update({ 
            phone_e164: null, 
            status: 'pending' 
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ Failed to recover user ${user.email}:`, updateError);
          recoveryResults.push({ email: user.email, recovered: false, error: updateError.message });
        } else {
          console.log(`✅ Successfully recovered user: ${user.email}`);
          recoveryResults.push({ email: user.email, recovered: true });
        }
      }
    }

    // Test 5: Clean up expired OTP codes
    const { data: expiredOtps, error: cleanupError } = await supabaseAdmin
      .from('otp_codes')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (cleanupError) {
      console.error('❌ Error cleaning up expired OTPs:', cleanupError);
    } else {
      console.log(`🧹 Cleaned up ${expiredOtps?.length || 0} expired OTP codes`);
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {
        stuckUsers: {
          count: stuckUsers?.length || 0,
          users: stuckUsers || []
        },
        recentOtps: {
          count: recentOtps?.length || 0,
          codes: recentOtps || []
        },
        recovery: {
          attempted: recoveryResults.length,
          successful: recoveryResults.filter(r => r.recovered).length,
          results: recoveryResults
        },
        cleanup: {
          expiredOtpsRemoved: expiredOtps?.length || 0
        }
      },
      recommendations: []
    };

    // Add recommendations based on findings
    if (stuckUsers && stuckUsers.length > 0) {
      testResults.recommendations.push('Consider implementing automatic recovery for stuck users');
    }
    
    if (recentOtps && recentOtps.length > 10) {
      testResults.recommendations.push('High OTP volume detected - monitor for abuse');
    }

    console.log('🎯 Phone verification test completed:', testResults);

    return new Response(JSON.stringify(testResults), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Test function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Test function failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});