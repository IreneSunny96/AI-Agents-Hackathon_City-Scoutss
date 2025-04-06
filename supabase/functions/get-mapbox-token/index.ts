
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface RequestOptions {
  auth: {
    session: {
      user: {
        id: string;
      }
    }
  }
}

serve(async (req: Request) => {
  try {
    // Use the hardcoded token instead of environment variable
    const mapboxToken = 'pk.eyJ1Ijoicm9zaGFudmVscHVsYSIsImEiOiJjbTk1YzNydDIwa3ZlMm1xdjB5ODQxNjF0In0.OKfqE8wT5fcMaVs25pF1Mw';
    
    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }
    
    return new Response(
      JSON.stringify({ token: mapboxToken }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
