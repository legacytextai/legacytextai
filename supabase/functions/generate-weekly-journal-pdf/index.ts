import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import jsPDF from 'https://esm.sh/jspdf@2.5.1';

// Helper to detect indented/preformatted lines
function isIndentedLine(line: string): boolean {
  return /^ {4,}|^C\s{2,}/.test(line);
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JournalEntry {
  id: number;
  content: string;
  received_at: string;
  category?: string;
  name?: string;
}

interface WeeklyPDFRequest {
  user_id: string;
  week_start_date: string;
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

    const { user_id, week_start_date }: WeeklyPDFRequest = await req.json();

    if (!user_id || !week_start_date) {
      return new Response(
        JSON.stringify({ error: 'user_id and week_start_date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating weekly PDF for user ${user_id}, week starting ${week_start_date}`);

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users_app')
      .select('name, email')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate week end date
    const weekStart = new Date(week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get journal entries from the past week
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('id, content, received_at, category, name')
      .eq('user_id', user_id)
      .gte('received_at', weekStart.toISOString())
      .lte('received_at', weekEnd.toISOString())
      .order('received_at', { ascending: true });

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch journal entries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${entries?.length || 0} entries for the week`);

    // Generate PDF
    const pdf = new jsPDF();
    
    // Title page
    pdf.setFontSize(24);
    pdf.text(`${user.name || 'Your'} Weekly Legacy Journal`, 20, 30);
    
    pdf.setFontSize(14);
    const weekStartStr = weekStart.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const weekEndStr = weekEnd.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    pdf.text(`Week of ${weekStartStr} - ${weekEndStr}`, 20, 50);
    
    if (!entries || entries.length === 0) {
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('No journal entries found for this week.', 20, 30);
      pdf.setFontSize(12);
      pdf.text('Keep writing to build your legacy!', 20, 50);
    } else {
      // Add entries
      entries.forEach((entry: JournalEntry, index: number) => {
        pdf.addPage();
        
        // Entry date header
        pdf.setFontSize(14);
        const entryDate = new Date(entry.received_at).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        pdf.text(entryDate, 20, 30);
        
        // Entry content with indentation support
        pdf.setFontSize(12);
        const sanitizedContent = sanitizeEntryText(entry.content);
        const lines = sanitizedContent.split('\n');
        let y = 50;
        
        lines.forEach(line => {
          const isIndented = isIndentedLine(line);
          if (isIndented) {
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(11);
            // Apply text wrapping for indented lines with reduced width for indentation
            const splitText = pdf.splitTextToSize(line, 145); // 170 - 25 for left margin
            pdf.text(splitText, 25, y, { baseline: 'top' });
            y += (splitText.length - 1) * 6; // adjust for multi-line
          } else {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(12);
            const splitText = pdf.splitTextToSize(line, 170);
            pdf.text(splitText, 20, y, { baseline: 'top' });
            y += (splitText.length - 1) * 6; // adjust for multi-line
          }
          y += 8;
        });
        
        // Add category if available
        if (entry.category) {
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Category: ${entry.category}`, 20, pdf.internal.pageSize.height - 20);
          pdf.setTextColor(0, 0, 0); // Reset to black
        }
      });
    }

    // Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer');
    const pdfBytes = new Uint8Array(pdfBuffer);

    console.log(`PDF generated successfully, size: ${pdfBytes.length} bytes`);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBytes.length.toString(),
      }
    });

  } catch (error) {
    console.error('Error in generate-weekly-journal-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);