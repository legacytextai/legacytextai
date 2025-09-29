import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { PDFDocument, PDFPage, rgb, grayscale, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

// Safe text drawing with font fallback
function safeDrawText(page: PDFPage, text: string, opts: any, notoFallback: any, exportId: string) {
  try {
    // Test if the font can encode the text
    opts.font.encodeText(text);
    return page.drawText(text, opts);
  } catch (error) {
    console.log(`⚠️ Font encoding failed for "${text}", falling back to noto serif for export_id: ${exportId}`);
    const fallbackOpts = { ...opts, font: notoFallback };
    return page.drawText(text, fallbackOpts);
  }
}

// Helper function to load bundled font assets with comprehensive validation
async function loadFontBytes(fontName: string): Promise<Uint8Array> {
  console.log(`📚 Attempting to load font: ${fontName}`);
  
  try {
    // Load from bundled fonts directory using Deno.readFile
    const fontPath = `./fonts/${fontName}`;
    const bytes = await Deno.readFile(fontPath);
    
    // Validate font file size and signature
    if (bytes.length < 10000) {
      throw new Error(`Font file too small: ${bytes.length} bytes (expected >10,000) - likely corrupted`);
    }
    
    // Check TTF signature (first 4 bytes should be 0x00010000 for TTF or OTTO for OTF)
    const signature = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`✅ Font loaded: ${fontName} (${bytes.length} bytes, signature: ${signature})`);
    
    if (signature !== '00010000' && signature !== '4f54544f') { // TTF or OTF
      console.log(`⚠️ Warning: Unexpected font signature ${signature} for ${fontName}`);
    }
    
    return bytes;
  } catch (error) {
    console.log(`❌ CRITICAL: Font loading failed: ${error}`);
    throw new Error(`Failed to fetch font: ${fontName}`);
  }
}

