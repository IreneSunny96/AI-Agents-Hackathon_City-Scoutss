
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
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    
    if (!mapboxToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Mapbox token not configured on server' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ token: mapboxToken }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
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
