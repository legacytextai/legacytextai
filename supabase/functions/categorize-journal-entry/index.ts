import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entryId, content, batchMode = false } = await req.json();
    
    if (!content) {
      throw new Error('No content provided for categorization');
    }

    console.log(`Categorizing entry ${entryId}: ${content.substring(0, 50)}...`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call OpenAI to categorize the content
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that categorizes personal journal entries for fathers. 
            
            Analyze the content and assign ONE of these specific categories:
            - "Values" - entries about principles, beliefs, and moral guidance
            - "Advice" - direct guidance, tips, or lessons for children
            - "Memories" - recollections of special moments, experiences, or milestones  
            - "Work Ethics" - entries about professional life, career lessons, or work-life balance
            - "Faith" - spiritual content, religious thoughts, or faith-based guidance
            - "Family" - entries about family relationships, traditions, or family history
            - "Life Lessons" - general wisdom, learning experiences, or philosophical thoughts
            - "Encouragement" - supportive messages, motivation, or pride in achievements
            - "Reflection" - personal thoughts, self-analysis, or contemplative content
            - "Future Hopes" - dreams, aspirations, or hopes for the future

            Respond with ONLY the category name, nothing else. If the content doesn't clearly fit any category, use "Reflection".`
          },
          {
            role: 'user', 
            content: `Categorize this journal entry: "${content}"`
          }
        ],
        max_tokens: 10,
        temperature: 0.3,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResult = await openAIResponse.json();
    const category = aiResult.choices[0].message.content.trim();
    
    console.log(`AI categorized entry as: ${category}`);

    // Update the journal entry with the category
    const { error: updateError } = await supabase
      .from('journal_entries')
      .update({ category })
      .eq('id', entryId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update entry: ${updateError.message}`);
    }

    console.log(`Successfully updated entry ${entryId} with category: ${category}`);

    return new Response(JSON.stringify({ 
      success: true, 
      category,
      entryId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in categorize-journal-entry function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});