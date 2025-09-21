import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManuscriptRequest {
  user_id: string;
  theme: string;
}

interface ManuscriptMeta {
  title: string;
  author: string;
  dedication: string;
  timezone: string;
}

interface ManuscriptPage {
  entry_id: string;
  body: string;
  date_iso: string;
  continued: boolean;
}

interface ManuscriptSection {
  category: string;
  pages: ManuscriptPage[];
}

interface Manuscript {
  meta: ManuscriptMeta;
  sections: ManuscriptSection[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, theme = 'stillness' }: ManuscriptRequest = await req.json();
    
    console.log('Building manuscript for user:', user_id, 'theme:', theme);

    // Get user profile data
    const { data: userProfile, error: userError } = await supabase
      .from('users_app')
      .select('name, dedication, timezone')
      .eq('id', user_id)
      .single();

    if (userError) {
      console.error('Error fetching user profile:', userError);
      throw new Error('Failed to fetch user profile');
    }

    // Get journal entries
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('id, content, category, received_at')
      .eq('user_id', user_id)
      .order('received_at', { ascending: true });

    if (entriesError) {
      console.error('Error fetching journal entries:', entriesError);
      throw new Error('Failed to fetch journal entries');
    }

    if (!entries || entries.length === 0) {
      throw new Error('No journal entries found for user');
    }

    // Generate content signature for idempotency
    const lastUpdated = Math.max(...entries.map(e => new Date(e.received_at).getTime()));
    const contentSignature = await generateContentSignature(
      user_id, 
      userProfile.dedication || '', 
      entries.map(e => e.id).join(','),
      lastUpdated.toString()
    );

    console.log('Content signature:', contentSignature);

    // Check for existing export with same signature within 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingExport } = await supabase
      .from('exports')
      .select('*')
      .eq('user_id', user_id)
      .eq('kind', 'premium_pdf')
      .eq('content_signature', contentSignature)
      .gte('created_at', oneDayAgo)
      .eq('status', 'ready')
      .single();

    if (existingExport) {
      console.log('Found existing export, returning:', existingExport.id);
      return new Response(JSON.stringify({ 
        export_id: existingExport.id,
        status: 'ready',
        url: existingExport.url,
        page_count: existingExport.page_count
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new export record
    const { data: newExport, error: exportError } = await supabase
      .from('exports')
      .insert({
        user_id,
        kind: 'premium_pdf',
        status: 'formatting',
        content_signature
      })
      .select()
      .single();

    if (exportError) {
      console.error('Error creating export record:', exportError);
      throw new Error('Failed to create export record');
    }

    console.log('Created new export:', newExport.id);

    // Group entries by category
    const categoryMap = new Map<string, typeof entries>();
    entries.forEach(entry => {
      const category = entry.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(entry);
    });

    // Sort categories by frequency, then alphabetically
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => {
        const freqDiff = b[1].length - a[1].length;
        return freqDiff !== 0 ? freqDiff : a[0].localeCompare(b[0]);
      });

    // Build manuscript structure
    const manuscript: Manuscript = {
      meta: {
        title: `${userProfile.name || 'My'} Legacy Journal`,
        author: userProfile.name || 'Anonymous',
        dedication: userProfile.dedication || '',
        timezone: userProfile.timezone || 'America/Los_Angeles'
      },
      sections: sortedCategories.map(([category, categoryEntries]) => ({
        category,
        pages: categoryEntries.map(entry => ({
          entry_id: entry.id,
          body: entry.content,
          date_iso: entry.received_at,
          continued: false
        }))
      }))
    };

    // Store manuscript in storage
    const manuscriptKey = `${user_id}/${newExport.id}.json`;
    const { error: storageError } = await supabase.storage
      .from('manuscripts')
      .upload(manuscriptKey, JSON.stringify(manuscript, null, 2), {
        contentType: 'application/json'
      });

    if (storageError) {
      console.error('Error storing manuscript:', storageError);
      throw new Error('Failed to store manuscript');
    }

    // Update export record with manuscript key and move to rendering status
    const { error: updateError } = await supabase
      .from('exports')
      .update({
        storage_key_manuscript: manuscriptKey,
        status: 'rendering'
      })
      .eq('id', newExport.id);

    if (updateError) {
      console.error('Error updating export record:', updateError);
      throw new Error('Failed to update export record');
    }

    console.log('Manuscript stored and export updated to rendering status');

    return new Response(JSON.stringify({ 
      export_id: newExport.id,
      status: 'rendering',
      manuscript_key: manuscriptKey
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in build-ebook-manuscript function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function generateContentSignature(userId: string, dedication: string, entryIds: string, lastUpdated: string): Promise<string> {
  const content = `${userId}:${dedication}:${entryIds}:${lastUpdated}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(handler);