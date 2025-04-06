
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

// Helper function to generate personality insights
const getPersonalityData = async (userId: string, supabaseClient: any) => {
  try {
    // Fetch personality data
    let personalityReport = "";
    let personalityTiles = {};
    
    try {
      // First try to get data from the database tables
      
      // Get personality report from user_data table
      const { data: reportData, error: reportError } = await supabaseClient
        .from('user_data')
        .select('content')
        .eq('user_id', userId)
        .eq('data_type', 'personality_report')
        .single();
        
      if (!reportError && reportData?.content) {
        personalityReport = reportData.content;
        console.log("Successfully retrieved personality report from database");
      } else {
        console.log("Could not fetch personality report from database:", reportError?.message);
      }
      
      // Get personality tiles from user_data table
      const { data: tilesData, error: tilesError } = await supabaseClient
        .from('user_data')
        .select('content')
        .eq('user_id', userId)
        .eq('data_type', 'personality_tiles')
        .single();
        
      if (!tilesError && tilesData?.content) {
        try {
          personalityTiles = JSON.parse(tilesData.content);
          console.log("Successfully retrieved personality tiles from database");
        } catch (parseError) {
          console.error("Error parsing personality tiles from database:", parseError);
        }
      } else {
        console.log("Could not fetch personality tiles from database:", tilesError?.message);
      }
      
      // If we couldn't get data from the database, fall back to the profile table and storage
      if (!personalityReport || Object.keys(personalityTiles).length === 0) {
        console.log("Falling back to profile table and storage for personality data");
        
        // Try to get tiles from the profile
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('personality_tiles')
          .eq('id', userId)
          .single();
          
        if (!profileError && profileData?.personality_tiles) {
          personalityTiles = profileData.personality_tiles;
          console.log("Successfully retrieved personality tiles from profile");
        } else {
          console.log("Could not fetch personality tiles from profile:", profileError?.message);
        }
        
        // Check if user_files bucket exists
        const { data: buckets } = await supabaseClient.storage.listBuckets();
        const userFilesBucket = buckets.find((b: any) => b.name === 'user_files');
        
        if (userFilesBucket) {
          // Try to get personality report from storage
          const userFolder = `user_data/${userId}`;
          const { data: reportStorageData, error: reportStorageError } = await supabaseClient.storage
            .from('user_files')
            .download(`${userFolder}/personality_report.txt`);
          
          if (!reportStorageError) {
            personalityReport = await reportStorageData.text();
            console.log("Successfully retrieved personality report from storage");
          } else {
            console.log("Could not fetch personality report from storage:", reportStorageError.message);
          }
          
          // If we still don't have tiles, try to get them from storage
          if (Object.keys(personalityTiles).length === 0) {
            const { data: tilesStorageData, error: tilesStorageError } = await supabaseClient.storage
              .from('user_files')
              .download(`${userFolder}/personality_tiles.json`);
              
            if (!tilesStorageError) {
              try {
                const tilesText = await tilesStorageData.text();
                personalityTiles = JSON.parse(tilesText);
                console.log("Successfully retrieved personality tiles from storage");
              } catch (parseError) {
                console.error("Error parsing personality tiles from storage:", parseError);
              }
            } else {
              console.log("Could not fetch personality tiles from storage:", tilesStorageError.message);
            }
          }
        } else {
          console.log("user_files bucket does not exist");
        }
      }
    } catch (error) {
      console.error("Error fetching personality data:", error);
    }
    
    return { personalityReport, personalityTiles };
  } catch (error) {
    console.error("Error in getPersonalityData:", error);
    return { personalityReport: "", personalityTiles: {} };
  }
};

// Function to send prompt data to webhook
const sendToWebhook = async (systemPrompt: string, userMessage: string) => {
  try {
    const response = await fetch('https://roshantest.app.n8n.cloud/webhook-test/d6b247e5-7d68-486b-a887-48e419107e40', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userMessage,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error('Failed to send data to webhook:', await response.text());
    } else {
      console.log('Successfully sent prompt data to webhook');
    }
  } catch (error) {
    console.error('Error sending data to webhook:', error);
  }
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
    
    // Fetch personality data using our enhanced function
    const { personalityReport, personalityTiles } = await getPersonalityData(userId, supabaseClient);
    
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

    // Send the prompt data to the webhook
    EdgeRuntime.waitUntil(sendToWebhook(systemPrompt, message));

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