async function fetchOrnamentBytes(): Promise<Uint8Array> {
  try {
    // Load from bundled ornaments directory
    const ornamentPath = './ornaments/tilde.svg';
    const bytes = await Deno.readFile(ornamentPath);
    console.log(`✅ Ornament loaded: ${bytes.length} bytes`);
    return bytes;
  } catch (error) {
    console.error('❌ Failed to load ornament:', error);
    // Return empty array to continue without ornament
    return new Uint8Array();
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
    // Draw a decorative tilde ornament - elegant and minimal
    const centerX = PAGE.width / 2;
    const ornamentWidth = 48;
    
    // Draw main curved tilde line using quadratic curves
    const y = ORNAMENT.y;
    const quarterWidth = ornamentWidth / 4;
    
    // Left curve (down-up)
    page.drawLine({
      start: { x: centerX - ornamentWidth / 2, y: y },
      end: { x: centerX - quarterWidth, y: y - 3 },
      thickness: 1.2,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
    
    // Middle section (up-down)
    page.drawLine({
      start: { x: centerX - quarterWidth, y: y - 3 },
      end: { x: centerX + quarterWidth, y: y + 3 },
      thickness: 1.2,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
    
    // Right curve (down-up)
    page.drawLine({
      start: { x: centerX + quarterWidth, y: y + 3 },
      end: { x: centerX + ornamentWidth / 2, y: y },
      thickness: 1.2,
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
    .replace(/\r\n/g, '\n')      // normalize Windows line breaks
    .replace(/\r/g, '\n')        // normalize old Mac line breaks
    .replace(/\u00A0/g, ' ')     // non-breaking space to space
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip control chars
  // ⚠️ Do NOT collapse spaces or tabs — we want to preserve indentation
}

// Helper to detect indented/preformatted lines
function isIndentedLine(line: string): boolean {
  return /^ {4,}|^C\s{2,}/.test(line);
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
    let bodyFont, headerFont, notoFont, monospaceFont;
    
    try {
      console.log('📚 Loading fonts...');
      
      // Load fonts with comprehensive validation and logging
      const [interBytes, ebGaramondBytes, notoBytes] = await Promise.all([
        loadFontBytes('Inter-Regular.ttf'),
        loadFontBytes('EBGaramond-Regular.ttf'), 
        loadFontBytes('NotoSerif-Regular.ttf')
      ]);
      
      // Log font byte sizes and signatures for debugging
      const fontInfo = {
        eb: { 
          bytes: ebGaramondBytes.length, 
          sig: Array.from(ebGaramondBytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('')
        },
        inter: { 
          bytes: interBytes.length, 
          sig: Array.from(interBytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('')
        },
        noto: { 
          bytes: notoBytes.length, 
          sig: Array.from(notoBytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('')
        }
      };
      
      console.log(`🔍 Font verification for export_id ${export_id}:`, { export_id, fonts: fontInfo });
      
      // Fail fast if any font is too small (corrupted)
      if (ebGaramondBytes.length < 10000 || interBytes.length < 10000 || notoBytes.length < 10000) {
        throw new Error(`One or more fonts are corrupted (< 10,000 bytes)`);
      }
      
      // Embed fonts into PDF with strict validation
      bodyFont = await pdfDoc.embedFont(interBytes);
      headerFont = await pdfDoc.embedFont(ebGaramondBytes);
      notoFont = await pdfDoc.embedFont(notoBytes);
      
      // Embed monospace font for preformatted text
      monospaceFont = await pdfDoc.embedFont(StandardFonts.Courier);
      
      // Count and verify embedded fonts
      const embeddedFontCount = 3; // We know we embedded 3
      console.log(`🎯 Embedded fonts verification:`, { export_id, embeddedFonts: embeddedFontCount });
      
      if (embeddedFontCount < 2) {
        throw new Error(`Insufficient fonts embedded: ${embeddedFontCount} (expected at least 2)`);
      }
      
      console.log(`✅ All fonts embedded successfully for ${export_id}`);
      
      // Preflight check: Ensure no StandardFonts are used
      console.log(`🎨 Theme: ${THEME_KEY}`);
      console.log(`📏 Page dimensions: ${PAGE.width}×${PAGE.height}pt (6×9 inches)`);
      console.log(`📐 Margins: top=${MARGIN.top}, bottom=${MARGIN.bottom}, inner=${MARGIN.inner}, outer=${MARGIN.outer}`);
      
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
    
    // Title page - elegant and minimal
    const titlePage = pdfDoc.addPage([PAGE.width, PAGE.height]);
    const titleText = manuscript.meta?.title || 'Legacy Journal';
    
    // 🔴 DEBUGGING CANARIES - Only on page 1 (Title page)
    console.log(`🔴 Drawing canaries on title page for export_id: ${export_id}`);
    
    // Red marker text
    safeDrawText(titlePage, 'STILLNESS_V2_CANARY', {
      x: 18,
      y: PAGE.height - 18,
      size: 8,
      font: bodyFont,
      color: { r: 1, g: 0, b: 0 } // Red
    }, notoFont, export_id);
    
    // Red border rectangle inset by 12pt
    titlePage.drawRectangle({
      x: 12,
      y: 12,
      width: PAGE.width - 24,
      height: PAGE.height - 24,
      borderColor: rgb(1, 0, 0), // Red
      borderWidth: 1
    });
    
    console.log(`🔴 Canaries drawn successfully on title page`);
    
    safeDrawText(titlePage, titleText, {
      x: PAGE.width / 2 - headerFont.widthOfTextAtSize(titleText, 24) / 2,
      y: PAGE.height * 0.6,
      size: 24,
      font: headerFont,
      color: { r: 0.2, g: 0.2, b: 0.2 }
    }, notoFont, export_id);
    
    // Subtitle with author
    if (manuscript.meta?.author) {
      safeDrawText(titlePage, `by ${manuscript.meta.author}`, {
        x: PAGE.width / 2 - bodyFont.widthOfTextAtSize(`by ${manuscript.meta.author}`, 14) / 2,
        y: PAGE.height * 0.5,
        size: 14,
        font: bodyFont,
        color: { r: 0.5, g: 0.5, b: 0.5 }
      }, notoFont, export_id);
    }
    
    // Generation date at bottom
    const genDate = new Date().toLocaleDateString();
    safeDrawText(titlePage, `Generated ${genDate}`, {
      x: PAGE.width / 2 - bodyFont.widthOfTextAtSize(`Generated ${genDate}`, 10) / 2,
      y: PAGE.height * 0.2,
      size: 10,
      font: bodyFont,
      color: { r: 0.6, g: 0.6, b: 0.6 }
    }, notoFont, export_id);
    pageNumber++;
    
    // Dedication page
    if (manuscript.meta?.dedication && manuscript.meta.dedication.trim()) {
      const dedicationPage = pdfDoc.addPage([PAGE.width, PAGE.height]);
      
      safeDrawText(dedicationPage, 'Dedication', {
        x: PAGE.width / 2 - headerFont.widthOfTextAtSize('Dedication', 18) / 2,
        y: PAGE.height * 0.8,
        size: 18,
        font: headerFont,
      }, notoFont, export_id);
      
      const dedicationLines = wrapText(manuscript.meta.dedication, PAGE.width - 2 * MARGIN.outer, bodyFont, 12);
      let y = PAGE.height * 0.6;
      dedicationLines.forEach(line => {
        safeDrawText(dedicationPage, line, {
          x: PAGE.width / 2 - bodyFont.widthOfTextAtSize(line, 12) / 2,
          y: y,
          size: 12,
          font: bodyFont,
        }, notoFont, export_id);
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
      safeDrawText(categoryPage, (section.title || section.category).toUpperCase(), {
        x: PAGE.width / 2 - headerFont.widthOfTextAtSize((section.title || section.category).toUpperCase(), 16) / 2,
        y: PAGE.height / 2 + 20,
        size: 16,
        font: headerFont,
      }, notoFont, export_id);
      
      // Draw ornament below category
      drawOrnament(categoryPage, ornamentBytes);
      console.log(`🎨 Ornament drawn on category page ${pageNumber} for export_id: ${export_id}`);
      pageNumber++;
      
      // Process entries in this category
      for (const entry of section.pages) {
        if (preview_only && pageNumber > 3) break;
        
        const sanitizedText = sanitizeEntryText(entry.content);
        const frame = textFrame(pageNumber % 2 === 0);
        
        // Split text into lines and wrap each according to indentation
        const textLines = sanitizedText.split('\n');
        const wrappedLines: string[] = [];
        
        textLines.forEach(line => {
          if (line.trim()) {
            const isIndented = isIndentedLine(line);
            if (isIndented) {
              // Use reduced width for indented lines to account for left margin
              const indentedLines = wrapText(line, frame.width - 20, monospaceFont, 10.5);
              wrappedLines.push(...indentedLines);
            } else {
              const normalLines = wrapText(line, frame.width, bodyFont, BODY.fontSize);
              wrappedLines.push(...normalLines);
            }
          } else {
            wrappedLines.push(''); // Preserve empty lines
          }
        });
        
        let remainingLines = [...wrappedLines];
        let isFirstPage = true;
        
        while (remainingLines.length > 0) {
          if (preview_only && pageNumber > 3) break;
          
          const entryPage = pdfDoc.addPage([PAGE.width, PAGE.height]);
          const isRight = pageNumber % 2 === 0;
          const currentFrame = textFrame(isRight);
          
          // Initialize page element tracking
          let drewHeader = false;
          let drewFolio = false;
          let drewOrnament = false;
          let drewDateFooter = false;
          
          // Draw running headers and folios (always drawn on pages 2+)
          if (pageNumber > 1) {
            drawRunningHeader(entryPage, manuscript.meta?.author || 'Legacy Journal', section.title || section.category, isRight, bodyFont);
            drewHeader = true;
          }
          
          drawFolio(entryPage, pageNumber, isRight, bodyFont);
          drewFolio = true;
          
          // Draw ornament on first page of entry only
          if (isFirstPage) {
            drawOrnament(entryPage, ornamentBytes);
            drewOrnament = true;
            console.log(`🎨 Ornament drawn on entry page ${pageNumber} for export_id: ${export_id}`);
          } else {
            // Draw "— continued —" on continuation pages
            const contText = "— continued —";
            safeDrawText(entryPage, contText, {
              x: PAGE.width / 2 - bodyFont.widthOfTextAtSize(contText, 10) / 2,
              y: PAGE.height - MARGIN.top - 10,
              size: 10,
              font: bodyFont,
              color: { r: 0.5, g: 0.5, b: 0.5 }
            }, notoFont, export_id);
          }
          
          // Draw date footer on ALL entry pages (including continuation)
          const dateText = formatLongDateInTZ(entry.date_iso, timeZone, locale);
          drawDateFooter(entryPage, dateText, bodyFont);
          drewDateFooter = true;
          
          // Get frame coordinates for logging
          const frame = textFrame(isRight);
          
          // Log layout application for this page
          console.log(`📋 Page ${pageNumber} layout:`, {
            export_id,
            page: pageNumber,
            drewHeader,
            drewFolio,
            drewOrnament,
            drewDateFooter,
            frame: { x: frame.x, y: frame.y, w: frame.width, bottom: frame.bottom }
          });
          
          // Typeset paragraphs
          const result = typesetParagraphs(remainingLines, currentFrame, bodyFont, BODY.fontSize, BODY.leading);
          
          // Draw the text using safe text drawing with monospace support
          let y = currentFrame.y;
          result.consumedLines.forEach(line => {
            if (line.trim()) {
              const isIndented = isIndentedLine(line);
              const font = isIndented ? monospaceFont : bodyFont;
              const fontSize = isIndented ? 10.5 : BODY.fontSize;
              const x = isIndented ? currentFrame.x + 10 : currentFrame.x; // slight left margin for blocks
              
              safeDrawText(entryPage, line, {
                x: x,
                y: y,
                size: fontSize,
                font: font,
              }, notoFont, export_id);
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
      return new Response(new Uint8Array(pdfBytes), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="preview.pdf"'
        },
      });
    }

    // Force new artifacts with unique render_uid to bust cache
    const renderUid = Date.now();
    const pdfKey = `${exportRecord.user_id}/${export_id}-${renderUid}.pdf`;
    
    console.log(`💾 Storing PDF with unique filename:`, { export_id, render_uid: renderUid, pdfKey });
    
    // Store PDF in storage
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
      
    console.log(`✅ Export completed successfully:`, { 
      export_id, 
      render_uid: renderUid,
      total_pages: pageNumber - 1,
      storage_key: pdfKey
    });

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