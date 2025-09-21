import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { PDFDocument, PDFPage, rgb, grayscale } from "https://esm.sh/pdf-lib@1.17.1";

const THEME_KEY = "stillness";

console.log("[render-ebook-pdf] boot ok");

// Theme constants
const PAGE = { width: 432, height: 648 }; // 6x9 in points
const MARGIN = { top: 72, bottom: 72, inner: 64, outer: 54 };
const BODY = { fontSize: 11.5, leading: 16.5, paragraphSpacing: 10 };
const HEADER = { fontSize: 9, y: PAGE.height - 48, color: 0.5 };  // gray
const FOLIO = { fontSize: 9, y: 36, color: 0.5 };
const ORNAMENT = { y: PAGE.height - MARGIN.top - 36 }; // between header and body

// Content frame (mirrors on left/right pages)
function textFrame(isRight: boolean) {
  const left = isRight ? MARGIN.inner : MARGIN.outer;
  const right = isRight ? PAGE.width - MARGIN.outer : PAGE.width - MARGIN.inner;
  return { 
    x: left, 
    y: PAGE.height - MARGIN.top - 24, 
    width: right - left, 
    bottom: MARGIN.bottom + 36 
  };
}

// Cache date formatters to avoid recreating them for every page
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatLongDateInTZ(dateIso: string, timeZone: string, locale = "en-US"): string {
  // Example output: "September 21, 2025"
  const cacheKey = `${timeZone}-${locale}`;
  
  let formatter = dateFormatterCache.get(cacheKey);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat(locale, {
        timeZone,
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      dateFormatterCache.set(cacheKey, formatter);
    } catch {
      // Safe fallback in case of bad tz string
      const fallbackKey = `UTC-${locale}`;
      formatter = dateFormatterCache.get(fallbackKey);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, {
          timeZone: "UTC",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        dateFormatterCache.set(fallbackKey, formatter);
      }
    }
  }
  
  const d = new Date(dateIso);
  return formatter.format(d);
}

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
  user?: {
    preferred_language?: string;
  };
  sections: {
    title: string;
    category: string;
    pages: {
      entry_id: string;
      content: string;
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
    
    console.log(`[render-ebook-pdf] export_id:${export_id} boot ok`, { export_id, preview_only });

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

    // Create the PDF document
    const pdfDoc = await PDFDocument.create()
    
    // Helper to fetch font bytes
    async function fetchFontBytes(path: string): Promise<Uint8Array> {
      try {
        const response = await fetch(`https://toxadhuqzdydliplhrws.supabase.co${path}`)
        if (!response.ok) throw new Error(`Failed to fetch font: ${path}`)
        return new Uint8Array(await response.arrayBuffer())
      } catch (error) {
        console.error(`Error fetching font ${path}:`, error)
        throw error
      }
    }

    // Helper to fetch ornament SVG
    async function fetchOrnamentBytes(): Promise<Uint8Array> {
      try {
        const response = await fetch('https://toxadhuqzdydliplhrws.supabase.co/assets/ornaments/tilde.svg')
        if (!response.ok) throw new Error('Failed to fetch ornament')
        return new Uint8Array(await response.arrayBuffer())
      } catch (error) {
        console.error('Error fetching ornament:', error)
        // Return a simple fallback ornament
        const fallback = '<svg width="48" height="16" viewBox="0 0 48 16"><path d="M8 8C12 4 16 4 20 8C24 12 28 12 32 8C36 4 40 4 44 8" stroke="#666666" stroke-width="1.5" fill="none"/></svg>'
        return new TextEncoder().encode(fallback)
      }
    }
    
    // Embed fonts with fallbacks
    let bodyFont, titleFont, headerFont;
    try {
      bodyFont = await pdfDoc.embedFont(await fetchFontBytes('/assets/fonts/Inter-Regular.ttf'))
    } catch (error) {
      console.warn('Failed to embed Inter, using Noto Serif fallback')
      try {
        bodyFont = await pdfDoc.embedFont(await fetchFontBytes('/assets/fonts/NotoSerif-Regular.ttf'))
      } catch (fallbackError) {
        console.warn('Failed to embed fonts, using Helvetica')
        const { StandardFonts } = await import('https://esm.sh/pdf-lib@1.17.1')
        bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      }
    }
    
    try {
      titleFont = await pdfDoc.embedFont(await fetchFontBytes('/assets/fonts/EBGaramond-Regular.ttf'))
    } catch (error) {
      console.warn('Failed to embed EB Garamond, using body font')
      titleFont = bodyFont
    }
    
    headerFont = bodyFont // Use same font for headers
    
    // Get ornament
    const ornamentBytes = await fetchOrnamentBytes()

    // Helper functions for layout
    function drawRunningHeader(page: PDFPage, author: string, category: string, isRight: boolean): void {
      const leftText = author || 'Legacy Journal'
      const rightText = category || ''
      
      if (!isRight && leftText) {
        page.drawText(leftText, {
          x: MARGIN.outer,
          y: HEADER.y,
          size: HEADER.fontSize,
          font: headerFont,
          color: grayscale(HEADER.color),
        })
      }
      
      if (isRight && rightText) {
        const textWidth = headerFont.widthOfTextAtSize(rightText, HEADER.fontSize)
        page.drawText(rightText, {
          x: PAGE.width - MARGIN.outer - textWidth,
          y: HEADER.y,
          size: HEADER.fontSize,
          font: headerFont,
          color: grayscale(HEADER.color),
        })
      }
    }
    
    function drawFolio(page: PDFPage, pageNum: number, isRight: boolean): void {
      const pageText = pageNum.toString()
      const textWidth = headerFont.widthOfTextAtSize(pageText, FOLIO.fontSize)
      const x = isRight ? PAGE.width - MARGIN.outer - textWidth : MARGIN.outer
      
      page.drawText(pageText, {
        x,
        y: FOLIO.y,
        size: FOLIO.fontSize,
        font: headerFont,
        color: grayscale(FOLIO.color),
      })
    }
    
    function drawOrnament(page: PDFPage): void {
      // Simple ornament using text characters as fallback
      const ornamentText = '~'
      const textWidth = headerFont.widthOfTextAtSize(ornamentText, 14)
      
      page.drawText(ornamentText, {
        x: (PAGE.width - textWidth) / 2,
        y: ORNAMENT.y,
        size: 14,
        font: headerFont,
        color: grayscale(0.6),
      })
    }
    
    function typesetParagraphs(lines: string[], frame: any, font: any, fontSize: number, leading: number) {
      const consumedLines: string[] = []
      const remainingLines: string[] = [...lines]
      let yPos = frame.y
      
      while (remainingLines.length > 0 && yPos - leading >= frame.bottom) {
        const line = remainingLines.shift()!
        consumedLines.push(line)
        yPos -= leading
      }
      
      return {
        consumedLines,
        remainingLines,
        yEnd: yPos
      }
    }

    // Title page
    const titlePage = pdfDoc.addPage([PAGE.width, PAGE.height])
    
    // Title (centered, large)
    const title = manuscript.meta?.title || 'My Legacy Journal'
    const titleWidth = titleFont.widthOfTextAtSize(title, 28)
    titlePage.drawText(title, {
      x: (PAGE.width - titleWidth) / 2,
      y: PAGE.height / 2 + 50,
      size: 28,
      font: titleFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Subtitle (centered)
    const userLocale = manuscript.user?.preferred_language || "en-US";
    const tz = manuscript.meta?.timezone || "UTC";
    const currentDate = formatLongDateInTZ(new Date().toISOString(), tz, userLocale);
    const subtitle = `Generated on ${currentDate}`
    const subtitleWidth = bodyFont.widthOfTextAtSize(subtitle, 12)
    titlePage.drawText(subtitle, {
      x: (PAGE.width - subtitleWidth) / 2,
      y: PAGE.height / 2,
      size: 12,
      font: bodyFont,
      color: grayscale(0.5),
    })
    
    // Dedication page (if exists)
    if (manuscript.meta?.dedication && manuscript.meta.dedication.trim()) {
      const dedicationPage = pdfDoc.addPage([PAGE.width, PAGE.height])
      
      const dedicationTitle = 'Dedication'
      const dedicationTitleWidth = titleFont.widthOfTextAtSize(dedicationTitle, 18)
      dedicationPage.drawText(dedicationTitle, {
        x: (PAGE.width - dedicationTitleWidth) / 2,
        y: PAGE.height - 150,
        size: 18,
        font: titleFont,
        color: rgb(0.1, 0.1, 0.1),
      })
      
      const dedicationLines = wrapText(manuscript.meta.dedication, PAGE.width - 2 * MARGIN.outer, bodyFont, 12)
      let dedicationY = PAGE.height - 200
      
      dedicationLines.forEach((line) => {
        const lineWidth = bodyFont.widthOfTextAtSize(line, 12)
        dedicationPage.drawText(line, {
          x: (PAGE.width - lineWidth) / 2,
          y: dedicationY,
          size: 12,
          font: bodyFont,
          color: rgb(0.2, 0.2, 0.2),
        })
        dedicationY -= 18
      })
    }

    // Process each section
    let pageNum = pdfDoc.getPageCount() + 1
    let totalEntries = 0
    
    for (const section of manuscript.sections) {
      // Category section page (right-hand)
      if (pageNum % 2 === 0) pageNum++ // Ensure right page
      
      const categoryPage = pdfDoc.addPage([PAGE.width, PAGE.height])
      
      // Large category title in EB Garamond small caps, centered
      const categoryTitle = section.title || section.category || 'Entries'
      const categoryTitleSize = 20
      const categoryTitleWidth = titleFont.widthOfTextAtSize(categoryTitle.toUpperCase(), categoryTitleSize)
      
      categoryPage.drawText(categoryTitle.toUpperCase(), {
        x: (PAGE.width - categoryTitleWidth) / 2,
        y: PAGE.height / 2 + 20,
        size: categoryTitleSize,
        font: titleFont,
        color: rgb(0.1, 0.1, 0.1),
      })
      
      // Ornament below title
      drawOrnament(categoryPage)
      
      pageNum++
      
      // Process entries in this section
      for (const page of section.pages) {
        if (preview_only && totalEntries >= 3) break; // Limit preview to 3 entries
        
        const entry = page
        let remainingLines = wrapText(sanitizeEntryText(entry.content || ''), textFrame(pageNum % 2 === 0).width, bodyFont, BODY.fontSize)
        let isFirstPage = true
        
        while (remainingLines.length > 0) {
          try {
            const entryPage = pdfDoc.addPage([PAGE.width, PAGE.height])
            const isRight = pageNum % 2 === 0
            const frame = textFrame(isRight)
            
            // Running headers and folio
            drawRunningHeader(entryPage, manuscript.meta?.author || 'Author', section.title || section.category || 'Legacy', isRight)
            drawFolio(entryPage, pageNum, isRight)
            
            let yPos = frame.y
            
            if (isFirstPage) {
              // Ornament on first page of entry
              drawOrnament(entryPage)
              yPos -= 30
              
              // Date header
              const dateStr = formatLongDateInTZ(entry.date_iso, tz, userLocale)
              const dateWidth = bodyFont.widthOfTextAtSize(dateStr, 10)
              entryPage.drawText(dateStr, {
                x: (PAGE.width - dateWidth) / 2,
                y: 48,
                size: 10,
                font: bodyFont,
                color: grayscale(0.5),
              })
              
              isFirstPage = false
            } else {
              // Continuation indicator
              yPos -= 10
              const contText = '— continued —'
              const contWidth = bodyFont.widthOfTextAtSize(contText, 9)
              entryPage.drawText(contText, {
                x: (PAGE.width - contWidth) / 2,
                y: yPos,
                size: 9,
                font: bodyFont,
                color: grayscale(0.5),
              })
              yPos -= 20
            }
            
            // Typeset paragraphs that fit on this page
            const result = typesetParagraphs(remainingLines, { ...frame, y: yPos }, bodyFont, BODY.fontSize, BODY.leading)
            
            // Draw the lines
            let drawY = yPos
            for (const line of result.consumedLines) {
              if (line.trim()) {
                entryPage.drawText(line, {
                  x: frame.x,
                  y: drawY,
                  size: BODY.fontSize,
                  font: bodyFont,
                  color: rgb(0.1, 0.1, 0.1),
                })
              }
              drawY -= BODY.leading
            }
            
            remainingLines = result.remainingLines
            pageNum++
            
          } catch (entryError: any) {
            console.error(`[render-ebook-pdf] export_id:${export_id} Failed to render entry ${entry.entry_id}:`, entryError);
            if (!preview_only) {
              throw entryError; // Fail full export on entry errors
            }
            // Skip this entry in preview mode and continue
            break;
          }
        }
        
        totalEntries++
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
        page_count: pageNum - 1,
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
            page_count: pageNum - 1
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
      page_count: pageNum - 1
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    let export_id_for_logs = 'unknown';
    
    // Try to get export_id for logging
    try {
      const body = await req.json();
      export_id_for_logs = body.export_id || 'unknown';
    } catch (e) {
      // Ignore JSON parsing errors
    }
    
    console.error(`[render-ebook-pdf] export_id:${export_id_for_logs} Error:`, error);
    
    // Update export status to error if we have an export_id
    if (export_id_for_logs !== 'unknown') {
      try {
        await supabase
          .from('exports')
          .update({ status: 'error' })
          .eq('id', export_id_for_logs);
      } catch (e) {
        // Ignore errors in error handling
      }
    }

    // Truncate error message to first 120 chars for better toast display
    const errorMessage = error.message ? error.message.substring(0, 120) : 'Unknown error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

// Text sanitizing function - newline safe
function sanitizeEntryText(raw: string): string {
  if (!raw) return '';
  
  return raw
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace non-breaking spaces and tabs with regular spaces
    .replace(/\u00A0/g, ' ')
    .replace(/\t/g, ' ')
    // Collapse multiple spaces into single spaces
    .replace(/[ ]+/g, ' ')
    // Remove control characters (except newlines)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Enhanced text wrapping that preserves newlines and handles word breaking
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];
  
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(' ');
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
          // Word is too long for the line, need to split it
          let remainingWord = word;
          while (remainingWord) {
            let splitWord = '';
            for (let i = 0; i < remainingWord.length; i++) {
              const testChar = splitWord + remainingWord[i];
              if (font.widthOfTextAtSize(testChar, fontSize) <= maxWidth) {
                splitWord = testChar;
              } else {
                break;
              }
            }
            if (!splitWord) splitWord = remainingWord[0]; // At least one character
            lines.push(splitWord);
            remainingWord = remainingWord.slice(splitWord.length);
          }
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

serve(handler);