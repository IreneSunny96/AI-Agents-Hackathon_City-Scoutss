
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

// Define the JSON schema for personality tiles
const personalityTilesSchema = {
  "name": "personality_tiles",
  "description": "JSON Response model for personality tiles schema.",
  "strict": true,
  "properties": { 
    "Lifestyle Vibes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "Lifestyle Vibes Reason": {
      "type": "string",
      "description": "A brief description of the lifestyle vibes selected above based on the user's data."
    },
    "Food & Drink Favorites": {
      "type": "array",
      "items": { "type": "string" }
    },
    "Food & Drink Favorites Reason": {
      "type": "string",
      "description": "A brief description of the food & drink favorites selected above based on the user's data."
    },
    "Go-to Activities": {
      "type": "array",
      "items": { "type": "string" }
    },
    "Go-to Activities Reason": {
      "type": "string",
      "description": "A brief description of the go-to activities selected above based on the user's data."
    },
    "Favorite Neighborhoods or Place Types": {
      "type": "array",
      "items": { "type": "string" }
    },
    "Favorite Neighborhoods or Place Types Reason": {
      "type": "string",
      "description": "A brief description of the favorite neighborhoods or place types selected above based on the user's data."
    },
    "Travel & Exploration": {
      "type": "array",
      "items": { "type": "string" }
    },
    "Travel & Exploration Reason": {
      "type": "string",
      "description": "A brief description of the travel & exploration selected above based on the user's data."
    },
    "Other": {
      "type": "array",
      "items": { "type": "string" }
    },
    "Other Reason": {
      "type": "string",
      "description": "A brief description of the others selected above based on the user's data."
    }
  },
  "required": [
    "Lifestyle Vibes",
    "Lifestyle Vibes Reason",
    "Food & Drink Favorites",
    "Food & Drink Favorites Reason",
    "Go-to Activities",
    "Go-to Activities Reason",
    "Favorite Neighborhoods or Place Types",
    "Favorite Neighborhoods or Place Types Reason",
    "Travel & Exploration",
    "Travel & Exploration Reason",
    "Other",
    "Other Reason"
  ],
  "additionalProperties": false
};

