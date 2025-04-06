
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get environment variables
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
if (!PERPLEXITY_API_KEY) {
  throw new Error("PERPLEXITY_API_KEY not found in environment variables.");
}

// CORS headers
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
    // Get the JSON body
    const { message, userId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Missing message parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received chat message from user ${userId}: "${message}"`);
    
    // Create a Supabase client for accessing storage
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // Fetch personality data to include in the system prompt
    const userFolder = `user_data/${userId}`;
    let personalityReport = "";
    let personalityTiles = {};
    
    try {
      // Get personality report
      const { data: reportData, error: reportError } = await supabaseClient.storage
        .from('user_files')
        .download(`${userFolder}/personality_report.txt`);
      
      if (!reportError) {
        personalityReport = await reportData.text();
      }
      
      // Get personality tiles
      const { data: tilesData, error: tilesError } = await supabaseClient.storage
        .from('user_files')
        .download(`${userFolder}/personality_tiles.json`);
      
      if (!tilesError) {
        const tilesText = await tilesData.text();
        personalityTiles = JSON.parse(tilesText);
      }
    } catch (error) {
      console.error("Error fetching personality data:", error);
      // Continue even if we can't get the personality data
    }
    
    // Create system prompt including personality data
    const systemPrompt = `You are CityScout, a friendly and knowledgeable travel and city exploration assistant. 
Your job is to help the user plan trips, discover new places, create schedules, and explore cities based on their preferences.

IMPORTANT: Always keep in mind the user's personal preferences and interests when making recommendations.

THE USER'S PERSONALITY PROFILE:
${personalityReport}

THE USER'S INTERESTS AND PREFERENCES:
${JSON.stringify(personalityTiles, null, 2)}

Guidelines:
1. Focus exclusively on travel advice, city exploration, trip planning, scheduling, and recommendations for places to visit.
2. Use the user's preferences and interests to personalize your suggestions.
3. If asked about topics unrelated to travel, city exploration, or scheduling, politely redirect the conversation back to how you can help with travel planning.
4. Be concise but helpful in your responses.
5. If the user hasn't provided enough information for a personalized recommendation, ask follow-up questions about their preferences.
6. Prefer giving specific recommendations over general advice.
7. When recommending places, consider the user's documented interests from their profile.
8. Format your responses clearly with paragraph breaks. Don't use markdown formatting.`;

    // Call Perplexity API
    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        frequency_penalty: 1,
        presence_penalty: 0
      })
    });

    if (!perplexityResponse.ok) {
      const errorData = await perplexityResponse.json();
      console.error("Perplexity API error:", errorData);
      throw new Error(`Perplexity API error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await perplexityResponse.json();
    const assistantReply = responseData.choices[0].message.content;

    return new Response(
      JSON.stringify({ reply: assistantReply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
