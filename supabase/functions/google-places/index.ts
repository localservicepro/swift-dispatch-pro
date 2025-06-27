
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key not configured',
          fallback: true
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { input, sessionToken } = await req.json();

    if (!input || input.trim().length < 2) {
      return new Response(
        JSON.stringify({ 
          error: 'Input parameter must be at least 2 characters',
          predictions: []
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call Google Places Autocomplete API
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.append('input', input.trim());
    url.searchParams.append('key', googleMapsApiKey);
    url.searchParams.append('types', 'address');
    url.searchParams.append('components', 'country:au');
    
    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken);
    }

    console.log('Calling Google Places API for input:', input);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('Google Places API HTTP error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          error: `HTTP error: ${response.status}`,
          fallback: true,
          predictions: []
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();

    console.log('Google Places API response status:', data.status);
    console.log('Number of predictions:', data.predictions?.length || 0);

    if (data.status === 'ZERO_RESULTS') {
      return new Response(JSON.stringify({
        status: 'ZERO_RESULTS',
        predictions: [],
        message: 'No results found for this search'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ 
          error: `Google Places API error: ${data.status}`,
          fallback: true,
          predictions: []
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-places function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        fallback: true,
        predictions: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
