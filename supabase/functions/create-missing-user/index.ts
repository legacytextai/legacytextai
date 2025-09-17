import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { auth_user_id, email } = await req.json()

    if (!auth_user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing auth_user_id or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating missing user record for:', { auth_user_id, email })

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('users_app')
      .select('*')
      .eq('auth_user_id', auth_user_id)
      .maybeSingle()

    if (existing) {
      console.log('User already exists:', existing.id)
      return new Response(
        JSON.stringify({ success: true, user: existing, message: 'User already exists' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the missing user record
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users_app')
      .insert([{
        auth_user_id,
        email,
        phone_e164: '',
        status: 'pending'
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully created user:', newUser.id)

    return new Response(
      JSON.stringify({ success: true, user: newUser }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})