// Main function to generate personality insights
const generatePersonalityInsights = async (userId: string, supabaseClient: any) => {
  console.log(`Generating personality insights for user ${userId}`);
  
  try {
    // 1. Retrieve the processed files from storage
    const filesNeeded = [
      'searches_top_20.json',
      'directions_top_20.json',
      'views_top_20.json',
      'search_stats.csv'
    ];
    
    const userFolder = `user_data/${userId}`;
    const fileContents: Record<string, any> = {};
    
    // Download each file from storage
    for (const fileName of filesNeeded) {
      const filePath = `${userFolder}/${fileName}`;
      
      const { data, error } = await supabaseClient.storage
        .from('user_files')
        .download(filePath);
      
      if (error) {
        console.error(`Error downloading ${fileName}:`, error);
        throw new Error(`Failed to download ${fileName}: ${error.message}`);
      }
      
      if (fileName.endsWith('.json')) {
        // Parse JSON files
        const fileText = await data.text();
        fileContents[fileName] = fileText;
      } else if (fileName.endsWith('.csv')) {
        // Read CSV file as text
        const fileText = await data.text();
        fileContents[fileName] = fileText;
      }
    }
    
    console.log('Successfully retrieved all required files');
    
    // 2. Prepare data for OpenAI prompts
    let searchTop20 = fileContents['searches_top_20.json'];
    let directionsTop20 = fileContents['directions_top_20.json'];
    let viewsTop20 = fileContents['views_top_20.json'];
    const searchStatsCSV = fileContents['search_stats.csv'];
    
    // Replace field names as required
    searchTop20 = searchTop20.replace(/"title_cleaned"/g, '"place_searched"');
    directionsTop20 = directionsTop20.replace(/"title_cleaned"/g, '"place_been_to"');
    viewsTop20 = viewsTop20.replace(/"title_cleaned"/g, '"place_viewed"');
    
    // 3. Process search statistics
    const searchStatsLines = searchStatsCSV.split('\n');
    const searchStatsHeaders = searchStatsLines[0].split(',');
    const totalSearchesLines = [];
    
    for (let i = 1; i < searchStatsLines.length; i++) {
      const line = searchStatsLines[i];
      if (!line.trim()) continue;
      
      const values = line.split(',');
      const row: Record<string, string> = {};
      
      searchStatsHeaders.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim().replace(/^"|"$/g, '') || '';
      });
      
      totalSearchesLines.push(`Search ${i}: ${row['title_cleaned']}, Searched ${row['count']} times, Place type: ${row['place_type']}`);
    }
    
    const totalSearches = totalSearchesLines.join('\n');
    
    // 4. Format prompts
    // First prompt for the personality report
    const personalityReportPrompt = `
You are an expert data analyst specializing in user behavior and persona creation. Analyze the provided Google Maps search and usage data to create a detailed persona report. Your report should be engaging, insightful, and formatted with emojis and bullet points for easy readability.

Data to analyze:
<top_views>
${viewsTop20}
</top_views>

<top_directions>
${directionsTop20}
</top_directions>

<top_searches>
${searchTop20}
</top_searches>

<full_searches>
${totalSearches}
</full_searches>

Create a very detailed persona report with the following sections:

1. 🍜 Preferences & Interests
   - Food & Cuisine: Analyze favorite cuisines, restaurants, and food-related searches.
   - Other interests: Identify hobbies, entertainment preferences, shopping habits, etc.
   - Use relevant emojis and provide specific examples from the data.

2. 🧘‍♂️ Activities & Lifestyle
   - Fitness & Health: Identify gym visits, sports activities, health-related searches.
   - Other regular activities: Analyze patterns in the user's daily or weekly routines.
   - Provide concrete examples and use appropriate emojis.

3. 🎭 Interests & Personality Traits
   - Cultural activities: Museums, theaters, events, etc.
   - Entertainment: Movies, music, nightlife, etc.
   - Use emojis and give specific examples from the search history.

4. ✈️ Travel & Exploration
   - Analyze both domestic and international travel patterns.
   - Identify frequently visited or searched locations.
   - Use emojis and provide examples of specific destinations.

5. 🏙️ Work & Education Clues
   - Analyze potential work locations, educational institutions, or professional interests.
   - Use emojis and provide specific examples from the search history.

6 🔎 Personality Summary
   - Create a table summarizing key personality traits and the data that supports each inference.
   - List activities the user likely enjoys based on the analysis.

Add any other section that you might feel necessary for the user.

For each section:
- Use bullet points for clarity.
- Provide specific examples from the search history to support your analysis.
- Use relevant emojis to make the report visually engaging.
- Draw connections between different data points to create a comprehensive picture.

Conclude with a brief overall summary of the user's lifestyle and personality based on your analysis.

Remember to maintain an objective tone and avoid speculative statements unless clearly labeled as such.
`;
    
    // 5. Call OpenAI to generate the personality report
    console.log('Calling OpenAI to generate personality report...');
    
    const personalityReportResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert data analyst specializing in user behavior and persona creation. Analyze the provided Google Maps search and usage data to create a detailed persona report. Your report should be engaging, insightful, and formatted with emojis and bullet points for easy readability.'
          },
          {
            role: 'user',
            content: personalityReportPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
    
    if (!personalityReportResponse.ok) {
      const errorData = await personalityReportResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }
    
    const personalityReportData = await personalityReportResponse.json();
    const personalityReport = personalityReportData.choices[0].message.content;
    
    // Save the personality report
    const personalityReportBytes = new TextEncoder().encode(personalityReport);
    const { error: saveReportError } = await supabaseClient.storage
      .from('user_files')
      .upload(`${userFolder}/personality_report.txt`, personalityReportBytes, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (saveReportError) {
      console.error('Error saving personality report:', saveReportError);
      throw new Error(`Failed to save personality report: ${saveReportError.message}`);
    }
    
    // 6. Format the second prompt for personality tiles
    const personalityTilesPrompt = `
You are an AI assistant specializing in user profiling and personalization. Your task is to create engaging user profile tiles for a personalized itinerary planner application based on the user's Google Maps search and usage data. Use the following information to generate the profile:

<top_views>
${viewsTop20}
</top_views>
<top_directions>
${directionsTop20}
</top_directions>
<top_searches>
${searchTop20}
</top_searches>

User Profile:
${personalityReport}

Create distinct profile tiles:
 
Each tile should be atleast 5 items, catchy phrase that encapsulates the user's interests or preferences.
Each tile SHOULD be ultra specifc to the user and should be based on the data provided.
The tiles should be categorized into the following sections:
The Tiles are used for user onboarding, so they should be very elegant and catchy.

1. Lifestyle Vibes
   - Generate lifestyle descriptors that best capture the user's overall personality and interests.
   - Each descriptor should be a short, catchy phrase (1-3 words).
   - Use relevant emojis to make the tiles visually engaging.

2. Food & Drink Favorites
   - List types of cuisine, specific dishes, or drink preferences.
   - Focus on the most frequently searched or visited food-related places.
   - Use relevant emojis to make the tiles visually engaging.

3. Go-to Activities
   - Identify activities the user frequently engages in or searches for.
   - Include both leisure and practical activities.
   - Example: "Gym Workouts", "Museum Hopping", "Cinema Nights"
   - Use relevant emojis to make the tiles visually engaging.

4. Favorite Neighborhoods or Place Types
   - List specific neighborhoods, areas, or places the user frequently visits or searches.
   - This can include both local and travel destinations.
   - Example: "Trendy Cafés", "Historic Districts", "Outdoor Markets", 13th Arrondissement & Place d'Italie 🏘️ , Montmartre & Pigalle 🎨 
   - Use relevant emojis to make the tiles visually engaging.

5. Travel & Exploration
   - List travel-related descriptors that capture the user's travel style or preferences.
   - Include both domestic and international travel preferences.
   - Example: "Weekend Getaways", "Beach Escapes", "Cultural Journeys"
   - Use relevant emojis to make the tiles visually engaging.

6. Other
    - Include any other relevant descriptors that don't fit into the above categories.
    - This can include unique hobbies, interests, or lifestyle choices.
    - Example: "Tech Enthusiast", "Nature Lover", "Pet Parent"
    - Use relevant emojis to make the tiles visually engaging.

For each tile:
- Use concise, engaging language.
- Prioritize items based on frequency and recency in the data.
- Ensure diversity in the selections to capture various aspects of the user's preferences.
`;
    
    // 7. Call OpenAI to generate the personality tiles using the new responses endpoint
    console.log('Calling OpenAI responses endpoint to generate personality tiles with JSON schema...');
    
    const personalityTilesResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: [
          {
            role: 'system',
            content: 'You are an AI assistant specializing in user profiling and personalization. You will return the requested data in a specific JSON format.'
          },
          {
            role: 'user',
            content: personalityTilesPrompt
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'personality_tiles',
            schema: personalityTilesSchema,
            strict: true
          }
        }
      }),
    });
    
    if (!personalityTilesResponse.ok) {
      const errorData = await personalityTilesResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }
    
    const personalityTilesData = await personalityTilesResponse.json();
    const personalityTilesJson = personalityTilesData.text.value;
    
    // Parse and validate the personality tiles JSON
    let personalityTiles;
    try {
      personalityTiles = JSON.parse(personalityTilesJson);
      console.log('Successfully parsed personality tiles JSON');
      
      // Basic validation
      const requiredFields = [
        'Lifestyle Vibes',
        'Lifestyle Vibes Reason',
        'Food & Drink Favorites',
        'Food & Drink Favorites Reason',
        'Go-to Activities',
        'Go-to Activities Reason',
        'Favorite Neighborhoods or Place Types',
        'Favorite Neighborhoods or Place Types Reason',
        'Travel & Exploration',
        'Travel & Exploration Reason',
        'Other',
        'Other Reason'
      ];
      
      for (const field of requiredFields) {
        if (!personalityTiles[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      console.log('Successfully validated personality tiles data against schema');
    } catch (parseError) {
      console.error('Error parsing or validating personality tiles JSON:', parseError);
      throw new Error(`Failed to parse personality tiles JSON: ${parseError.message}`);
    }
    
    // Save the personality tiles as a JSON file
    const personalityTilesBytes = new TextEncoder().encode(JSON.stringify(personalityTiles, null, 2));
    const { error: saveTilesError } = await supabaseClient.storage
      .from('user_files')
      .upload(`${userFolder}/personality_tiles.json`, personalityTilesBytes, {
        contentType: 'application/json',
        upsert: true
      });
    
    if (saveTilesError) {
      console.error('Error saving personality tiles:', saveTilesError);
      throw new Error(`Failed to save personality tiles: ${saveTilesError.message}`);
    }
    
    // 8. Save insights to profiles table
    const { error: updateProfileError } = await supabaseClient
      .from('profiles')
      .update({ 
        has_personality_insights: true,
        personality_tiles: personalityTiles
      })
      .eq('id', userId);
    
    if (updateProfileError) {
      console.error('Error updating profile with personality insights:', updateProfileError);
      throw new Error(`Failed to update profile: ${updateProfileError.message}`);
    }
    
    // 9. Return results
    return {
      personality_report: personalityReport,
      personality_tiles: personalityTiles,
      files_created: [
        'personality_report.txt',
        'personality_tiles.json'
      ]
    };
  } catch (error) {
    console.error("Error generating personality insights:", error);
    throw new Error(`Failed to generate personality insights: ${error.message}`);
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the JSON body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received request to generate personality insights for user ${userId}`);
    
    // Create a Supabase client (admin) for accessing storage and database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // Generate personality insights
    const results = await generatePersonalityInsights(userId, supabaseClient);
    
    return new Response(
      JSON.stringify({ success: true, results }),
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
