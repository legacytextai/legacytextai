import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { PDFDocument, PDFPage, rgb, grayscale } from "https://esm.sh/pdf-lib@1.17.1";

const THEME_KEY = "stillness";

console.log("[render-ebook-pdf-v2] boot ok");

// PDF layout and helper functions
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

// Format date using user's timezone and locale
function formatLongDateInTZ(dateIso: string, timeZone: string, locale: string = 'en-US'): string {
  try {
    const date = new Date(dateIso);
    return new Intl.DateTimeFormat(locale, {
      timeZone: timeZone,
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return new Date(dateIso).toLocaleDateString();
  }
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

// Helper function to download font assets with validation
async function loadFontBytes(path: string): Promise<Uint8Array> {
  try {
    // Use direct public URL for public assets
    const fullUrl = `https://toxadhuqzdydliplhrws.supabase.co/storage/v1/object/public/exports${path}`;
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${path}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Validate this is actually a font file (TTF starts with specific bytes)
    if (bytes.length < 10000) {
      throw new Error(`Font file too small: ${bytes.length} bytes`);
    }
    
    // Check for TTF signature (0x00010000) or OTF signature (OTTO)
    const signature = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (!signature.startsWith('00010000') && !signature.startsWith('4f54544f')) {
      console.warn(`Unexpected font signature for ${path}: ${signature}`);
    }
    
    console.log(`✅ Font loaded: ${path} (${bytes.length} bytes, signature: ${signature})`);
    return bytes;
  } catch (error) {
    console.error(`❌ Failed to load font ${path}:`, error);
    throw new Error(`Failed to fetch font: ${path}`);
  }
}

async function fetchOrnamentBytes(): Promise<Uint8Array> {
  try {
    const fullUrl = 'https://toxadhuqzdydliplhrws.supabase.co/storage/v1/object/public/exports/assets/ornaments/tilde.svg';
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ornament`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    console.log(`✅ Ornament loaded: ${bytes.length} bytes`);
    return bytes;
  } catch (error) {
    console.error('❌ Failed to load ornament:', error);
    throw new Error('Failed to fetch ornament');
  }
}

// Helper functions for drawing page elements
function drawRunningHeader(page: any, author: string, category: string, isRight: boolean, font: any) {
  // Left page: author on left, right page: category on right
  const text = isRight ? category : author;
  const x = isRight ? PAGE.width - MARGIN.outer : MARGIN.outer;
  
  page.drawText(text, {
    x: isRight ? x - font.widthOfTextAtSize(text, HEADER.fontSize) : x,
    y: HEADER.y,
    size: HEADER.fontSize,
    font: font,
    color: { r: HEADER.color, g: HEADER.color, b: HEADER.color }
  });
}

function drawFolio(page: any, pageNum: number, isRight: boolean, font: any) {
  const text = pageNum.toString();
  const x = isRight ? PAGE.width - MARGIN.outer : MARGIN.outer;
  
  page.drawText(text, {
    x: isRight ? x - font.widthOfTextAtSize(text, FOLIO.fontSize) : x,
    y: FOLIO.y,
    size: FOLIO.fontSize,
    font: font,
    color: { r: FOLIO.color, g: FOLIO.color, b: FOLIO.color }
  });
}

function drawOrnament(page: any, ornamentBytes: Uint8Array) {
  try {
    // Draw a decorative tilde ornament
    const centerX = PAGE.width / 2;
    const ornamentWidth = 48;
    const ornamentHeight = 16;
    
    // Draw a stylized tilde shape
    page.drawLine({
      start: { x: centerX - ornamentWidth / 2, y: ORNAMENT.y },
      end: { x: centerX + ornamentWidth / 2, y: ORNAMENT.y },
      thickness: 1.5,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
    
    // Add small decorative curves
    const curveHeight = 4;
    page.drawLine({
      start: { x: centerX - ornamentWidth / 4, y: ORNAMENT.y - curveHeight },
      end: { x: centerX + ornamentWidth / 4, y: ORNAMENT.y + curveHeight },
      thickness: 1.5,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
  } catch (error) {
    console.warn('Could not draw ornament:', error);
  }
}

// Text typesetting functions
function typesetParagraphs(lines: string[], frame: any, font: any, fontSize: number, leading: number): { consumedLines: string[], remainingLines: string[], yEnd: number } {
  const consumedLines: string[] = [];
  const remainingLines = [...lines];
  let currentY = frame.y;
  
  while (remainingLines.length > 0 && currentY - leading >= frame.bottom) {
    const line = remainingLines.shift()!;
    consumedLines.push(line);
    currentY -= leading;
    
    // Add extra space for paragraph breaks (empty lines)
    if (line === '' && remainingLines.length > 0) {
      currentY -= BODY.paragraphSpacing;
    }
  }
  
  return { consumedLines, remainingLines, yEnd: currentY };
}

function sanitizeEntryText(raw: string): string {
  if (!raw) return '';
  
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[ ]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function drawDateFooter(page: any, dateText: string, font: any) {
  const centerX = PAGE.width / 2;
  const textWidth = font.widthOfTextAtSize(dateText, BODY.fontSize);
  
  page.drawText(dateText, {
    x: centerX - textWidth / 2,
    y: 48,
    size: BODY.fontSize,
    font: font,
    color: { r: 0.3, g: 0.3, b: 0.3 }
  });
}

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
          // Word is too long, split it
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
            if (!splitWord) splitWord = remainingWord[0];
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { export_id, preview_only = false }: RenderRequest = await req.json();
    
    console.log(`[render-ebook-pdf-v2] export_id:${export_id} boot ok`, { export_id, preview_only });
    console.log(`🎨 Theme: ${THEME_KEY}`);

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
    const pdfDoc = await PDFDocument.create();
    
    // Load fonts with proper validation - NO STANDARD FONTS
    let bodyFont, headerFont, notoFont;
    
    try {
      console.log('📚 Loading fonts...');
      
      // Load all fonts
      const interBytes = await loadFontBytes("/assets/fonts/Inter-Regular.ttf");
      bodyFont = await pdfDoc.embedFont(interBytes);
      console.log(`✅ Body font: Inter (${interBytes.length} bytes)`);
      
      const ebGaramondBytes = await loadFontBytes("/assets/fonts/EBGaramond-Regular.ttf");
      headerFont = await pdfDoc.embedFont(ebGaramondBytes);
      console.log(`✅ Header font: EB Garamond (${ebGaramondBytes.length} bytes)`);
      
      const notoBytes = await loadFontBytes("/assets/fonts/NotoSerif-Regular.ttf");
      notoFont = await pdfDoc.embedFont(notoBytes);
      console.log(`✅ Fallback font: Noto Serif (${notoBytes.length} bytes)`);
      
    } catch (error) {
      console.error('❌ CRITICAL: Font loading failed:', error);
      throw new Error('Could not load required fonts - aborting render to prevent StandardFonts usage');
    }

    // Load ornament
    let ornamentBytes;
    try {
      ornamentBytes = await fetchOrnamentBytes();
      console.log('✅ Ornament loaded');
    } catch (error) {
      console.error('❌ Error fetching ornament:', error);
      ornamentBytes = new Uint8Array(); // fallback to empty
    }

    const timeZone = manuscript.meta?.timezone || 'UTC';
    const locale = manuscript.user?.preferred_language || 'en-US';
    let pageNumber = 1;
    
    // Title page
    const titlePage = pdfDoc.addPage([PAGE.width, PAGE.height]);
    titlePage.drawText(manuscript.meta?.title || 'My Legacy Journal', {
      x: PAGE.width / 2 - headerFont.widthOfTextAtSize(manuscript.meta?.title || 'My Legacy Journal', 24) / 2,
      y: PAGE.height * 0.6,
      size: 24,
      font: headerFont,
    });
    
    titlePage.drawText(`Generated ${new Date().toLocaleDateString()}`, {
      x: PAGE.width / 2 - bodyFont.widthOfTextAtSize(`Generated ${new Date().toLocaleDateString()}`, 12) / 2,
      y: PAGE.height * 0.4,
      size: 12,
      font: bodyFont,
    });
    pageNumber++;
    
    // Dedication page
    if (manuscript.meta?.dedication && manuscript.meta.dedication.trim()) {
      const dedicationPage = pdfDoc.addPage([PAGE.width, PAGE.height]);
      
      dedicationPage.drawText('Dedication', {
        x: PAGE.width / 2 - headerFont.widthOfTextAtSize('Dedication', 18) / 2,
        y: PAGE.height * 0.8,
        size: 18,
        font: headerFont,
      });
      
      const dedicationLines = wrapText(manuscript.meta.dedication, PAGE.width - 2 * MARGIN.outer, bodyFont, 12);
      let y = PAGE.height * 0.6;
      dedicationLines.forEach(line => {
        dedicationPage.drawText(line, {
          x: PAGE.width / 2 - bodyFont.widthOfTextAtSize(line, 12) / 2,
          y: y,
          size: 12,
          font: bodyFont,
        });
        y -= 16;
      });
      pageNumber++;
    }
    
    // Process entries by category
    const categories = manuscript.sections || [];
    
    for (const section of categories) {
      if (preview_only && pageNumber > 3) break;
      
      // Category section page (right-hand)
      if (pageNumber % 2 === 0) {
        pdfDoc.addPage([PAGE.width, PAGE.height]); // blank left page
        pageNumber++;
      }
      
      const categoryPage = pdfDoc.addPage([PAGE.width, PAGE.height]);
      categoryPage.drawText((section.title || section.category).toUpperCase(), {
        x: PAGE.width / 2 - headerFont.widthOfTextAtSize((section.title || section.category).toUpperCase(), 16) / 2,
        y: PAGE.height / 2 + 20,
        size: 16,
        font: headerFont,
      });
      
      // Draw ornament below category
      drawOrnament(categoryPage, ornamentBytes);
      pageNumber++;
      
      // Process entries in this category
      for (const entry of section.pages) {
        if (preview_only && pageNumber > 3) break;
        
        const sanitizedText = sanitizeEntryText(entry.content);
        const frame = textFrame(pageNumber % 2 === 0);
        const wrappedLines = wrapText(sanitizedText, frame.width, bodyFont, BODY.fontSize);
        
        let remainingLines = [...wrappedLines];
        let isFirstPage = true;
        
        while (remainingLines.length > 0) {
          if (preview_only && pageNumber > 3) break;
          
          const entryPage = pdfDoc.addPage([PAGE.width, PAGE.height]);
          const isRight = pageNumber % 2 === 0;
          const currentFrame = textFrame(isRight);
          
          // Draw running headers and folios
          drawRunningHeader(entryPage, manuscript.meta?.author || 'Legacy Journal', section.title || section.category, isRight, bodyFont);
          drawFolio(entryPage, pageNumber, isRight, bodyFont);
          
          // Draw ornament on first page of entry
          if (isFirstPage) {
            drawOrnament(entryPage, ornamentBytes);
            
            // Draw date footer on entry pages
            const dateText = formatLongDateInTZ(entry.date_iso, timeZone, locale);
            drawDateFooter(entryPage, dateText, bodyFont);
          } else {
            // Draw "— continued —" on continuation pages
            const contText = "— continued —";
            entryPage.drawText(contText, {
              x: PAGE.width / 2 - bodyFont.widthOfTextAtSize(contText, 10) / 2,
              y: PAGE.height - MARGIN.top - 10,
              size: 10,
              font: bodyFont,
              color: { r: 0.5, g: 0.5, b: 0.5 }
            });
          }
          
          // Typeset paragraphs
          const result = typesetParagraphs(remainingLines, currentFrame, bodyFont, BODY.fontSize, BODY.leading);
          
          // Draw the text
          let y = currentFrame.y;
          result.consumedLines.forEach(line => {
            if (line.trim()) {
              try {
                entryPage.drawText(line, {
                  x: currentFrame.x,
                  y: y,
                  size: BODY.fontSize,
                  font: bodyFont,
                });
              } catch (error) {
                // Fallback to Noto Serif if Inter fails with certain glyphs
                entryPage.drawText(line, {
                  x: currentFrame.x,
                  y: y,
                  size: BODY.fontSize,
                  font: notoFont,
                });
              }
            }
            y -= BODY.leading;
            if (line === '') y -= BODY.paragraphSpacing;
          });
          
          remainingLines = result.remainingLines;
          isFirstPage = false;
          pageNumber++;
        }
      }
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
        page_count: pageNumber - 1,
        status: 'ready'
      })
      .eq('id', export_id);

    if (updateError) {
      console.error('Error updating export record:', updateError);
      throw new Error('Failed to update export record');
    }

    // Send completion email notification (best effort)
    try {
      await supabase.functions.invoke('send-premium-journal-email', {
        body: { export_id, signed_url: signedUrl.signedUrl }
      });
    } catch (emailError) {
      console.warn('Failed to send completion email:', emailError);
      // Don't fail the export if email fails
    }

    console.log(`[render-ebook-pdf-v2] export_id:${export_id} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      export_id,
      pdf_url: signedUrl.signedUrl,
      page_count: pageNumber - 1
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(`[render-ebook-pdf-v2] Failed:`, error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);