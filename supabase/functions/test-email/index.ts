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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing email functionality for: ${email}`);

    // Create a simple test PDF
    const testPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj

4 0 obj
<<
/Length 120
>>
stream
BT
/F1 12 Tf
72 720 Td
(This is a test PDF attachment for LegacyText AI) Tj
0 -20 Td
(If you receive this, the email system is working!) Tj
0 -20 Td
(Date: ${new Date().toLocaleDateString()}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000189 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
400
%%EOF`;

    const pdfBuffer = new TextEncoder().encode(testPdfContent);

    // Call the send-journal-email function
    const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-journal-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Test Journal Email - LegacyText AI',
        body: `
          <h1 style="color: #1D3557;">Email Test Successful! 🎉</h1>
          <p>Hello,</p>
          <p>This is a test email from your LegacyText AI email infrastructure.</p>
          <p><strong>What was tested:</strong></p>
          <ul>
            <li>✅ Email delivery via Resend</li>
            <li>✅ PDF attachment functionality</li>
            <li>✅ HTML email formatting</li>
            <li>✅ Edge function integration</li>
          </ul>
          <p>You should see a test PDF attached to this email. If you received this email with the attachment, your email infrastructure is working correctly!</p>
          <div style="background-color: #F8F9FA; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1D3557;"><strong>Next steps:</strong></p>
            <p style="margin: 5px 0 0 0;">Your weekly journal email system is ready to send automated PDFs to users.</p>
          </div>
          <p>Best regards,<br>LegacyText AI System</p>
        `,
        pdf_buffer: Array.from(pdfBuffer),
        pdf_filename: 'test-journal.pdf'
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
      pdf_size: pdfBuffer.length,
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