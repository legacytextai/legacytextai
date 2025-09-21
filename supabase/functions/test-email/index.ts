import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing email functionality for: ${email}${name ? ` (${name})` : ''}`);

    // No PDF needed for basic test

    // Call the send-journal-email function with simple test (no PDF)
    const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-journal-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: '[Test] LegacyText email check',
        body: `
          <h1 style="color: #1D3557;">Email Test Successful! 📧</h1>
          <p>Hello${name ? ` ${name}` : ''},</p>
          <p>This is a simple test email to confirm your LegacyText AI email infrastructure is working correctly with Resend's default domain.</p>
          <p><strong>What was tested:</strong></p>
          <ul>
            <li>✅ Email delivery via Resend (default domain)</li>
            <li>✅ HTML email formatting</li>
            <li>✅ Edge function integration</li>
            <li>✅ Environment variable configuration</li>
          </ul>
          <p>If you received this email, your basic email infrastructure is working and ready for PDF attachments!</p>
          <div style="background-color: #F8F9FA; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1D3557;"><strong>Ready for production:</strong></p>
            <p style="margin: 5px 0 0 0;">You can now set up a custom domain in Resend and update the RESEND_FROM environment variable when ready.</p>
          </div>
          <p>Best regards,<br>LegacyText AI System</p>
        `
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Email test failed: ${emailResult.error}`);
    }

    console.log('Email test completed successfully:', emailResult);

    return new Response(JSON.stringify({
      success: true,
      message: 'Test email sent successfully',
      email_id: emailResult.email_id,
      recipient: email,
      recipient_name: name || null,
      test_time: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in test-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);