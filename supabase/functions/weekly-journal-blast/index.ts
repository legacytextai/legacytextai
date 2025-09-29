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

interface BlastRequest {
  dryRun?: boolean;
  testTo?: string;
  limit?: number;
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

    // Parse request body for parameters
    let requestBody: BlastRequest = {};
    try {
      if (req.body) {
        requestBody = await req.json();
      }
    } catch {
      // Ignore JSON parse errors for empty body
    }

    // Default values
    const defaultDryRun = Deno.env.get('WEEKLY_BLAST_DEFAULT_DRY_RUN') === 'true';
    const dryRun = requestBody.dryRun ?? defaultDryRun ?? true;
    const testTo = requestBody.testTo;
    const limit = requestBody.limit ?? (dryRun ? 10 : undefined);

    console.log(`Starting weekly journal blast... dryRun: ${dryRun}, testTo: ${testTo}, limit: ${limit}`);

    // Check RESEND_API_KEY if not in dry run mode
    if (!dryRun && !Deno.env.get('RESEND_API_KEY')) {
      return new Response(
        JSON.stringify({ 
          error: 'RESEND_API_KEY is required when dryRun is false',
          dryRun: false,
          status: 'failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate week start date (last Sunday)
    const now = new Date();
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - now.getDay()); // Go back to Sunday
    lastSunday.setHours(0, 0, 0, 0);
    const weekStartDate = lastSunday.toISOString().split('T')[0];

    console.log(`Processing week starting: ${weekStartDate}`);

    // Get users based on test parameters
    let usersQuery = supabase
      .from('users_app')
      .select('id, email, name, status')
      .eq('status', 'active')
      .not('email', 'is', null);

    // Apply limit if specified
    if (limit) {
      usersQuery = usersQuery.limit(limit);
    }

    const { data: users, error: usersError } = await usersQuery;

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
        JSON.stringify({ 
          message: 'No active users found', 
          dryRun: dryRun,
          selectedUsers: 0,
          attemptedSends: 0,
          emailsSent: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${users.length} active users`);

    const results: any[] = [];
    const errors: any[] = [];
    let successCount = 0;
    let errorCount = 0;
    let attemptedSends = 0;
    let pdfBytesTotal = 0;

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

        // Determine target email (testTo override or original)
        const targetEmail = testTo || user.email;
        console.log(`Processing user: ${user.email}${testTo ? ` -> ${targetEmail}` : ''}`);

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
        pdfBytesTotal += pdfSize;

        console.log(`Generated PDF for ${user.email}, size: ${pdfSize} bytes`);

        if (dryRun) {
          // Dry run mode - just log what would happen
          console.log(`[DRY RUN] Would send email to ${targetEmail}, PDF size: ${pdfSize} bytes`);
          
          results.push({
            user_id: user.id,
            intendedTo: targetEmail,
            pdfSize: pdfSize,
            status: 'dry_run'
          });

          successCount++;
        } else {
          // Real mode - send email
          attemptedSends++;
          
          const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-journal-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: targetEmail,
              subject: `Your Weekly Journal - Week of ${weekStartDate}`,
              body: `
                <h2>Your Weekly Journal</h2>
                <p>Hi ${user.name || 'there'},</p>
                <p>Here's your weekly journal for the week of ${weekStartDate}.</p>
                <p>Your thoughts and memories from this week are attached as a PDF.</p>
                <p>Best regards,<br>The LegacyText Team</p>
              `,
              pdf_buffer: Array.from(pdfBytes),
              pdf_filename: `weekly-journal-${weekStartDate}.pdf`
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
            to: targetEmail,
            emailSent: true,
            pdfSize: pdfSize,
            status: 'success'
          });

          successCount++;
          console.log(`✅ Successfully sent weekly journal to ${targetEmail}`);
        }

      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error);
        
        errors.push({
          user_id: user.id,
          message: error instanceof Error ? error.message : String(error)
        });

        if (!dryRun) {
          // Log failed blast in real mode
          await supabase
            .from('weekly_blasts')
            .insert({
              user_id: user.id,
              week_start_date: weekStartDate,
              email_sent: false,
              error_message: error instanceof Error ? error.message : String(error)
            });
        }

        results.push({
          user_id: user.id,
          email: testTo || user.email,
          emailSent: false,
          error: error instanceof Error ? error.message : String(error),
          status: 'error'
        });

        errorCount++;
      }
    }

    const summary = {
      dryRun: dryRun,
      testTo: testTo,
      week_start_date: weekStartDate,
      selectedUsers: users.length,
      attemptedSends: attemptedSends,
      emailsSent: dryRun ? 0 : successCount,
      pdfBytesTotal: pdfBytesTotal,
      success_count: successCount,
      error_count: errorCount,
      errors: errors,
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
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);