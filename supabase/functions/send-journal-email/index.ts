import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  pdf_buffer?: number[]; // Array buffer as numbers
  pdf_filename?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, pdf_buffer, pdf_filename = 'journal.pdf' }: EmailRequest = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "to, subject, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure sender - use env vars with fallbacks for default Resend domain
    const FROM = Deno.env.get("RESEND_FROM") || "LegacyText <onboarding@resend.dev>";
    const REPLY_TO = Deno.env.get("REPLY_TO") || "legacytextai@gmail.com";

    console.log(`Sending email to ${to} with subject: ${subject}, from: ${FROM}`);

    // Prepare email options
    const emailOptions: any = {
      from: FROM,
      to: [to],
      subject: subject,
      reply_to: REPLY_TO,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${body}
        </div>
      `,
    };

    // Add PDF attachment if provided
    if (pdf_buffer && pdf_buffer.length > 0) {
      const pdfData = new Uint8Array(pdf_buffer);
      emailOptions.attachments = [
        {
          filename: pdf_filename,
          content: pdfData,
        },
      ];
      console.log(`Adding PDF attachment: ${pdf_filename} (${pdfData.length} bytes)`);
    }

    const emailResponse = await resend.emails.send(emailOptions);

    if (emailResponse.error) {
      throw new Error(`Resend API error: ${emailResponse.error.message}`);
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      email_id: emailResponse.data?.id,
      recipient: to,
      has_attachment: !!(pdf_buffer && pdf_buffer.length > 0)
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-journal-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);