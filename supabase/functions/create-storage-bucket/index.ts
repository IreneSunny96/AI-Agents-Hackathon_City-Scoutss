
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Get request body
    const { name } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Missing bucket name parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Attempting to create bucket: ${name}`);
    
    // Create a Supabase client (admin) with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      return new Response(
        JSON.stringify({ error: `Failed to list buckets: ${listError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const bucketExists = existingBuckets.some(bucket => bucket.name === name);
    
    if (bucketExists) {
      console.log(`Bucket '${name}' already exists`);
      return new Response(
        JSON.stringify({ success: true, message: `Bucket '${name}' already exists` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create the bucket
    const { data, error } = await supabaseAdmin.storage.createBucket(name, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
    
    if (error) {
      console.error("Error creating bucket:", error);
      return new Response(
        JSON.stringify({ error: `Failed to create bucket: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Successfully created bucket: ${name}`);
    
    // Set up bucket policies to allow public access
    const policies = [
      {
        name: 'Allow public read access',
        definition: {
          role: '*',
          operations: ['SELECT'],
          resources: [`storage/${name}/.*`],
          statements: [{ effect: 'allow' }],
        },
      },
      {
        name: 'Allow authenticated users to upload files',
        definition: {
          role: 'authenticated',
          operations: ['INSERT', 'UPDATE', 'DELETE'],
          resources: [`storage/${name}/.*`],
          statements: [{ effect: 'allow' }],
        },
      },
    ];
    
    // Apply policies (this is simplified - policies would need to be applied via SQL generally)
    console.log(`Bucket '${name}' created successfully. Please set up storage policies as needed.`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bucket '${name}' created successfully`,
        bucket: data || name
      }),
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
