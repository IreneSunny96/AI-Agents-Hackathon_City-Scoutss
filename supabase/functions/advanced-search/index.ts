
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://esm.sh/openai@4.26.0";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    if (!openAIApiKey) {
      throw new Error('Missing OpenAI API key');
    }

    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query parameter');
    }

    console.log('Advanced search query:', query);
    
    const client = new OpenAI({
      apiKey: openAIApiKey
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a travel assistant that helps users discover places and activities. Use web search to provide up-to-date information about locations, attractions, and events."
        },
        {
          role: "user",
          content: query
        }
      ],
      tools: [{ type: "web_search" }],
      temperature: 0.7,
    });

    const result = response.choices[0].message.content;
    console.log('Search response:', result);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in advanced search function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
