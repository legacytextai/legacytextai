import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { format } from "https://esm.sh/date-fns@3.6.0";
import { utcToZonedTime } from "https://esm.sh/date-fns-tz@3.0.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RenderRequest {
  export_id: string;
  preview_only?: boolean;
}

interface Manuscript {
  meta: {
    title: string;
    author: string;
    dedication: string;
    timezone: string;
  };
  sections: {
    category: string;
    pages: {
      entry_id: string;
      body: string;
      date_iso: string;
      continued: boolean;
    }[];
  }[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { export_id, preview_only = false }: RenderRequest = await req.json();
    
    console.log('Rendering PDF for export:', export_id, 'preview_only:', preview_only);

    // Get export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .select('*')
      .eq('id', export_id)
      .single();

    if (exportError || !exportRecord) {
      console.error('Error fetching export record:', exportError);
      throw new Error('Export record not found');
    }

    if (!exportRecord.storage_key_manuscript) {
      throw new Error('Manuscript not found for export');
    }

    // Download manuscript from storage
    const { data: manuscriptData, error: downloadError } = await supabase.storage
      .from('manuscripts')
      .download(exportRecord.storage_key_manuscript);

    if (downloadError || !manuscriptData) {
      console.error('Error downloading manuscript:', downloadError);
      throw new Error('Failed to download manuscript');
    }

    const manuscriptText = await manuscriptData.text();
    const manuscript: Manuscript = JSON.parse(manuscriptText);

    console.log('Manuscript loaded:', manuscript.meta.title);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const headerFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const dateFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // PDF dimensions for 6x9 inches (432x648 points)
    const pageWidth = 432;
    const pageHeight = 648;
    const margins = {
      top: 72,
      bottom: 72,
      inner: 64,
      outer: 54
    };

    let pageCount = 0;

    // Title Page
    const titlePage = pdfDoc.addPage([pageWidth, pageHeight]);
    pageCount++;
    
    titlePage.drawText(manuscript.meta.title, {
      x: margins.outer,
      y: pageHeight - 150,
      size: 24,
      font: titleFont,
      color: rgb(0, 0, 0),
      maxWidth: pageWidth - margins.outer - margins.inner,
    });

    titlePage.drawText(`Generated on ${format(new Date(), 'MMMM d, yyyy')}`, {
      x: margins.outer,
      y: pageHeight - 200,
      size: 12,
      font: bodyFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Dedication Page (if exists)
    if (manuscript.meta.dedication && manuscript.meta.dedication.trim()) {
      const dedicationPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pageCount++;
      
      dedicationPage.drawText('Dedication', {
        x: margins.outer,
        y: pageHeight - 100,
        size: 18,
        font: titleFont,
        color: rgb(0, 0, 0),
      });

      // Split dedication text to fit on page
      const dedicationLines = splitTextToLines(
        manuscript.meta.dedication,
        bodyFont,
        12,
        pageWidth - margins.outer - margins.inner
      );

      let yPosition = pageHeight - 140;
      dedicationLines.forEach(line => {
        dedicationPage.drawText(line, {
          x: margins.outer,
          y: yPosition,
          size: 12,
          font: bodyFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 16;
      });
    }

    // Entry Pages
    let totalEntries = 0;
    for (const section of manuscript.sections) {
      // Category title page (right-hand page)
      if (pageCount % 2 === 1) {
        pdfDoc.addPage([pageWidth, pageHeight]); // Blank left page
        pageCount++;
      }
      
      const categoryPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pageCount++;
      
      categoryPage.drawText(section.category, {
        x: margins.outer,
        y: pageHeight - 150,
        size: 20,
        font: titleFont,
        color: rgb(0, 0, 0),
      });

      // Add ornament (tilde)
      categoryPage.drawText('~', {
        x: margins.outer,
        y: pageHeight - 180,
        size: 14,
        font: headerFont,
        color: rgb(0.6, 0.6, 0.6),
      });

      // Entry pages for this section
      for (const pageEntry of section.pages) {
        if (preview_only && totalEntries >= 3) break; // Limit preview to 3 entries
        
        const entryPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pageCount++;
        totalEntries++;

        // Running header
        entryPage.drawText(manuscript.meta.author, {
          x: margins.outer,
          y: pageHeight - 30,
          size: 10,
          font: headerFont,
          color: rgb(0.5, 0.5, 0.5),
        });

        entryPage.drawText(section.category, {
          x: pageWidth - margins.inner - 100,
          y: pageHeight - 30,
          size: 10,
          font: headerFont,
          color: rgb(0.5, 0.5, 0.5),
        });

        // Format date using user timezone
        const entryDate = new Date(pageEntry.date_iso);
        const zonedDate = utcToZonedTime(entryDate, manuscript.meta.timezone);
        const formattedDate = format(zonedDate, 'MMMM d, yyyy');

        // Entry content
        const contentLines = splitTextToLines(
          pageEntry.body,
          bodyFont,
          12,
          pageWidth - margins.outer - margins.inner
        );

        let yPosition = pageHeight - 100;
        const lineHeight = 18;
        const maxLinesPerPage = Math.floor((pageHeight - margins.top - margins.bottom - 100) / lineHeight);

        for (let i = 0; i < Math.min(contentLines.length, maxLinesPerPage); i++) {
          entryPage.drawText(contentLines[i], {
            x: margins.outer,
            y: yPosition,
            size: 12,
            font: bodyFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= lineHeight;
        }

        // Date footer
        entryPage.drawText(formattedDate, {
          x: pageWidth / 2 - 50,
          y: 30,
          size: 10,
          font: dateFont,
          color: rgb(0.4, 0.4, 0.4),
        });

        // Page number
        entryPage.drawText(pageCount.toString(), {
          x: pageWidth - margins.inner - 20,
          y: 30,
          size: 10,
          font: bodyFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      if (preview_only && totalEntries >= 3) break;
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    if (preview_only) {
      // Return PDF bytes directly for preview
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="preview.pdf"'
        },
      });
    }

    // Store PDF in storage
    const pdfKey = `${exportRecord.user_id}/${export_id}.pdf`;
    const { error: storageError } = await supabase.storage
      .from('exports')
      .upload(pdfKey, pdfBytes, {
        contentType: 'application/pdf'
      });

    if (storageError) {
      console.error('Error storing PDF:', storageError);
      throw new Error('Failed to store PDF');
    }

    // Generate signed URL (24 hour expiry)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('exports')
      .createSignedUrl(pdfKey, 24 * 60 * 60); // 24 hours

    if (urlError || !signedUrl) {
      console.error('Error generating signed URL:', urlError);
      throw new Error('Failed to generate download URL');
    }

    // Update export record
    const { error: updateError } = await supabase
      .from('exports')
      .update({
        storage_key_pdf: pdfKey,
        url: signedUrl.signedUrl,
        page_count: pageCount,
        status: 'ready'
      })
      .eq('id', export_id);

    if (updateError) {
      console.error('Error updating export record:', updateError);
      throw new Error('Failed to update export record');
    }

    // Send email notification
    try {
      const { data: userData, error: userError } = await supabase
        .from('users_app')
        .select('email, name')
        .eq('id', exportRecord.user_id)
        .single();

      if (!userError && userData?.email) {
        const { error: emailError } = await supabase.functions.invoke('send-premium-journal-email', {
          body: {
            email: userData.email,
            name: userData.name,
            download_url: signedUrl.signedUrl,
            page_count: pageCount
          }
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
          // Don't fail the entire process if email fails
        } else {
          console.log('Email notification sent successfully');
        }
      }
    } catch (emailErr) {
      console.error('Email notification failed:', emailErr);
      // Don't fail the entire process if email fails
    }

    console.log('PDF generated successfully:', signedUrl.signedUrl);

    return new Response(JSON.stringify({ 
      export_id,
      status: 'ready',
      url: signedUrl.signedUrl,
      page_count: pageCount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in render-ebook-pdf function:', error);
    
    // Update export status to error if we have an export_id
    try {
      const body = await req.json();
      if (body.export_id) {
        await supabase
          .from('exports')
          .update({ status: 'error' })
          .eq('id', body.export_id);
      }
    } catch (e) {
      // Ignore errors in error handling
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

function splitTextToLines(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is too long, break it
        lines.push(word);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

serve(handler);