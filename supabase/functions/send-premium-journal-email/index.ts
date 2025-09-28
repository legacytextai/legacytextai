import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  name: string;
  download_url: string;
  page_count: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, download_url, page_count }: EmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "LegacyText AI <noreply@legacytext.ai>",
      to: [email],
      subject: "Your Legacy Journal (Premium PDF) is Ready!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Legacy Journal is Ready</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f8f9fa;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #1a1a1a; font-size: 28px; margin: 0; font-weight: 600;">
                  📖 Your Legacy Journal is Ready!
                </h1>
                <p style="color: #6b7280; font-size: 16px; margin: 10px 0 0 0;">
                  Premium PDF • ${page_count} pages • Stillness theme
                </p>
              </div>

              <!-- Main Content -->
              <div style="margin-bottom: 40px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Hello ${name || 'there'},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Your beautifully formatted Legacy Journal is now ready for download! We've carefully crafted your ${page_count} pages using our premium Stillness theme, featuring elegant typography and professional layout.
                </p>

                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                  This heirloom-quality digital journal contains all your precious memories and wisdom, professionally formatted for sharing with future generations.
                </p>
              </div>

              <!-- Download Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${download_url}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  📥 Download Your Premium PDF
                </a>
              </div>

              <!-- Features -->
              <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
                  What's included in your Premium PDF:
                </h3>
                <ul style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                  <li>6×9" professional formatting</li>
                  <li>Elegant serif typography (EB Garamond)</li>
                  <li>Category organization</li>
                  <li>One entry per page layout</li>
                  <li>Running headers and footers</li>
                  <li>Custom dedication page</li>
                </ul>
              </div>

              <!-- Important Note -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                  ⚠️ Important: This download link expires in 24 hours for security. Please save your PDF to a safe location.
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                  With love from the LegacyText AI team
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Preserving wisdom for future generations, one text at a time.
                </p>
              </div>

            </div>
          </body>
        </html>
      `,
    });

    console.log("Premium journal email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-premium-journal-email function:", error);
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