import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface User {
  id: string;
  email: string;
  name?: string;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting weekly journal blast...');

    // Calculate week start date (last Sunday)
    const now = new Date();
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - now.getDay()); // Go back to Sunday
    lastSunday.setHours(0, 0, 0, 0);
    const weekStartDate = lastSunday.toISOString().split('T')[0];

    console.log(`Processing week starting: ${weekStartDate}`);

    // Get all active users who haven't received this week's blast yet
    const { data: users, error: usersError } = await supabase
      .from('users_app')
      .select('id, email, name, status')
      .eq('status', 'active')
      .not('email', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!users || users.length === 0) {
      console.log('No active users found');
      return new Response(
        JSON.stringify({ message: 'No active users found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${users.length} active users`);

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of users as User[]) {
      try {
        // Check if we already sent this week's blast to this user
        const { data: existingBlast } = await supabase
          .from('weekly_blasts')
          .select('id')
          .eq('user_id', user.id)
          .eq('week_start_date', weekStartDate)
          .single();

        if (existingBlast) {
          console.log(`Skipping user ${user.id} - already sent this week`);
          results.push({
            user_id: user.id,
            email: user.email,
            status: 'skipped',
            reason: 'already_sent'
          });
          continue;
        }

        console.log(`Processing user: ${user.email}`);

        // Generate PDF for this user
        const pdfResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-weekly-journal-pdf`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            week_start_date: weekStartDate
          })
        });

        if (!pdfResponse.ok) {
          throw new Error(`PDF generation failed: ${pdfResponse.statusText}`);
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBytes = new Uint8Array(pdfBuffer);
        const pdfSize = pdfBytes.length;

        console.log(`Generated PDF for ${user.email}, size: ${pdfSize} bytes`);

        // Send email with PDF attachment
        const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-weekly-journal-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            week_start_date: weekStartDate,
            pdf_buffer: Array.from(pdfBytes),
            pdf_size: pdfSize
          })
        });

        if (!emailResponse.ok) {
          throw new Error(`Email sending failed: ${emailResponse.statusText}`);
        }

        // Log successful blast
        await supabase
          .from('weekly_blasts')
          .insert({
            user_id: user.id,
            week_start_date: weekStartDate,
            email_sent: true,
            pdf_size: pdfSize,
            sent_at: new Date().toISOString()
          });

        results.push({
          user_id: user.id,
          email: user.email,
          emailSent: true,
          pdfSize: pdfSize,
          status: 'success'
        });

        successCount++;
        console.log(`✅ Successfully sent weekly journal to ${user.email}`);

      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error);

        // Log failed blast
        await supabase
          .from('weekly_blasts')
          .insert({
            user_id: user.id,
            week_start_date: weekStartDate,
            email_sent: false,
            error_message: error.message
          });

        // Try to send fallback email
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-weekly-journal-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              week_start_date: weekStartDate,
              pdf_buffer: [], // Empty PDF for fallback
              pdf_size: 0,
              is_fallback: true
            })
          });
          console.log(`Sent fallback email to ${user.email}`);
        } catch (fallbackError) {
          console.error(`Failed to send fallback email to ${user.email}:`, fallbackError);
        }

        results.push({
          user_id: user.id,
          email: user.email,
          emailSent: false,
          error: error.message,
          status: 'error'
        });

        errorCount++;
      }
    }

    const summary = {
      week_start_date: weekStartDate,
      total_users: users.length,
      success_count: successCount,
      error_count: errorCount,
      results: results
    };

    console.log('Weekly journal blast completed:', summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in weekly-journal-blast function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);