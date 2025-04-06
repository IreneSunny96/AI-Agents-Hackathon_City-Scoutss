import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get environment variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY not found in environment variables.");
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
3. But Try NOT to SUGGEST the places the user already been to. ADD a hint of surprise and exploration that the personality would like.
4. If asked about topics unrelated to travel, city exploration, or scheduling, politely redirect the conversation back to how you can help with travel planning.
5. Be concise but helpful in your responses.
6. If the user hasn't provided enough information for a personalized recommendation, ask follow-up questions about their preferences.
7. Prefer giving specific recommendations over general advice.
8. When recommending places, consider the user's documented interests from their profile.
9. Format your responses clearly with paragraph breaks. Don't use markdown formatting.`;

    // Call OpenAI API with gpt-4o-mini model
    console.log('Calling OpenAI API with gpt-4o-mini model');
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "o3-mini",
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
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await openaiResponse.json();
    
    // Log the response
    console.log("OpenAI API response:", JSON.stringify(responseData));
    
    return new Response(
      JSON.stringify(responseData),
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
