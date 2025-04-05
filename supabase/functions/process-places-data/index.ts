
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get environment variables
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error("GOOGLE_MAPS_API_KEY not found in environment variables.");
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for place type information to reduce API calls
const placeTypeCache: Record<string, string[] | null | string> = {};

// Helper functions
const parseTime = (timeStr: string): Date => {
  return new Date(timeStr.replace("Z", "+00:00"));
};

const getPlaceInfo = async (text: string): Promise<string[] | null | string> => {
  try {
    if (placeTypeCache[text]) {
      return placeTypeCache[text];
    }
    
    // Use fetch directly instead of client library
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(text)}&inputtype=textquery&fields=types&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    let result: string[] | null = null;
    
    if (data && data.candidates && data.candidates.length > 0) {
      result = data.candidates[0].types || null;
    }
    
    placeTypeCache[text] = result;
    return result;
  } catch (error) {
    console.error(`Error getting place info for ${text}:`, error);
    return error.toString();
  }
};

// Main processing function
const processActivityData = async (data: any[], userId: string): Promise<object> => {
  console.log(`Processing activity data for user ${userId}`);
  
  try {
    // 1. Filter for last year and categorize data
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    
    const filteredData = data.filter(entry => {
      const entryTime = parseTime(entry.time || "");
      return entryTime >= cutoffDate;
    });
    
    console.log(`Filtered ${filteredData.length} entries from the last year`);
    
    const searchData = [];
    const directionsData = [];
    const viewedData = [];
    
    for (const entry of filteredData) {
      const title = entry.title || "";
      if (title.includes("Searched")) {
        searchData.push(entry);
      } else if (title.includes("Directions to")) {
        directionsData.push(entry);
      } else {
        viewedData.push(entry);
      }
    }
    
    // 2. Create processed data arrays
    const processSearch = searchData.map(entry => ({
      title: entry.title,
      time: entry.time,
      titleUrl: entry.titleUrl,
      title_cleaned: entry.title.replace("Searched for ", "")
    }));
    
    const processDirections = directionsData.map(entry => ({
      title: entry.title,
      time: entry.time,
      titleUrl: entry.titleUrl,
      description: entry.description || null,
      title_cleaned: entry.title.replace("Directions to", "")
    }));
    
    const exclusions = ["Used Maps", "Explored on Google Maps", "Viewed your Timeline"];
    const processViewed = viewedData
      .filter(entry => !exclusions.includes(entry.title))
      .map(entry => ({
        title: entry.title,
        time: entry.time,
        titleUrl: entry.titleUrl,
        title_cleaned: entry.title.replace("Viewed area around", "")
      }));
    
    // 3. Generate statistics
    const countOccurrences = (arr: any[]) => {
      const counts: Record<string, number> = {};
      for (const item of arr) {
        const key = item.title_cleaned;
        counts[key] = (counts[key] || 0) + 1;
      }
      return Object.entries(counts).map(([title_cleaned, count]) => ({ title_cleaned, count }));
    };
    
    const searchesStats = countOccurrences(processSearch);
    const directionsStats = countOccurrences(processDirections);
    const viewedStats = countOccurrences(processViewed);
    
    console.log(`Generated statistics for user data`);
    
    // 4. Enhance with place types (top 20 for each category)
    const enhanceWithPlaceTypes = async (stats: any[]) => {
      const sortedStats = stats.sort((a, b) => b.count - a.count);
      const top20 = sortedStats.slice(0, 20);
      
      for (const item of top20) {
        item.place_type = await getPlaceInfo(item.title_cleaned);
      }
      
      return top20;
    };
    
    console.log("Enhancing search data with place types...");
    const searchesTop20 = await enhanceWithPlaceTypes(searchesStats);
    
    console.log("Enhancing directions data with place types...");
    const directionsTop20 = await enhanceWithPlaceTypes(directionsStats);
    
    console.log("Enhancing viewed data with place types...");
    const viewedTop20 = await enhanceWithPlaceTypes(viewedStats);
    
    // 5. Return processed results
    return {
      searches_top_20: searchesTop20,
      directions_top_20: directionsTop20,
      views_top_20: viewedTop20,
      raw_counts: {
        searches: processSearch.length,
        directions: processDirections.length,
        views: processViewed.length
      }
    };
  } catch (error) {
    console.error("Error processing activity data:", error);
    throw new Error(`Failed to process activity data: ${error.message}`);
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the JSON body
    const { userId, activityData } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!activityData || !Array.isArray(activityData)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing activityData (should be an array)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received request to process data for user ${userId} with ${activityData.length} entries`);
    
    // Process the data
    const results = await processActivityData(activityData, userId);
    
    // Store results in Supabase storage
    // For now, let's just return the results directly
    
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
