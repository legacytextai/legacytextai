interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  pdfBuffer?: Uint8Array | ArrayBuffer;
  pdfFilename?: string;
}

interface EmailResponse {
  success: boolean;
  email_id?: string;
  error?: string;
}

export const sendJournalEmail = async ({
  to,
  subject,
  body,
  pdfBuffer,
  pdfFilename = 'journal.pdf'
}: EmailOptions): Promise<EmailResponse> => {
  try {
    // Convert buffer to array for edge function
    const pdfArray = pdfBuffer ? Array.from(new Uint8Array(pdfBuffer)) : [];

    const response = await fetch(`https://toxadhuqzdydliplhrws.supabase.co/functions/v1/send-journal-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        body,
        pdf_buffer: pdfArray,
        pdf_filename: pdfFilename
      })
    });

    if (!response.ok) {
      throw new Error(`Email sending failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      email_id: result.email_id
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Helper to create a dummy PDF for testing
export const createDummyPDF = (): Uint8Array => {
  // Basic PDF content as a simple string converted to bytes
  const pdfContent = `%PDF-1.4
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
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF for email) Tj
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
285
%%EOF`;

  return new TextEncoder().encode(pdfContent);
};