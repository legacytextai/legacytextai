import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyEmailRequest {
  email: string;
  name?: string;
  week_start_date: string;
  pdf_buffer: number[]; // Array buffer as numbers
  pdf_size: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, week_start_date, pdf_buffer, pdf_size }: WeeklyEmailRequest = await req.json();

    if (!email || !week_start_date || !pdf_buffer) {
      return new Response(
        JSON.stringify({ error: "email, week_start_date, and pdf_buffer are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending weekly journal email to ${email}, PDF size: ${pdf_size} bytes`);

    // Convert number array back to Uint8Array for PDF attachment
    const pdfData = new Uint8Array(pdf_buffer);

    // Format date for subject and body
    const weekStart = new Date(week_start_date);
    const weekStartStr = weekStart.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const emailResponse = await resend.emails.send({
      from: "LegacyText AI <journal@legacytext.ai>",
      to: [email],
      subject: `Your Weekly Legacy Journal – Week of ${weekStartStr}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1D3557; font-size: 24px; margin-bottom: 20px;">Your Weekly Legacy Journal</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Hello${name ? ` ${name}` : ''},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Your weekly Legacy Journal for the week of <strong>${weekStartStr}</strong> is ready! 
            This PDF contains all the memories, thoughts, and wisdom you shared this week.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Each entry is a precious piece of your legacy, preserved for those you love. 
            Keep writing – every message adds another chapter to your story.
          </p>
          
          <div style="background-color: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #1D3557; font-size: 14px; margin: 0;">
              📄 <strong>Your weekly journal is attached as a PDF</strong><br>
              📅 Week of ${weekStartStr}<br>
              📊 ${Math.round(pdf_size / 1024)} KB
            </p>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            Keep texting your thoughts and memories to continue building your legacy.
          </p>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          
          <p style="color: #6B7280; font-size: 14px; margin: 0;">
            Best regards,<br>
            The LegacyText AI Team
          </p>
          
          <p style="color: #6B7280; font-size: 12px; margin-top: 20px;">
            This is an automated weekly journal delivery. To manage your preferences, 
            log in to your LegacyText AI account.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `weekly-journal-${weekStartStr.replace(/\s+/g, '-')}.pdf`,
          content: pdfData,
        },
      ],
    });

    console.log("Weekly journal email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      email_id: emailResponse.data?.id,
      recipient: email,
      pdf_size: pdf_size
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-weekly-journal-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);