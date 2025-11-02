import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedPrompt {
  text: string;
  hash: string;
}

interface SyncRequest {
  rawText: string;
  dryRun?: boolean;
}

interface SyncResponse {
  success: boolean;
  total: number;
  new: number;
  duplicates: number;
  newPrompts: ParsedPrompt[];
  duplicatePrompts: ParsedPrompt[];
  inserted?: number;
  error?: string;
}

function parsePrompts(rawText: string): string[] {
  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by blank lines (two or more consecutive newlines)
  const chunks = normalized.split(/\n\s*\n/);
  
  const prompts: string[] = [];
  
  for (const chunk of chunks) {
    let line = chunk.trim();
    
    // Remove numbering (e.g., "1.", "2)", "3 -", etc.)
    line = line.replace(/^\d+[\.\)\-\s]+/, '');
    
    // Remove leading bullets or dashes
    line = line.replace(/^[\-\*•]\s*/, '');
    
    // Skip if too short (likely accidental fragment)
    if (line.length < 10) continue;
    
    // Replace internal line breaks with spaces (preserve multi-line prompts)
    line = line.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    prompts.push(line);
  }
  
  return prompts;
}

async function hashPrompt(text: string): Promise<string> {
  // Normalize: lowercase, collapse whitespace, remove trailing punctuation
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\.!?]+$/, '');
  
  // Generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { rawText, dryRun = false }: SyncRequest = await req.json();

    if (!rawText || rawText.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Raw text is required' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Parsing prompts from raw text...');
    const parsedTexts = parsePrompts(rawText);
    console.log(`Parsed ${parsedTexts.length} prompts`);

    // Generate hashes for all prompts
    const parsedPrompts: ParsedPrompt[] = [];
    for (const text of parsedTexts) {
      const hash = await hashPrompt(text);
      parsedPrompts.push({ text, hash });
    }

    // Check which hashes already exist in database
    const hashes = parsedPrompts.map(p => p.hash);
    const { data: existingPrompts, error: queryError } = await supabase
      .from('prompts')
      .select('hash')
      .in('hash', hashes);

    if (queryError) {
      console.error('Error querying existing prompts:', queryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database query failed: ${queryError.message}` 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const existingHashes = new Set(existingPrompts?.map(p => p.hash) || []);
    
    const newPrompts = parsedPrompts.filter(p => !existingHashes.has(p.hash));
    const duplicatePrompts = parsedPrompts.filter(p => existingHashes.has(p.hash));

    console.log(`New prompts: ${newPrompts.length}, Duplicates: ${duplicatePrompts.length}`);

    let inserted = 0;

    // If not dry run, insert new prompts
    if (!dryRun && newPrompts.length > 0) {
      const batchDate = new Date().toISOString().split('T')[0];
      
      const promptsToInsert = newPrompts.map(p => ({
        text: p.text,
        hash: p.hash,
        source_type: 'handwritten',
        batch_date: batchDate,
        active: true
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('prompts')
        .insert(promptsToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting prompts:', insertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to insert prompts: ${insertError.message}` 
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      inserted = insertedData?.length || 0;
      console.log(`Successfully inserted ${inserted} prompts`);
    }

    const response: SyncResponse = {
      success: true,
      total: parsedPrompts.length,
      new: newPrompts.length,
      duplicates: duplicatePrompts.length,
      newPrompts,
      duplicatePrompts,
      ...(dryRun ? {} : { inserted })
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in sync-handwritten-prompts function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
