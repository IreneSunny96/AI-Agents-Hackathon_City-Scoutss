
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

    const messages = [
      {
        role: "system",
        content: "You are a helpful assistant with web search capabilities. Provide accurate and up-to-date information."
      },
      {
        role: "user",
        content: query
      }
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: [{ type: "web_search" }],
      tool_choice: "auto"
    });

    const result = response.choices[0]?.message?.content || "I couldn't find any relevant information. Please try again.";
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
